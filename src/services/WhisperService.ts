import { initWhisper, WhisperContext } from 'whisper.rn';

export type WhisperModelType = 'tiny' | 'small';

export class WhisperService {
    private whisperContext: WhisperContext | null = null;
    private isInitialized: boolean = false;

    public async initialize(modelType: WhisperModelType): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            // Models must be placed in android/app/src/main/assets/models/
            const modelAsset = modelType === 'tiny' ? require('../assets/models/ggml-tiny.bin') : require('../assets/models/ggml-small.bin');
            
            console.log(`[WhisperService] Loading model: ${modelType}`);
            this.whisperContext = await initWhisper({ filePath: modelAsset });
            this.isInitialized = true;
            console.log("[WhisperService] Whisper engine ready.");
        } catch (error) {
            console.error("[WhisperService] Init error:", error);
            throw error;
        }
    }

    /**
     * Transcribes an entire audio file in batch mode.
     * Highly stable, no JS/C++ async bridge timeouts.
     */
    public async transcribeFile(audioFilePath: string): Promise<string> {
        if (!this.whisperContext) throw new Error("Whisper not initialized");

        console.log(`[WhisperService] Transcribing file: ${audioFilePath}`);
        
        const { promise } = this.whisperContext.transcribe(audioFilePath, {
            language: 'tr',
            maxLen: 1,
            tokenTimestamps: false,
        });

        const result = await promise;
        return result.result || "";
    }

    /**
     * Obliterates the C++ context to clear RAM.
     */
    public async release(): Promise<void> {
        if (this.whisperContext) {
            try {
                await this.whisperContext.release();
                console.log("[WhisperService] RAM released.");
            } catch (e) {
                console.warn("[WhisperService] Release warning:", e);
            }
            this.whisperContext = null;
            this.isInitialized = false;
        }
    }
}

export const whisperService = new WhisperService();
