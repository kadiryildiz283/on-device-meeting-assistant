import { sherpaService } from '../../services/SherpaService';
import { llamaService } from '../../services/LlamaService';
import { MeetingController } from '../../database/MeetingController'; 
import { MeetingModel } from '../../database/MeetingModel';

export class BufferOrchestrator {
    private fullTranscript: string = "";
    private currentPartial: string = ""; 
    private sherpaDir: string = ''; 
    private llamaModelPath: string = '';
    
    private activeMeeting: MeetingModel | null = null;

    public setPreferences(sherpaModelDir: string, llamaPath: string) {
        this.sherpaDir = sherpaModelDir;
        this.llamaModelPath = llamaPath;
    }

    public async startMeeting(): Promise<void> {
        this.fullTranscript = "";
        this.currentPartial = "";
        
        try {
            const title = `Toplantı - ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
            this.activeMeeting = await MeetingController.createMeeting(title); 
            console.log(`[Orchestrator] Yeni toplantı DB'ye işlendi: ${this.activeMeeting.id}`);
        } catch (e) {
            console.error("[Orchestrator] DB oluşturma hatası:", e);
        }

        // Initialize Sherpa-ONNX engine
        await sherpaService.initialize(this.sherpaDir);
        
        await sherpaService.startTranscribing(async (text, isFinal) => {
            if (isFinal) {
                this.fullTranscript += text + " ";
                this.currentPartial = ""; 
                
                if (this.activeMeeting) {
                    await MeetingController.addTranscript(this.activeMeeting, text); 
                }
            } else {
                this.currentPartial = text;
            }

            if (this.onTranscriptionUpdate) {
                this.onTranscriptionUpdate(this.fullTranscript + this.currentPartial);
            }
        });
    }

    public async stopMeeting(): Promise<string> {
        await sherpaService.stopTranscribing();
        
        // RAM Clearance Protocol
        await sherpaService.release();
        
        if (this.currentPartial) {
            this.fullTranscript += this.currentPartial + " ";
            if (this.activeMeeting) {
                await MeetingController.addTranscript(this.activeMeeting, this.currentPartial);
            }
        }

        if (!this.llamaModelPath) return "LLM modeli ayarlanmadı.";
        
        await llamaService.initialize(this.llamaModelPath);
        const summary = await llamaService.summarize(this.fullTranscript);
        await llamaService.release(); 
        
        if (this.activeMeeting) {
            await MeetingController.updateSummary(this.activeMeeting, summary); 
            this.activeMeeting = null;
        }
        
        return summary;
    }

    public onTranscriptionUpdate: ((text: string) => void) | null = null;
    public onStatusChange: ((status: string) => void) | null = null;
}

export const orchestrator = new BufferOrchestrator();
