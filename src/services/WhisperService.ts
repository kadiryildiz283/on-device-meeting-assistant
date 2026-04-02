import { initWhisper, WhisperContext } from 'whisper.rn';
import { PermissionsAndroid, Platform } from 'react-native';

export type WhisperModelType = 'tiny' | 'small' | 'base';

export class WhisperService {
    private whisperContext: WhisperContext | null = null;
    private isInitialized: boolean = false;
    private isCapturing: boolean = false;
    private stopTranscriptionCb: (() => void) | null = null;

    public async initialize(modelType: WhisperModelType): Promise<void> {
        // Zaten yüklüyse tekrar yükleme (Ama artık her seferinde sıfırdan yüklenecek)
        if (this.isInitialized) return;
        
        try {
            const modelAsset = modelType === 'tiny' ? require('../assets/models/ggml-tiny.bin') : require('../assets/models/ggml-small.bin');
            this.whisperContext = await initWhisper({ filePath: modelAsset });
            this.isInitialized = true;
        } catch (error) {
            throw error;
        }
    }

    private async requestMicPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;
        try {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) { return false; }
    }

    public async startTranscribing(onUpdate: (text: string, isFinal: boolean) => void): Promise<void> {
        if (!this.whisperContext || this.isCapturing) return;

        const hasPerm = await this.requestMicPermission();
        if (!hasPerm) return;

        try {
            this.isCapturing = true;
            const { stop, subscribe } = await this.whisperContext.transcribeRealtime({ 
                language: 'tr',
                realtime: true 
            });

            this.stopTranscriptionCb = stop;

            subscribe((event: any) => { 
                if (event.data && event.data.result) {
                    const isFinal = event.data.isFinal === true || event.data.is_final === true;
                    onUpdate(event.data.result, isFinal); 
                }
            });

        } catch (error) {
            this.isCapturing = false;
            throw error;
        }
    }

    public async stopTranscribing(): Promise<void> {
        if (this.stopTranscriptionCb) {
            await this.stopTranscriptionCb();
            this.stopTranscriptionCb = null;
            this.isCapturing = false;
        }
    }

    /**
     * RAM TASARRUFU: C++ belleğindeki modeli tamamen siler.
     */
    public async release(): Promise<void> {
        if (this.whisperContext) {
            try {
                await this.whisperContext.release();
                console.log("[WhisperService] RAM serbest bırakıldı.");
            } catch (e) {
                console.warn("[WhisperService] Silme uyarısı:", e);
            }
            this.whisperContext = null;
            this.isInitialized = false;
        }
    }
}

export const whisperService = new WhisperService();
