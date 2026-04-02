import { Platform } from 'react-native';
import { whisperService } from '../../services/WhisperService';
import { llamaService } from '../../services/LlamaService';
import { MeetingController } from '../../database/MeetingController';
import { MeetingModel } from '../../database/MeetingModel';

export type WhisperModelType = 'tiny' | 'base' | 'small' | 'medium';

/**
 * Manages the lifecycle of a meeting: recording, database persistence, and final AI summary.
 * Switched to "Continuous Recording + Final Summary" architecture for better context retention.
 */
export class BufferOrchestrator {
    private isRecording: boolean = false;
    private fullTranscript: string = "";
    private selectedModel: WhisperModelType = 'small'; 
    private currentMeeting: MeetingModel | null = null;
    private isProcessingSummary: boolean = false;

    public onTranscriptionUpdate: ((text: string) => void) | null = null;
    public onStatusChange: ((status: 'idle' | 'recording' | 'processing') => void) | null = null;

    constructor() {
        console.log(`[BufferOrchestrator] Initialized for ${Platform.OS}.`);
    }

    public setModelPreference(model: WhisperModelType): void {
        this.selectedModel = model;
    }

    /**
     * Starts the meeting session.
     */
    public async startMeeting(): Promise<void> {
        if (this.isRecording) return;

        this.isRecording = true;
        this.fullTranscript = "";
        this.updateStatus('recording');

        try {
            // 1. Create DB Record
            const timeString = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            this.currentMeeting = await MeetingController.createMeeting(`Toplantı ${timeString}`);

            // 2. Initialize STT (LLM initialization is deferred until the end to save RAM)
            await whisperService.initialize();

            // 3. Start Continuous Listening
            await this.beginTranscriptionFlow();

            console.log("[BufferOrchestrator] Meeting session started. Listening continuously...");
        } catch (error) {
            console.error("[BufferOrchestrator] Failed to start meeting:", error);
            this.cleanup();
        }
    }

    /**
     * Stops the meeting and triggers the final AI summary.
     */
    public async stopMeeting(): Promise<string> {
        if (!this.isRecording) return "No active recording.";

        console.log("[BufferOrchestrator] Stopping meeting...");
        this.isRecording = false;
        this.updateStatus('processing');

        try {
            // 1. Stop Whisper immediately to free up Audio resources
            await whisperService.stopTranscribing();

            // 2. Minimum length check
            if (this.fullTranscript.trim().length < 50) {
                console.warn("[BufferOrchestrator] Transcript too short for meaningful summary.");
                this.updateStatus('idle');
                return "Toplantı çok kısa sürdü, özet çıkarılmadı.";
            }

            // 3. Initialize Llama only when needed (Lazy Loading)
            await llamaService.initialize();

            // 4. Generate Final Summary
            console.log("[BufferOrchestrator] Triggering final summary for the entire session...");
            const finalSummary = await llamaService.summarize(this.fullTranscript);

            // 5. Save Summary to DB
            if (this.currentMeeting && finalSummary) {
                await MeetingController.updateSummary(this.currentMeeting, finalSummary);
            }

            // 6. Final Cleanup
            await llamaService.release();
            this.updateStatus('idle');
            
            console.log("[BufferOrchestrator] Meeting finalized. Summary generated.");
            return finalSummary;

        } catch (error) {
            console.error("[BufferOrchestrator] Error during stop and summarize:", error);
            this.updateStatus('idle');
            return "Özetleme sırasında teknik bir hata oluştu.";
        }
    }

    private async beginTranscriptionFlow(): Promise<void> {
        await whisperService.startTranscribing((newSegment: string) => {
            const cleanSegment = newSegment.trim();
            if (this.isValidNewSegment(cleanSegment)) {
                this.processIncomingText(cleanSegment);
            }
        });
    }

    private isValidNewSegment(segment: string): boolean {
        if (segment.length === 0) return false;
        // Basic deduplication for overlapping segments
        const lastPart = this.fullTranscript.slice(-segment.length * 2);
        return !lastPart.includes(segment);
    }

    private processIncomingText(text: string): void {
        const separator = this.fullTranscript.length > 0 ? " " : "";
        this.fullTranscript += separator + text;

        if (this.currentMeeting) {
            MeetingController.addTranscript(this.currentMeeting, text).catch(e => 
                console.error("[BufferOrchestrator] Failed to save DB:", e)
            );
        }

        if (this.onTranscriptionUpdate) {
            this.onTranscriptionUpdate(this.fullTranscript);
        }
    }

    private updateStatus(status: 'idle' | 'recording' | 'processing'): void {
        if (this.onStatusChange) this.onStatusChange(status);
    }

    private cleanup(): void {
        this.isRecording = false;
        this.updateStatus('idle');
    }
}

export const orchestrator = new BufferOrchestrator();
