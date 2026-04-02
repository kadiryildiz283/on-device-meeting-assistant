import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';

export class LlamaService {
    private llamaContext: LlamaContext | null = null;
    private isInitialized: boolean = false;

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        const modelPath = `${RNFS.ExternalStorageDirectoryPath}/Download/qwen2.5-7b-instruct-q4_k_m.gguf`;

        try {
            // 1. Dosya Kontrolü
            const exists = await RNFS.exists(modelPath);
            if (!exists) throw new Error(`Model dosyası bulunamadı: ${modelPath}`);

            const stats = await RNFS.stat(modelPath);
            console.log(`[LlamaService] Model bulundu: ${(stats.size / 1e9).toFixed(2)} GB`);

            // 2. RAM & Motor Başlatma
            this.llamaContext = await initLlama({
                model: modelPath,
                use_mlock: true,   // 8GB RAM için hayati
                n_ctx: 2048,
                n_threads: 8,      // S25 için optimal çekirdek sayısı
            });
            
            this.isInitialized = true;
            console.log("[LlamaService] 7B Engine initialized.");
        } catch (error: any) {
            console.error("[LlamaService] Load error:", error.message);
            throw error;
        }
    }

    public async summarize(text: string): Promise<string> {
        if (!this.llamaContext) return "Llama not ready.";

        const prompt = `<|im_start|>system
Sen profesyonel bir toplantı asistanısın. Aşağıdaki konuşma dökümünü Türkçe olarak, ana kararlar ve aksiyonlar bazında çok kısa özetle.<|im_end|>
<|im_start|>user
${text.slice(-5000)}<|im_end|>
<|im_start|>assistant\n`;

        try {
            let res = "";
            await this.llamaContext.completion({
                prompt,
                n_predict: 400,
                temperature: 0.2,
                stop: ["<|im_end|>", "<|im_start|>"],
            }, (tokenRes) => { res += tokenRes.token; });

            return res.trim();
        } catch (e) {
            return "Özetleme başarısız.";
        }
    }

    public async release(): Promise<void> {
        if (this.llamaContext) {
            await this.llamaContext.release();
            this.llamaContext = null;
            this.isInitialized = false;
        }
    }
}

export const llamaService = new LlamaService();
