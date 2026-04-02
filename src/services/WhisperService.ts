import { initWhisper, WhisperContext } from 'whisper.rn';

export class WhisperService {
    private whisperContext: WhisperContext | null = null;
    private isInitialized: boolean = false;
    private stopTranscriptionCb: (() => void) | null = null;

    constructor() {}

    /**
     * Initializes the Whisper engine on-device.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log("[WhisperService] Loading ggml-tiny.bin model into memory...");
        try {
            // Require the model as an asset so it gets bundled with the app
            const modelAsset = require('../assets/models/ggml-small.bin');
            
            // CORRECTED: Direct call to initWhisper and using 'filePath'
            this.whisperContext = await initWhisper({
                filePath: modelAsset,
            });
            
            this.isInitialized = true;
            console.log("[WhisperService] Engine initialized successfully.");
        } catch (error) {
            console.error("[WhisperService] Failed to load model:", error);
            throw error;
        }
    }

    /**
     * Starts real-time transcription from the device microphone.
     * @param onNewSegment Callback fired when a new sentence is transcribed.
     */
/**
     * Starts real-time transcription from the device microphone.
     * @param onNewSegment Callback fired when a new sentence is transcribed.
     */
    public async startTranscribing(onNewSegment: (text: string) => void): Promise<void> {
        if (!this.whisperContext) throw new Error("Whisper not initialized");

        console.log("[WhisperService] Starting real-time audio capture...");
        
        try {
            // Deprecation uyarısı verecek ama C++ derleme süresinden 
            // tasarruf etmek için şimdilik bu API'yi kullanıyoruz.
            const { stop, subscribe } = await this.whisperContext.transcribeRealtime({
                language: 'tr', // Türkçe'ye zorla
            });

            // Durdurma fonksiyonunu hafızaya al
            this.stopTranscriptionCb = stop;

            // Mikrofon akışını dinle (Promise yerine Subscribe kullanılır)
            subscribe((event: any) => {
                const { isCapturing, data } = event;
                
                // Eğer veri geldiyse ve sonuç string içeriyorsa ekrana gönder
                if (data && data.result) {
                    onNewSegment(data.result);
                }
            });

        } catch (error) {
            console.error("[WhisperService] Realtime capture failed:", error);
        }
    }
    /**
     * Stops the STT engine.
     */
    public async stopTranscribing(): Promise<void> {
        if (this.stopTranscriptionCb) {
            console.log("[WhisperService] Stopping audio capture...");
            this.stopTranscriptionCb();
            this.stopTranscriptionCb = null;
        }
    }
}

// Export as a singleton
export const whisperService = new WhisperService();
