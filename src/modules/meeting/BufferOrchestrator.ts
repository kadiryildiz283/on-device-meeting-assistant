import { MeetingController } from '../../database/MeetingController';
import { MeetingModel } from '../../database/MeetingModel';
import { Platform } from 'react-native';
import { whisperService } from '../../services/WhisperService';

/**
 * Supported Whisper model types for future-proofing.
 */
export type WhisperModelType = 'tiny' | 'base' | 'small' | 'medium';

/**
 * BufferOrchestrator: The brain of the meeting assistant.
 * Manages the lifecycle of transcription, audio buffering, and synchronization
 * between Whisper (STT) and Llama (LLM).
 */
export class BufferOrchestrator {
    // --- State Properties ---
    private currentMeeting: MeetingModel | null = null;
    private isRecording: boolean = false;
    private fullTranscript: string = "";
    private currentSessionTranscript: string = ""; // Transcript of the current 5-min block
    private selectedModel: WhisperModelType = 'small'; // Defaulted to 'small' as requested
    
    // --- Timing & Synchronization ---
    private summaryIntervalMs: number = 5 * 60 * 1000; // 5 minutes
    private timerId: NodeJS.Timeout | null = null;
    private isProcessingSummary: boolean = false;

    // --- UI Callbacks ---
    public onTranscriptionUpdate: ((text: string) => void) | null = null;
    public onSummaryGenerated: ((summary: string) => void) | null = null;
    public onStatusChange: ((status: 'idle' | 'recording' | 'processing') => void) | null = null;

    constructor() {
        console.log(`[BufferOrchestrator] Initialized for ${Platform.OS}. Default model: ${this.selectedModel}`);
    }

    /**
     * Updates the model preference for the next initialization.
     * Note for Kadir: Use this setter when implementing the UI toggle later.
     */
    public setModelPreference(model: WhisperModelType): void {
        this.selectedModel = model;
        console.log(`[BufferOrchestrator] Model preference updated to: ${model}`);
    }

    /**
     * Starts the meeting transcription and the background summary loop.
     */
    public async startMeeting(): Promise<void> {
        if (this.isRecording) return;

        this.isRecording = true;
        this.fullTranscript = "";
        this.currentSessionTranscript = "";
        this.updateStatus('recording');

        try {
          // Create a new meeting in DB before starting audio
            const timeString = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            this.currentMeeting = await MeetingController.createMeeting(`Toplantı ${timeString}`);
            // Initialize STT Service (Ensures model is loaded)
            await whisperService.initialize();

            // Start Real-time Transcription
            await this.beginTranscriptionFlow();

            // Launch the periodic summary cycle (Phase 7-9)
            this.startSummaryLoop();

            console.log("[BufferOrchestrator] Meeting session started successfully.");
        } catch (error) {
            console.error("[BufferOrchestrator] Failed to start meeting:", error);
            this.cleanup();
        }
    }

    /**
     * Stops the meeting and cleans up resources.
     */
    public async stopMeeting(): Promise<void> {
        if (!this.isRecording) return;

        console.log("[BufferOrchestrator] Stopping meeting...");
        this.isRecording = false;
        this.updateStatus('idle');

        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }

        await whisperService.stopTranscribing();
        console.log("[BufferOrchestrator] Resources released. Final transcript length:", this.fullTranscript.length);
    }

    // --- Private Logic ---

    /**
     * Internal transcription flow with improved deduplication and validation.
     */
    private async beginTranscriptionFlow(): Promise<void> {
        await whisperService.startTranscribing((newSegment: string) => {
            const cleanSegment = newSegment.trim();

            if (this.isValidNewSegment(cleanSegment)) {
                this.processIncomingText(cleanSegment);
            }
        });
    }

    /**
     * Validates if the new segment should be appended (Deduplication Logic).
     */
    private isValidNewSegment(segment: string): boolean {
        if (segment.length === 0) return false;
        
        // Prevent immediate repeat of the exact same string
        const lastPart = this.fullTranscript.slice(-segment.length * 2);
        return !lastPart.includes(segment);
    }

    /**
     * Appends text to buffers and notifies the UI.
     */
    private processIncomingText(text: string): void {
        const separator = this.fullTranscript.length > 0 ? " " : "";
        this.fullTranscript += separator + text;
        this.currentSessionTranscript += separator + text;

        // Persist to SQLite Database
        if (this.currentMeeting) {
            MeetingController.addTranscript(this.currentMeeting, text).catch(e => 
                console.error("[BufferOrchestrator] Failed to save transcript to DB:", e)
            );
        }

        if (this.onTranscriptionUpdate) {
            this.onTranscriptionUpdate(this.fullTranscript);
        }
    }

    /**
     * Manages the 5-minute interval timer.
     */
    private startSummaryLoop(): void {
        this.timerId = setInterval(async () => {
            if (this.isRecording && !this.isProcessingSummary) {
                await this.runSummaryCycle();
            }
        }, this.summaryIntervalMs);
    }

    /**
     * Orchestrates the pause-summarize-resume flow.
     */
    private async runSummaryCycle(): Promise<void> {
        this.isProcessingSummary = true;
        this.updateStatus('processing');
        
        console.log("[BufferOrchestrator] --- 5 Minute Summary Cycle Started ---");

        try {
            // 1. Pause STT to free up NPU/GPU for LLM
            await whisperService.stopTranscribing();

            // 2. Placeholder for Phase 7 (Llama.rn / Qwen)
            // const summary = await llamaService.summarize(this.currentSessionTranscript);
            console.log("[BufferOrchestrator] STT Paused. Awaiting LLM summary...");
            
            // Simulating LLM processing time
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Reset the 5-min block transcript after sending to LLM
            this.currentSessionTranscript = "";

            // 3. Resume STT
            if (this.isRecording) {
                await this.beginTranscriptionFlow();
                this.updateStatus('recording');
            }

        } catch (error) {
            console.error("[BufferOrchestrator] Summary cycle failed:", error);
        } finally {
            this.isProcessingSummary = false;
            console.log("[BufferOrchestrator] --- Summary Cycle Completed ---");
        }
    }

    private updateStatus(status: 'idle' | 'recording' | 'processing'): void {
        if (this.onStatusChange) this.onStatusChange(status);
    }

    private cleanup(): void {
        this.isRecording = false;
        this.isProcessingSummary = false;
        this.updateStatus('idle');
        if (this.timerId) clearInterval(this.timerId);
    }
}

// Singleton export
export const orchestrator = new BufferOrchestrator();
