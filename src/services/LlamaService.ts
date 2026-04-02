import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';

export class LlamaService {
    private llamaContext: LlamaContext | null = null;
    private isInitialized: boolean = false;
    private readonly MAX_CHARS = 3500; // Safe limit to avoid exceeding 2048 context window

    public async initialize(modelPath: string): Promise<void> {
        // Clear memory if already loaded
        if (this.isInitialized) await this.release();

        try {
            const exists = await RNFS.exists(modelPath);
            if (!exists) throw new Error(`Model not found: ${modelPath}`);

            console.log(`[LlamaService] Loading model: ${modelPath}`);

            this.llamaContext = await initLlama({
                model: modelPath,
                use_mlock: true, 
                n_ctx: 2048,
                n_threads: 4, // Optimal for ARM architectures (Performance Cores)
            });
            
            this.isInitialized = true;
            console.log("[LlamaService] LLM engine is ready.");
        } catch (error: any) {
            console.error("[LlamaService] Initialization error:", error.message);
            throw error;
        }
    }

    /**
     * Splits long transcripts into logical chunks without breaking sentences in half.
     */
    private splitIntoChunks(text: string): string[] {
        const chunks: string[] = [];
        let i = 0;
        
        while (i < text.length) {
            let end = i + this.MAX_CHARS;
            if (end < text.length) {
                // Find the last period to make a safe cut
                const lastPoint = text.lastIndexOf('.', end);
                if (lastPoint > i) end = lastPoint + 1;
            }
            chunks.push(text.slice(i, end));
            i = end;
        }
        
        return chunks;
    }

    /**
     * Executes inference for a given prompt with deterministic settings.
     */
    private async runCompletion(prompt: string, maxTokens: number): Promise<string> {
        if (!this.llamaContext) throw new Error("LlamaContext is null");

        let result = "";
        await this.llamaContext.completion({
            prompt,
            n_predict: maxTokens,
            temperature: 0.1, // Near-zero for deterministic, factual outputs
            stop: ["<|im_end|>", "<|im_start|>"],
        }, (res) => { 
            result += res.token; 
        });

        return result.trim();
    }

    /**
     * Incrementally summarizes the transcript to handle infinite length safely.
     */
    public async summarize(text: string): Promise<string> {
        if (!this.llamaContext) return "Error: LLM not ready.";

        const chunks = this.splitIntoChunks(text);
        let runningSummary = ""; // Holds the accumulated context

        console.log(`[LlamaService] Transcript divided into ${chunks.length} chunks.`);

        for (let i = 0; i < chunks.length; i++) {
            console.log(`[LlamaService] Processing chunk ${i + 1}/${chunks.length}...`);
            
            const prompt = `<|im_start|>system\nSen profesyonel bir toplantı analistisin. Önceki özet bilgilerini ve yeni gelen metni birleştirerek güncel bir analiz hazırla.<|im_end|>\n<|im_start|>user\nMevcut Durum Özeti:\n${runningSummary || "Henüz özet yok."}\n\nYeni Gelen Konuşma Metni:\n${chunks[i]}\n\nLütfen bu verileri kullanarak şu formatta kesin bir güncelleme yap:\n1. Konuşmacılar:\n2. Ana Konu:\n3. Alınan Kararlar:\n4. Soru İşareti Kalan Kısımlar:\n5. Genel Özet:<|im_end|>\n<|im_start|>assistant\n`;

            runningSummary = await this.runCompletion(prompt, 600);
        }

        // Returns only the final LLM output
        return runningSummary;
    }

    /**
     * Destroys the C++ context to free up physical RAM.
     */
    public async release(): Promise<void> {
        if (this.llamaContext) {
            await this.llamaContext.release();
            this.llamaContext = null;
            this.isInitialized = false;
            console.log("[LlamaService] RAM completely released.");
        }
    }
}

export const llamaService = new LlamaService();
