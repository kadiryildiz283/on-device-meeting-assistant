import { initWhisper, WhisperContext } from 'whisper.rn';

export class WhisperService {
    private whisperContext: WhisperContext | null = null;
    private isInitialized: boolean = false;
    private isCapturing: boolean = false; // Prevents "already capturing" error
    private stopTranscriptionCb: (() => void) | null = null;

    /**
     * Initializes the Whisper engine.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log("[WhisperService] Loading model into memory...");
        try {
            // Using require to ensure the asset is bundled
            const modelAsset = require('../assets/models/ggml-small.bin');
            
            this.whisperContext = await initWhisper({
                filePath: modelAsset,
            });
            
            this.isInitialized = true;
            console.log("[WhisperService] Engine initialized successfully.");
        } catch (error) {
            console.error("[WhisperService] Initialization failed:", error);
            throw error;
        }
    }

    /**
     * Starts transcription with safety locks.
     */
    public async startTranscribing(onNewSegment: (text: string) => void): Promise<void> {
        if (!this.whisperContext) {
            throw new Error("WhisperService: Context not initialized. Call initialize() first.");
        }

        if (this.isCapturing) {
            console.warn("[WhisperService] Already capturing. Skipping start request.");
            return;
        }

        console.log("[WhisperService] Starting real-time audio capture...");
        
        try {
            this.isCapturing = true;

            const { stop, subscribe } = await this.whisperContext.transcribeRealtime({
                language: 'tr', // Force Turkish as requested
            });

            this.stopTranscriptionCb = stop;

            subscribe((event: any) => {
                const { data } = event;
                if (data && data.result) {
                    onNewSegment(data.result);
                }
            });

        } catch (error) {
            this.isCapturing = false;
            console.error("[WhisperService] Realtime capture failed:", error);
            throw error;
        }
    }

    /**
     * Stops the engine and releases the lock.
     */
    public async stopTranscribing(): Promise<void> {
        if (this.stopTranscriptionCb) {
            console.log("[WhisperService] Stopping audio capture...");
            try {
                await this.stopTranscriptionCb();
            } catch (e) {
                console.error("[WhisperService] Error while stopping:", e);
            } finally {
                this.stopTranscriptionCb = null;
                this.isCapturing = false;
                console.log("[WhisperService] Capture stopped and lock released.");
            }
        }
    }

    public getStatus(): boolean {
        return this.isCapturing;
    }
}

// Export as a named singleton to match your BufferOrchestrator import
export const whisperService = new WhisperService();
