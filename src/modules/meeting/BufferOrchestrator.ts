import { whisperService, WhisperModelType } from '../../services/WhisperService';
import { llamaService } from '../../services/LlamaService';
// ZORUNLU KONTROL: Veritabanı modüllerini doğru yollardan import ediyoruz.
import { MeetingController } from '../../database/MeetingController'; 
import { MeetingModel } from '../../database/MeetingModel';

export class BufferOrchestrator {
    private fullTranscript: string = "";
    private currentPartial: string = ""; 
    private whisperPref: WhisperModelType = 'tiny';
    private llamaModelPath: string = '';
    
    // Veritabanı ile konuşan asıl obje
    private activeMeeting: MeetingModel | null = null;

    public setPreferences(whisper: WhisperModelType, llamaPath: string) {
        this.whisperPref = whisper;
        this.llamaModelPath = llamaPath;
    }

    public async startMeeting(): Promise<void> {
        this.fullTranscript = "";
        this.currentPartial = "";
        
        try {
            // 1. Dinamik başlık atayarak veritabanında (History) yeni satır açıyoruz.
            const title = `Toplantı - ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
            this.activeMeeting = await MeetingController.createMeeting(title); 
            console.log(`[Orchestrator] Yeni toplantı DB'ye işlendi: ${this.activeMeeting.id}`);
        } catch (e) {
            console.error("[Orchestrator] DB oluşturma hatası:", e);
        }

        // Whisper her toplantıda taze (fresh) RAM blokuyla başlatılır.
        await whisperService.initialize(this.whisperPref);
        
        await whisperService.startTranscribing(async (text, isFinal) => {
            if (isFinal) {
                // 2. Cümle Kesinleşti: Ana metne kalıcı olarak ekle
                this.fullTranscript += text + " ";
                this.currentPartial = ""; 
                
                if (this.activeMeeting) {
                    // RASYONEL KARAR: Her kesinleşen cümle anında veritabanına eklenir!
                    // Llama motoru çöksün veya çökmesin, konuşulan hiçbir kelime kaybolmaz.
                    await MeetingController.addTranscript(this.activeMeeting, text); 
                }
            } else {
                // Cümle devam ediyor: Sadece arayüzde göstermek için hafızada tut
                this.currentPartial = text;
            }

            // Arayüze "Kalıcı Metin + O an söylenenler" birleşimini gönder
            if (this.onTranscriptionUpdate) {
                this.onTranscriptionUpdate(this.fullTranscript + this.currentPartial);
            }
        });
    }

    public async stopMeeting(): Promise<string> {
        // 1. Mikrofonu Kapat
        await whisperService.stopTranscribing();
        
        // 2. VETO KORUMASI (RAM YÖNETİMİ): Llama'ya 12GB RAM'in tamamını bırakmak için
        // Whisper motorunu C++ belleğinden tamamen yok ediyoruz.
        await whisperService.release();
        
        // Varsa havada kalan son yarım metni de DB'ye yaz
        if (this.currentPartial) {
            this.fullTranscript += this.currentPartial + " ";
            if (this.activeMeeting) {
                await MeetingController.addTranscript(this.activeMeeting, this.currentPartial);
            }
        }

        if (!this.llamaModelPath) return "Llama modeli seçilmedi.";
        
        // 3. LLM Analizi Başlıyor
        // Whisper RAM'den silindiği için Llama artık tüm gücüyle (crash vermeden) yüklenebilir.
        await llamaService.initialize(this.llamaModelPath);
        
        // LlamaService içerisindeki Artımlı (Incremental) algoritma çalışır
        const summary = await llamaService.summarize(this.fullTranscript);
        
        // Llama işini bitirince onu da RAM'den sil. (Telefon soğumaya geçer)
        await llamaService.release(); 
        
        // 4. Veritabanını Güncelle
        if (this.activeMeeting) {
            // Toplantı objesine SADECE nihai özeti yapıştırıyoruz.
            await MeetingController.updateSummary(this.activeMeeting, summary); 
            this.activeMeeting = null;
        }
        
        return summary;
    }

    // Callbacks for UI (MeetingScreen)
    public onTranscriptionUpdate: ((text: string) => void) | null = null;
    public onStatusChange: ((status: string) => void) | null = null;
}

export const orchestrator = new BufferOrchestrator();
