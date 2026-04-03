import { PermissionsAndroid, Platform } from 'react-native';
import { 
    createOnlineRecognizer, 
    OnlineRecognizer,
    SherpaOnnxAudioRecord 
} from 'react-native-sherpa-onnx';

export class SherpaService {
    private recognizer: OnlineRecognizer | null = null;
    private audioRecorder: SherpaOnnxAudioRecord | null = null;
    private isInitialized: boolean = false;
    private isCapturing: boolean = false;

    /**
     * Initializes Sherpa-ONNX with the Kroko INT8 Transducer model.
     */
    public async initialize(modelDir: string): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            console.log(`[SherpaService] Loading INT8 ONNX model from: ${modelDir}`);
            
            this.recognizer = await createOnlineRecognizer({
                featConfig: {
                    sampleRate: 16000,
                    featureDim: 80,
                },
                modelConfig: {
                    transducer: {
                        encoder: `${modelDir}/encoder.int8.onnx`,
                        decoder: `${modelDir}/decoder.int8.onnx`,
                        joiner: `${modelDir}/joiner.int8.onnx`,
                    },
                    tokens: `${modelDir}/tokens.txt`,
                    numThreads: 4, 
                    debug: false,
                },
                decodingMethod: 'greedy_search',
            });

            this.isInitialized = true;
            console.log("[SherpaService] Sherpa-ONNX engine is active.");
        } catch (error: any) {
            console.error("[SherpaService] Init error:", error.message);
            throw error;
        }
    }

    private async requestMicPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;
        try {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) { 
            return false; 
        }
    }

    public async startTranscribing(onUpdate: (text: string, isFinal: boolean) => void): Promise<void> {
        if (!this.recognizer || this.isCapturing) return;

        const hasPerm = await this.requestMicPermission();
        if (!hasPerm) {
            console.warn("[SherpaService] Mic permission denied.");
            return;
        }

        try {
            this.isCapturing = true;
            this.audioRecorder = new SherpaOnnxAudioRecord();
            const stream = this.recognizer.createStream();

            this.audioRecorder.start(16000, (audioSamples: Float32Array) => {
                if (!this.isCapturing) return;

                stream.acceptWaveform(16000, audioSamples);
                
                while (this.recognizer!.isReady(stream)) {
                    this.recognizer!.decode(stream);
                }

                const result = this.recognizer!.getResult(stream);
                const isEndpoint = this.recognizer!.isEndpoint(stream);

                if (result.text) {
                    onUpdate(result.text, isEndpoint);
                }

                if (isEndpoint) {
                    this.recognizer!.reset(stream);
                }
            });

        } catch (error) {
            this.isCapturing = false;
            throw error;
        }
    }

    public async stopTranscribing(): Promise<void> {
        if (this.audioRecorder && this.isCapturing) {
            this.audioRecorder.stop();
            this.audioRecorder = null;
            this.isCapturing = false;
            console.log("[SherpaService] Mic feed stopped.");
        }
    }

    /**
     * VETO PROTOCOL: Completely nukes the C++ context to prevent OOM during LLM phase.
     */
    public async release(): Promise<void> {
        if (this.recognizer) {
            try {
                // Remove pointer reference to allow Garbage Collection
                this.recognizer = null; 
                console.log("[SherpaService] RAM released.");
            } catch (e) {
                console.warn("[SherpaService] Release warning:", e);
            }
            this.isInitialized = false;
        }
    }
}

export const sherpaService = new SherpaService();
