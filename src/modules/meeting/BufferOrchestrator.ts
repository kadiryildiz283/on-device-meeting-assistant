import { requestEssentialPermissions } from '../../services/Permission';
import { audioService } from '../../services/AudioService';
import { SyncService } from '../../services/SyncService';
import { MeetingController } from '../../database/MeetingController'; 
import { MeetingModel } from '../../database/MeetingModel';

export class BufferOrchestrator {
    private activeMeeting: MeetingModel | null = null;

    public async startMeeting(): Promise<void> {
        try {
            const hasPermissions = await requestEssentialPermissions();
            if (!hasPermissions) {
                console.warn("[Orchestrator] HARD STOP: Critical hardware permissions denied.");
                this.notifyStatus('idle');
                return;
            }

            const title = `Toplantı - ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
            this.activeMeeting = await MeetingController.createMeeting(title); 
            console.log(`[Orchestrator] New meeting registered to DB: ${this.activeMeeting.id}`);
            
            await audioService.startRecording();
            this.notifyStatus('recording');
        } catch (e) {
            console.error("[Orchestrator] Start error:", e);
        }
    }

    public async stopMeetingAndProcess(): Promise<string> {
        try {
            this.notifyStatus('processing_audio');
            
            // 1. Stop Recording
            const filePath = await audioService.stopRecording();
            
            if (this.activeMeeting) {
                // 2. Save file path and set status to pending
                await MeetingController.updateAudioFilePath(this.activeMeeting, filePath);
                await MeetingController.updateStatus(this.activeMeeting, 'pending');
                
                // 3. Trigger Sync Service
                SyncService.startSync();
            }

            this.activeMeeting = null;
            this.notifyStatus('idle');
            
            return "Kayıt tamamlandı, sunucuya yükleniyor...";
        } catch (error) {
            console.error("[Orchestrator] Pipeline error:", error);
            this.notifyStatus('idle');
            return "İşlem sırasında hata oluştu.";
        }
    }

    private notifyStatus(status: 'idle' | 'recording' | 'processing_audio' | 'transcribing' | 'summarizing') {
        if (this.onStatusChange) this.onStatusChange(status);
    }

    public onStatusChange: ((status: string) => void) | null = null;
}

export const orchestrator = new BufferOrchestrator();
