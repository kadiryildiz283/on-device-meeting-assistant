import { audioService } from '../../services/AudioService';
import { whisperService, WhisperModelType } from '../../services/WhisperService';
import { llamaService } from '../../services/LlamaService';
import { MeetingController } from '../../database/MeetingController'; 
import { MeetingModel } from '../../database/MeetingModel';

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
        try {
            this.notifyStatus('processing_audio');
            
            // 1. Stop Recording
            const filePath = await audioService.stopRecording();
            
            // 2. STT Phase (Whisper Batch Processing)
            this.notifyStatus('transcribing');
            await whisperService.initialize(this.whisperPref);
            const fullTranscript = await whisperService.transcribeFile(filePath);
            await whisperService.release(); // DESTROY STT
            
            // Clean up heavy audio file
            await audioService.deleteRecord();

            if (this.activeMeeting) {
                await MeetingController.addTranscript(this.activeMeeting, fullTranscript);
            }

            if (!this.llamaModelPath) return "Analiz yapılamadı: LLM bulunamadı.";
            
            // 3. LLM Phase
            this.notifyStatus('summarizing');
            await llamaService.initialize(this.llamaModelPath);
            const summary = await llamaService.summarize(fullTranscript);
            await llamaService.release(); // DESTROY LLM
            
            // 4. Update DB
            if (this.activeMeeting) {
                await MeetingController.updateSummary(this.activeMeeting, summary); 
                this.activeMeeting = null;
            }
            
            this.notifyStatus('idle');
            return summary;
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
