import { PermissionsAndroid, Platform } from 'react-native';
import { fileModelPath } from 'react-native-sherpa-onnx';
import { createStreamingSTT } from 'react-native-sherpa-onnx/stt';
import { createPcmLiveStream } from 'react-native-sherpa-onnx/pcm';
import RNFS from 'react-native-fs';

export class SherpaService {
    private recognizer: any = null;
    private audioStream: any = null;
    private isInitialized: boolean = false;
    private isCapturing: boolean = false;

    public async initialize(modelDir: string): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            const encoderPath = `${modelDir}/encoder.int8.onnx`;
            const decoderPath = `${modelDir}/decoder.int8.onnx`;
            const joinerPath = `${modelDir}/joiner.int8.onnx`;
            const tokensPath = `${modelDir}/tokens.txt`;

            // Gatekeeper Kontrolü
            const checks = await Promise.all([
                RNFS.exists(encoderPath),
                RNFS.exists(decoderPath),
                RNFS.exists(joinerPath),
                RNFS.exists(tokensPath)
            ]);

            if (checks.includes(false)) {
                throw new Error("VETO: STT model dosyaları eksik.");
            }

            console.log(`[SherpaService] Dosyalar tam. C++ Engine başlatılıyor...`);
            
            // BUG BYPASS ALGORİTMASI:
            // Native Wrapper'ın null fırlatmaması için hem kök "modelPath" hem de alt "modelConfig" veriyoruz.
            this.recognizer = await createStreamingSTT({
                modelPath: fileModelPath(modelDir), // Wrapper bug'ını engeller
                modelType: 'transducer', // Engine tipini sabitler
                featConfig: {
                    sampleRate: 16000,
                    featureDim: 80,
                },
                modelConfig: {
                    transducer: {
                        encoder: fileModelPath(encoderPath),
                        decoder: fileModelPath(decoderPath),
                        joiner: fileModelPath(joinerPath),
                    },
                    tokens: fileModelPath(tokensPath),
                    numThreads: 4,
                    debug: false,
                },
                enableEndpoint: true,
                decodingMethod: 'greedy_search',
            });

            this.isInitialized = true;
            console.log("[SherpaService] Sherpa-ONNX motoru aktif.");
        } catch (error: any) {
            console.error("[SherpaService] Init hatası:", error.message);
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
            console.warn("[SherpaService] Mikrofon izni reddedildi.");
            return;
        }

        try {
            this.isCapturing = true;
            
            this.audioStream = await createPcmLiveStream({
                sampleRate: 16000,
                channels: 1
            });

            this.audioStream.on('data', async (samples: Float32Array) => {
                if (!this.isCapturing || !this.recognizer) return;

                this.recognizer.acceptWaveform(samples);
                
                const result = await this.recognizer.getResult();
                
                if (result && result.text) {
                    const isEndpoint = await this.recognizer.isEndpoint();
                    onUpdate(result.text, isEndpoint);

                    if (isEndpoint) {
                        await this.recognizer.reset();
                    }
                }
            });

            await this.audioStream.start();
            console.log("[SherpaService] Mikrofon kaydı başladı.");

        } catch (error) {
            this.isCapturing = false;
            console.error("[SherpaService] Kayıt başlatma hatası:", error);
            throw error;
        }
    }

    public async stopTranscribing(): Promise<void> {
        this.isCapturing = false;

        if (this.audioStream) {
            await this.audioStream.stop();
            this.audioStream = null;
            console.log("[SherpaService] Mikrofon yayını durduruldu.");
        }
    }

    public async release(): Promise<void> {
        await this.stopTranscribing();
        
        if (this.recognizer) {
            try {
                await this.recognizer.destroy();
                console.log("[SherpaService] RAM serbest bırakıldı (Engine destroyed).");
            } catch (e) {
                console.warn("[SherpaService] Release uyarısı:", e);
            }
            this.recognizer = null;
            this.isInitialized = false;
        }
    }
}

export const sherpaService = new SherpaService();
