import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';

/**
 * Handles Local LLM operations. Optimized for Qwen 0.5B model.
 */
export class LlamaService {
    private llamaContext: LlamaContext | null = null;
    private isInitialized: boolean = false;

    /**
     * Prepares the model file and initializes the engine.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log("[LlamaService] Preparing Qwen 0.5B model...");
        try {
            const modelFileName = ' qwen2.5-7b-instruct-q4_k_m.gguf';
            const destPath = `${RNFS.DocumentDirectoryPath}/${modelFileName}`;

            const exists = await RNFS.exists(destPath);
            if (!exists) {
                console.log("[LlamaService] Extracting model to device storage...");
                await RNFS.copyFileAssets(modelFileName, destPath);
                console.log("[LlamaService] Extraction complete.");
            }

            console.log("[LlamaService] Loading model into RAM...");
            this.llamaContext = await initLlama({
                model: destPath,
                use_mlock: true, // Prevents OS from swapping memory
                n_ctx: 2048,     // Context window limit
                n_gpu_layers: 0  // Mobile CPU execution
            });
            
            this.isInitialized = true;
            console.log("[LlamaService] Llama Engine ready.");
        } catch (error) {
            console.error("[LlamaService] Initialization failed:", error);
            throw error;
        }
    }

    /**
     * Summarizes the transcript using ChatML formatting to ensure the model 
     * understands the boundary between instruction and data.
     */
    public async summarize(text: string): Promise<string> {
        if (!this.llamaContext) throw new Error("Llama not initialized");

        console.log("[LlamaService] Generating final summary...");

        // Safety: Qwen 0.5B handles ~1.5k tokens comfortably. 
        // We truncate the input to the last 4000 characters to prevent context overflow.
        const safeText = text.length > 4000 ? text.slice(-4000) : text;

        // Optimized ChatML prompt for Qwen
        const prompt = `<|im_start|>system\nYou are a professional meeting assistant. Provide a concise bullet-point summary in Turkish. Focus on key decisions and outcomes. Do not repeat the transcript.<|im_end|>\n<|im_start|>user\nToplantı dökümünü özetle:\n\n${safeText}<|im_end|>\n<|im_start|>assistant\n`;

        try {
            let summaryResult = "";
            
            await this.llamaContext.completion({
                prompt,
                n_predict: 400, // Longer limit for a comprehensive final summary
                temperature: 0.2, // Lower temperature for more factual summaries
                stop: ["<|im_end|>", "<|im_start|>", "user:", "assistant:"],
            }, (response) => {
                summaryResult += response.token;
            });

            // Post-processing: Remove potential prompt leakage
            const cleanedResult = summaryResult.replace(prompt, "").trim();

            console.log("[LlamaService] Summary generation complete.");
            return cleanedResult || "Özet oluşturulamadı.";
        } catch (error) {
            console.error("[LlamaService] Summarization failed:", error);
            return "Özetleme işlemi başarısız oldu.";
        }
    }

    /**
     * Releases native memory. Critical for preventing OOM crashes on Android.
     */
    public async release(): Promise<void> {
        if (this.llamaContext) {
            await this.llamaContext.release();
            this.llamaContext = null;
            this.isInitialized = false;
            console.log("[LlamaService] Llama resources released.");
        }
    }
}

export const llamaService = new LlamaService();
