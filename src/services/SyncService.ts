import ReactNativeBlobUtil from 'react-native-blob-util';
import BackgroundService from 'react-native-background-actions';
import notifee from '@notifee/react-native';
import { MeetingController } from '../database/MeetingController';
import { audioService } from './AudioService';
import { MeetingModel } from '../database/MeetingModel';

const STT_SERVER = 'http://172.16.10.141:8080/inference'; // Örnek whisper.cpp server endpoint'i
const LLM_SERVER = 'http://172.16.10.141:11434/api/generate';

export class SyncService {
    private static isSyncing = false;

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
            parameters: { delay: 60000 },
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

                        // 3. Cleanup
                        if (meeting.audioFilePath) {
                            // AudioService'deki deleteRecord'u kullanalım ama path parametresi alacak şekilde güncellenmeli veya manuel silinmeli
                            const exists = await ReactNativeBlobUtil.fs.exists(meeting.audioFilePath);
                            if (exists) {
                                await ReactNativeBlobUtil.fs.unlink(meeting.audioFilePath);
                            }
                        }

                        await SyncService.notifyUser('Analiz Tamamlandı', `${meeting.title} özeti hazır.`);
                    } catch (error) {
                        console.error(`[Sync] Error processing ${meeting.id}:`, error);
                        await MeetingController.updateStatus(meeting, 'failed');
                    }
                }

                // Her dakika bir kontrol et
                await new Promise(r => setTimeout(() => r(true), taskData.delay));
            }
        });
    };

    private static async uploadToSTT(filePath: string): Promise<string | null> {
        try {
            console.log(`[Sync] Uploading to STT: ${filePath}`);
            // whisper.cpp server genellikle multi-part wav bekler
            const res = await ReactNativeBlobUtil.fetch('POST', STT_SERVER, {
                'Content-Type': 'multipart/form-data',
            }, [
                { name: 'file', filename: 'audio.wav', data: ReactNativeBlobUtil.wrap(filePath) },
            ]);

            if (res.respInfo.status !== 200) return null;
            
            const data = res.json();
            return data.text || null;
        } catch (e) {
            console.error("[Sync] STT Upload Error:", e);
            return null;
        }
    }

    private static async getLLMSummary(text: string): Promise<string | null> {
        try {
            const prompt = `Lütfen aşağıdaki toplantı dökümünü Türkçe olarak özetle:\n\n${text}`;
            
            const res = await fetch(LLM_SERVER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen2.5:latest', // Kullanıcı daha sonra değiştirebilir
                    prompt: prompt,
                    stream: false
                }),
            });

            const data = await res.json();
            return data.response || null;
        } catch (e) {
            console.error("[Sync] LLM Error:", e);
            return null;
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
