import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';

export class LlamaService {
    private llamaContext: LlamaContext | null = null;
    private isInitialized: boolean = false;
    private readonly MAX_CHARS = 3500; 

    public async initialize(modelPath: string): Promise<void> {
        if (this.isInitialized) await this.release();

        try {
            const exists = await RNFS.exists(modelPath);
            if (!exists) throw new Error(`Model not found: ${modelPath}`);

            console.log(`[LlamaService] Loading model: ${modelPath}`);

            this.llamaContext = await initLlama({
                model: modelPath,
                use_mlock: true, 
                n_ctx: 2048,
                n_threads: 4, 
            });
            
            this.isInitialized = true;
            console.log("[LlamaService] LLM engine is ready.");
        } catch (error: any) {
            console.error("[LlamaService] Initialization error:", error.message);
            throw error;
        }
    }

    private splitIntoChunks(text: string): string[] {
        const chunks: string[] = [];
        let i = 0;
        
        while (i < text.length) {
            let end = i + this.MAX_CHARS;
            if (end < text.length) {
                const lastPoint = text.lastIndexOf('.', end);
                if (lastPoint > i) end = lastPoint + 1;
            }
            chunks.push(text.slice(i, end));
            i = end;
        }
        
        return chunks;
    }

    private async runCompletion(prompt: string, maxTokens: number): Promise<string> {
        if (!this.llamaContext) throw new Error("LlamaContext is null");

        let result = "";
        await this.llamaContext.completion({
            prompt,
            n_predict: maxTokens,
            // Modeli halüsinasyondan uzak tutup sadece gerçeğe odaklamak için parametreler
            temperature: 0.1,
            repeat_penalty: 1.2,
            presence_penalty: 0.1,
            frequency_penalty: 0.1,
            stop: ["<|im_end|>", "<|im_start|>", "Not:"],
        }, (res) => { 
            result += res.token; 
        });

        return result.trim();
    }

    public async summarize(text: string): Promise<string> {
        if (!this.llamaContext) return "Error: LLM hazır değil.";

        // 1. FİLTRE: Eğer metin çok kısaysa boşuna modeli yorma ve saçmalamasını engelle.
        const cleanText = text.trim();
        if (cleanText.length < 25) {
            return "Toplantı kaydı, yapay zekanın anlamlı bir özet çıkarabilmesi için çok kısa veya anlaşılamadı.";
        }

        const chunks = this.splitIntoChunks(cleanText);
        let runningSummary = ""; 

        console.log(`[LlamaService] Metin ${chunks.length} parçaya bölündü.`);

        for (let i = 0; i < chunks.length; i++) {
            console.log(`[LlamaService] Chunk işleniyor ${i + 1}/${chunks.length}...`);
            
            // 2. RASYONEL PROMPT: Boşluk doldurma (fill-in-the-blanks) yerine DİREKT EMİR veriyoruz.
            const prompt = `<|im_start|>system
Sen net, profesyonel ve Türkçe konuşan bir toplantı analistisin. Asla "[konuşmacılar]", "[kararlar]" gibi köşeli parantez içeren şablon kelimeler (placeholder) kullanma. SADECE sana verilen metindeki gerçek bilgileri yaz. Metinde bir bilgi yoksa "Belirtilmedi" de.<|im_end|>
<|im_start|>user
[ÖNCEKİ ÖZET]
${runningSummary || "Henüz özet yok, bu ilk kısım."}

[YENİ TOPLANTI METNİ]
"${chunks[i]}"

[GÖREV]
Yukarıdaki "Yeni Toplantı Metni"ni analiz et. Çıkardığın GERÇEK bilgileri kullanarak aşağıdaki başlıkları içeren bir rapor yaz:
- Katılımcılar
- Ana Konu
- Alınan Kararlar
- Genel Özet
<|im_start|>system
Sen profesyonel bir toplantı analistisin. Görevin, sağlanan metinden sadece somut gerçekleri çıkarmaktır. 

## Kesin Kurallar:
1. **Placeholder Yasak:** "[Konuşmacı]", "[Tarih]" gibi köşeli parantezli ifadeleri asla kullanma. Bilgi yoksa "Belirtilmedi" yaz.
2. **Uydurma Yasak (No Hallucination):** Metinde geçmeyen hiçbir bilgiyi ekleme.
3. **Format:** Maddeler halinde, temiz ve profesyonel bir dil kullan.
4. **Kapsam:** Kararlar kısmında hiçbir detayı atlama.

## Örnek Analiz:
**Girdi Metni:** "Merhaba Elif Hanım, merhaba Yücel Bey. Bugün Android konusunu işleyeceğiz. Android iyidir. Evet Elif Hanım, Android'in iyi olduğu kararına vardık. Android kullanımını artırmalıyız."

**Çıktı:**
- **Katılımcılar:** Elif, Yücel
- **Ana Konu:** Android işletim sisteminin işlevselliği ve kullanım stratejileri.
- **Alınan Kararlar:** 1. Android sisteminin mevcut operasyonlar için uygun olduğu teyit edildi.
  2. Kurum genelinde Android kullanımının artırılmasına karar verildi.
- **Genel Özet:** Toplantıda Android platformunun avantajları tartışılmış ve sistemin verimliliği üzerine mutabık kalınarak kullanım hacminin genişletilmesi planlanmıştır.
<|im_end|>
<|im_start|>user
[ÖNCEKİ ÖZET DURUMU]
${runningSummary || "Henüz işlenmiş bir veri yok."}

[ANALİZ EDİLECEK YENİ METİN]
"${chunks[i]}"

[GÖREV]
Yukarıdaki metni, sistem talimatlarına uygun olarak analiz et. Kararlar kısmında en küçük detayı dahi kaçırma. Eğer metin uzunsa, "Ana Konu" ve "Genel Özet" kısımlarını derinleştirerek detaylandır.
<|im_end|>
<|im_start|>assistant
`;

            runningSummary = await this.runCompletion(prompt, 600);
        }

        return runningSummary;
    }

    public async release(): Promise<void> {
        if (this.llamaContext) {
            await this.llamaContext.release();
            this.llamaContext = null;
            this.isInitialized = false;
            console.log("[LlamaService] RAM serbest bırakıldı.");
        }
    }
}

export const llamaService = new LlamaService();
