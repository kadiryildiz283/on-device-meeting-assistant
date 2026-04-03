import AudioRecord from 'react-native-audio-record';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

export class AudioService {
    private currentFilePath: string = '';

    /**
     * Sesi doğrudan cihaza .wav formatında kaydeder.
     * Whisper motoru için optimize edilmiştir: 16kHz, Mono, 16-bit PCM.
     */
    public async startRecording(): Promise<void> {
        const fileName = `meeting_recording_${Date.now()}.wav`;
        
        // AudioRecord kütüphanesi Android'de varsayılan olarak DocumentDirectoryPath kullanır
        this.currentFilePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

        AudioRecord.init({
            sampleRate: 16000,
            channels: 1,
            bitsPerSample: 16,
            audioSource: 6, // VOICE_RECOGNITION (Mikrofon gürültü engelleme için)
            wavFile: fileName
        });

        console.log(`[AudioService] Kayıt başlatıldı: ${this.currentFilePath}`);
        AudioRecord.start();
    }

    /**
     * Kaydı durdurur ve dosyanın kesin (absolute) yolunu döndürür.
     */
    public async stopRecording(): Promise<string> {
        const filePath = await AudioRecord.stop();
        console.log(`[AudioService] Kayıt durduruldu. Dosya: ${filePath}`);
        
        // Kütüphane bazen iOS/Android farklı path döndürür, garantiye alalım
        this.currentFilePath = filePath;
        return filePath;
    }

    /**
     * RAM ve Depolama tasarrufu için işlenen sesi siler.
     */
    public async deleteRecord(): Promise<void> {
        if (this.currentFilePath) {
            const exists = await RNFS.exists(this.currentFilePath);
            if (exists) {
                await RNFS.unlink(this.currentFilePath);
                console.log(`[AudioService] Ses dosyası diskten silindi.`);
            }
            this.currentFilePath = '';
        }
    }
}

export const audioService = new AudioService();
