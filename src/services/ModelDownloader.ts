import ReactNativeBlobUtil from 'react-native-blob-util';

export const MODEL_FILE_NAME = 'qwen1_5-1_8b-chat-q4_k_m.gguf';
const dirs = ReactNativeBlobUtil.fs.dirs;
export const MODEL_PATH = `${dirs.DocumentDir}/${MODEL_FILE_NAME}`;

const DOWNLOAD_URL = 'https://huggingface.co/Qwen/Qwen1.5-1.8B-Chat-GGUF/resolve/main/qwen1_5-1_8b-chat-q4_k_m.gguf?download=true';

export class ModelDownloader {
    
    public static async checkModelExists(): Promise<boolean> {
        return await ReactNativeBlobUtil.fs.exists(MODEL_PATH);
    }

    public static async downloadModel(onProgress: (percentage: number) => void): Promise<void> {
        const exists = await this.checkModelExists();
        if (exists) {
            console.log("[ModelDownloader] Model zaten mevcut. İndirme atlanıyor.");
            return;
        }

        console.log(`[ModelDownloader] İndirme başlatılıyor: ${DOWNLOAD_URL}`);

        try {
            const task = ReactNativeBlobUtil.config({
                path: MODEL_PATH,
                timeout: 120000, 
                fileCache: true,
                appendExt: 'gguf'
            }).fetch('GET', DOWNLOAD_URL, {
                // Sunucunun isteği reddetmesini önlemek için standart bir User-Agent ekliyoruz
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept-Encoding': 'gzip, deflate, br'
            });

            task.progress({ count: 10, interval: 2000 }, (received, total) => {
                // HATA TEŞHİS LOGU: Raw veriyi direkt konsola bas.
                console.log(`[ModelDownloader-Raw] Gelen: ${received} bytes | Toplam Beklenen: ${total} bytes`);

                if (Number(total) <= 0) {
                    // Sunucu Content-Length göndermediyse (Redirect senaryosu), yüzdelik hesaplama. 
                    // Sadece inen MB miktarını hesapla ve logla. İndirme arka planda devam ediyordur.
                    const downloadedMB = (Number(received) / (1024 * 1024)).toFixed(2);
                    console.log(`[ModelDownloader] Yüzde hesaplanamıyor. İnen miktar: ${downloadedMB} MB`);
                    
                    // UI'ın 0'da takılı kalmaması için sembolik olarak byte'ı ilerletiyoruz veya sabit tutuyoruz.
                    // Gerçek bir total olmadığı için UI tarafında % hesaplamasını 'İndiriliyor...' şeklinde değiştirmelisin.
                    return; 
                }

                const percentage = (Number(received) / Number(total)) * 100;
                onProgress(Math.round(percentage));
            });

            const response = await task;
            const status = response.info().status;
            
            console.log(`[ModelDownloader] HTTP Status: ${status}`);

            if (status >= 200 && status < 300) {
                console.log(`[ModelDownloader] İndirme başarılı. Yol: ${response.path()}`);
            } else {
                throw new Error(`Sunucu reddetti. HTTP Kodu: ${status}`);
            }

        } catch (error) {
            console.error("[ModelDownloader] Native indirme başarısız:", error);
            
            const partialExists = await ReactNativeBlobUtil.fs.exists(MODEL_PATH);
            if (partialExists) {
                await ReactNativeBlobUtil.fs.unlink(MODEL_PATH);
                console.log("[ModelDownloader] Yarım kalan hatalı dosya silindi.");
            }
            throw error;
        }
    }
}
