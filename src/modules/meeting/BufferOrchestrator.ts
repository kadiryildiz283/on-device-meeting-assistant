import { audioService } from '../../services/AudioService';
import { whisperService, WhisperModelType } from '../../services/WhisperService';
import { llamaService } from '../../services/LlamaService';
import { MeetingController } from '../../database/MeetingController'; 
import { MeetingModel } from '../../database/MeetingModel';
import BackgroundService from 'react-native-background-actions';
import notifee from '@notifee/react-native';

export class BufferOrchestrator {
    private llamaModelPath: string = '';
    private whisperPref: WhisperModelType = 'small';
    private activeMeeting: MeetingModel | null = null;

    public setPreferences(llamaPath: string, whisperMode: WhisperModelType) {
        this.llamaModelPath = llamaPath;
        this.whisperPref = whisperMode;
    }

    public async startMeeting(): Promise<void> {
        try {
            const title = `Toplantı - ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
            this.activeMeeting = await MeetingController.createMeeting(title); 
            console.log(`[Orchestrator] Yeni toplantı DB'ye işlendi: ${this.activeMeeting.id}`);
            
            // Phase 1: Pure Audio Recording (No AI loaded yet)
            await audioService.startRecording();
            this.notifyStatus('recording');
        } catch (e) {
            console.error("[Orchestrator] Start error:", e);
        }
    }

    public async stopMeetingAndProcess(): Promise<string> {
        return new Promise(async (resolve) => {
            const processingTask = async () => {
                try {
                    this.notifyStatus('processing_audio');
                    await BackgroundService.updateNotification({ taskDesc: 'Ses dosyası işleniyor...' });
                    
                    // 1. Stop Recording
                    const filePath = await audioService.stopRecording();
                    
                    // 2. STT Phase (Whisper Batch Processing)
                    this.notifyStatus('transcribing');
                    await BackgroundService.updateNotification({ taskDesc: 'Ses metne çevriliyor (STT)...' });
                    await whisperService.initialize(this.whisperPref);
                    const fullTranscript = await whisperService.transcribeFile(filePath);
                    await whisperService.release(); // DESTROY STT
                    
                    // Clean up heavy audio file
                    await audioService.deleteRecord();

                    if (this.activeMeeting) {
                        await MeetingController.addTranscript(this.activeMeeting, fullTranscript);
                    }

                    if (!this.llamaModelPath) {
                        await BackgroundService.stop();
                        resolve("Analiz yapılamadı: LLM bulunamadı.");
                        return;
                    }
                    
                    // 3. LLM Phase
                    this.notifyStatus('summarizing');
                    await BackgroundService.updateNotification({ taskDesc: 'Yapay zeka analiz ediyor (LLM)...' });
                    await llamaService.initialize(this.llamaModelPath);
                    const summary = await llamaService.summarize(fullTranscript);
                    await llamaService.release(); // DESTROY LLM
                    
                    // 4. Update DB
                    if (this.activeMeeting) {
                        await MeetingController.updateSummary(this.activeMeeting, summary); 
                        this.activeMeeting = null;
                    }
                    
                    this.notifyStatus('idle');
                    
                    // Bildirim Gönder
                    await notifee.requestPermission();
                    const channelId = await notifee.createChannel({ id: 'default', name: 'Sistem Bildirimleri' });
                    await notifee.displayNotification({
                        title: 'Analiz Tamamlandı',
                        body: 'Toplantı özetiniz hazır.',
                        android: { channelId },
                    });

                    await BackgroundService.stop();
                    resolve(summary);
                } catch (error) {
                    console.error("[Orchestrator] Pipeline error:", error);
                    this.notifyStatus('idle');
                    
                    await notifee.requestPermission();
                    const channelId = await notifee.createChannel({ id: 'default', name: 'Sistem Bildirimleri' });
                    await notifee.displayNotification({
                        title: 'Analiz Hatası',
                        body: 'İşlem sırasında hata oluştu.',
                        android: { channelId },
                    });

                    await BackgroundService.stop();
                    resolve("İşlem sırasında hata oluştu.");
                }
            };

            await BackgroundService.start(processingTask, {
                taskName: 'MeetingProcessing',
                taskTitle: 'Toplantı Analiz Ediliyor',
                taskDesc: 'İşlem başlatılıyor...',
                taskIcon: { name: 'ic_launcher', type: 'mipmap' },
                color: '#6366f1',
                parameters: { delay: 1000 }
            });
        });
    }

    private notifyStatus(status: 'idle' | 'recording' | 'processing_audio' | 'transcribing' | 'summarizing') {
        if (this.onStatusChange) this.onStatusChange(status);
    }

    public onStatusChange: ((status: string) => void) | null = null;
}

export const orchestrator = new BufferOrchestrator();
