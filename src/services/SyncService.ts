import ReactNativeBlobUtil from 'react-native-blob-util';
import BackgroundService from 'react-native-background-actions';
import notifee from '@notifee/react-native';
import { MeetingController } from '../database/MeetingController';
import { audioService } from './AudioService';
import { MeetingModel } from '../database/MeetingModel';
import { SettingsService } from './SettingsService';

export class SyncService {
    private static isSyncing = false;

    public static async checkSttHealth(): Promise<boolean> {
        try {
            const host = await SettingsService.getServerHost();
            const url = `http://${host}:8080/`;
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);
            await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            return true;
        } catch (e) {
            return false;
        }
    }

    public static async checkLlmHealth(): Promise<boolean> {
        try {
            const host = await SettingsService.getServerHost();
            const url = `http://${host}:11434/`;
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);
            await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            return true;
        } catch (e) {
            return false;
        }
    }

    public static async startSync() {
        if (this.isSyncing) return;
        
        const pendingMeetings = await this.getPendingList();
        if (pendingMeetings.length === 0) return;

        this.isSyncing = true;
        
        const options = {
            taskName: 'SyncTask',
            taskTitle: 'Toplantılar Senkronize Ediliyor',
            taskDesc: 'Sunucuya veri gönderiliyor...',
            taskIcon: { name: 'ic_launcher', type: 'mipmap' },
            color: '#ff00ff',
            parameters: { delay: 10000 }, // Deneme sıklığını 10 saniyeye indirdik
        };

        await BackgroundService.start(this.syncTask, options);
    }

    private static async getPendingList(): Promise<MeetingModel[]> {
        const all = await MeetingController.getPendingMeetings();
        return all.filter(m => m.status === 'pending' || m.status === 'failed');
    }

    private static syncTask = async (taskData: any) => {
        await new Promise(async (resolve) => {
            while (BackgroundService.isRunning()) {
                const pending = await SyncService.getPendingList();
                
                if (pending.length === 0) {
                    SyncService.isSyncing = false;
                    await BackgroundService.stop();
                    resolve(true);
                    break;
                }

                // Sunucu sağlığını döngünün başında kontrol et
                const isSttOk = await SyncService.checkSttHealth();
                const isLlmOk = await SyncService.checkLlmHealth();

                if (!isSttOk || !isLlmOk) {
                    console.log(`[Sync] Sunuculara erişilemiyor (STT: ${isSttOk}, LLM: ${isLlmOk}). 10 saniye sonra tekrar denenecek.`);
                    await new Promise(r => setTimeout(() => r(true), taskData.delay));
                    continue; // Bir sonraki döngüye geç (hataya düşürme)
                }

                for (const meeting of pending) {
                    try {
                        console.log(`[Sync] Processing meeting: ${meeting.id}`);
                        await MeetingController.updateStatus(meeting, 'processing');

                        // 1. STT (Whisper)
                        const transcript = await SyncService.uploadToSTT(meeting.audioFilePath!);
                        if (!transcript) throw new Error("STT failed");
                        
                        await MeetingController.addTranscript(meeting, transcript);

                        // 2. LLM (Ollama)
                        const summary = await SyncService.getLLMSummary(transcript);
                        if (!summary) throw new Error("LLM failed");

                        await MeetingController.updateSummary(meeting, summary);
                        await MeetingController.updateStatus(meeting, 'completed');

                        // 3. Cleanup (Ses kaydı sadece BAŞARILI tamamlandığında silinir, asla yarıda silinmez!)
                        if (meeting.audioFilePath) {
                            const exists = await ReactNativeBlobUtil.fs.exists(meeting.audioFilePath);
                            if (exists) {
                                await ReactNativeBlobUtil.fs.unlink(meeting.audioFilePath);
                            }
                        }

                        await SyncService.notifyUser('Analiz Tamamlandı', `${meeting.title} özeti hazır.`);
                    } catch (error: any) {
                        console.error(`[Sync] Error processing ${meeting.id}:`, error);
                        // Hata durumunda statüyü failed yapalım ama dosyayı asla silmeyelim
                        await MeetingController.updateStatus(meeting, 'failed');
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        await SyncService.notifyUser(
                            'Senkronizasyon Hatası',
                            `"${meeting.title}" toplantısı işlenirken beklenmeyen hata oluştu: ${errorMessage}`
                        );
                    }
                }

                // Bir sonraki periyot için bekle
                await new Promise(r => setTimeout(() => r(true), taskData.delay));
            }
        });
    };

    private static async uploadToSTT(filePath: string): Promise<string | null> {
        try {
            const host = await SettingsService.getServerHost();
            const sttServer = `http://${host}:8080/inference`;
            console.log(`[Sync] Uploading to STT: ${filePath} via ${sttServer}`);
            // whisper.cpp server genellikle multi-part wav bekler
            const res = await ReactNativeBlobUtil.fetch('POST', sttServer, {
                'Content-Type': 'multipart/form-data',
            }, [
                { name: 'file', filename: 'audio.wav', data: ReactNativeBlobUtil.wrap(filePath) },
            ]);

            if (res.respInfo.status !== 200) {
                throw new Error(`Sunucu HTTP hatası döndürdü: ${res.respInfo.status}`);
            }
            
            const data = res.json();
            return data.text || null;
        } catch (e: any) {
            console.error("[Sync] STT Upload Error:", e);
            throw new Error(`Ses dökümü (STT) sunucusuna bağlanılamadı. ${e.message || e}`);
        }
    }

    private static async getLLMSummary(text: string): Promise<string | null> {
        try {
            const host = await SettingsService.getServerHost();
            const llmServer = `http://${host}:11434/api/generate`;
            const modelName = await SettingsService.getLlmModel();
            console.log(`[Sync] Requesting summary via ${llmServer} using model ${modelName}`);
            const prompt = `Lütfen aşağıdaki toplantı dökümünü Türkçe olarak özetle:\n\n${text}`;
            
            const res = await fetch(llmServer, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    prompt: prompt,
                    stream: false
                }),
            });

            if (res.status !== 200) {
                throw new Error(`Sunucu HTTP hatası döndürdü: ${res.status}`);
            }

            const data = await res.json();
            return data.response || null;
        } catch (e: any) {
            console.error("[Sync] LLM Error:", e);
            throw new Error(`Yapay zeka özetleme (LLM) sunucusuna bağlanılamadı. ${e.message || e}`);
        }
    }

    private static async notifyUser(title: string, body: string) {
        await notifee.requestPermission();
        const channelId = await notifee.createChannel({ id: 'sync', name: 'Senkronizasyon' });
        await notifee.displayNotification({
            title,
            body,
            android: { channelId },
        });
    }
}

