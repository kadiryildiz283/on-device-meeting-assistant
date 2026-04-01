PROJE RAPORU: ON-DEVICE AI TOPLANTI ASİSTANI (Pragmatik RN Mimarisi)
1. Vizyon ve Değer Önerisi

    Temel İşlev: İnternet bağlantısı gerektirmeyen, %100 cihaz içi çalışan, gerçek zamanlı ses transkripsiyonu ve periyodik özetleme aracı.

    Hedef Cihazlar: Minimum 8GB RAM'e sahip Android cihazlar (Snapdragon 8 Gen 2 ve üzeri) ve iPhone 14 Pro / 15 serisi ve üzeri (A16 Bionic/A17 Pro). Eklenen RN yükü nedeniyle bellek yönetimi daha kritik hale gelmiştir.

    Dil Desteği: Türkçe ve İngilizce (Kusursuz ve çift yönlü).

2. Kullanıcı Arayüzü (UI) ve Deneyim (UX) Mimarisi

UI, bilişsel yükü sıfıra indirecek şekilde tasarlanacaktır.

    Ana Ekran: Sadece dev, minimalist bir "Kayıt (Record)" butonu. Ekstra menü, karmaşık ayarlar yok.

    Kayıt Anı: Ekranda gerçek zamanlı akan metin (Whisper çıktısı) ve her 5 dakikada bir beliren özet blokları (Qwen çıktısı). Ekranın kararmasını önleyen ama pili korumak için OLED siyahına geçen "Karanlık Mod (Dark Mode)" aktifleşecek.

    Geçmiş (History) Paneli: Sol üstteki hamburger menüden erişilen, kronolojik liste.

    Otomatik İsimlendirme: Toplantı bittiğinde Qwen, tüm metne bakarak 3-4 kelimelik spesifik bir başlık üretecek (Örn: "Q3 Pazarlama Bütçesi Planlaması").

3. Teknik Mimari (Asenkron Tampon Stratejisi)

En büyük mühendislik problemi, Whisper (STT) aktif olarak sesi dinleyip metne çevirirken, aynı anda Qwen'in (LLM) her 5 dakikada bir uyanıp özet çıkarmasıdır. TypeScript üzerinden yönetilecek olan bu süreçte asenkron tampon (buffer) hayati önem taşır.

Çözüm: TypeScript/JS Asenkron Ses Tamponu kullanılacaktır.

    whisper.rn sürekli çalışır.

        dakikaya gelindiğinde, STT'nin o ana kadar ürettiği metin react-native-llama (Qwen) motoruna gönderilir.

    Qwen özeti üretirken, donanım kaynaklarını Qwen'e ayırmak için whisper.rn'in transkripsiyon işlemi duraklatılır.

    Bu 2-4 saniyelik duraklama anında mikrofon kapanmaz. Gelen ses ham (raw audio) olarak geçici bir tampona kaydedilir.

    Qwen işini bitirdiğinde, tamponda biriken ses whisper.rn'e hızla beslenir ve gerçek zamanlı akışa yetişmesi sağlanır.

4. Geliştirme Yol Haritası (6 Haftalık Hızlandırılmış Plan)
Aşama	Süre	Odak Alanı	Kritik Teslimatlar
Aşama 1	1 Hafta	Altyapı ve Çekirdek UI	React Native kurulumu, WatermelonDB/SQLite ayarları, npm paketlerinin (whisper.rn, react-native-llama) projeye eklenmesi ve UI inşası.
Aşama 2	1.5 Hafta	STT Motoru (whisper.rn) Entegrasyonu	ggml-small modelinin yüklenmesi. Gerçek zamanlı ses dinleme ve metne dökme testlerinin TS üzerinden tamamlanması.
Aşama 3	1.5 Hafta	LLM Motoru (react-native-llama) ve Döngü	Qwen-1.5-1.5B (4-bit) entegrasyonu. TS tarafında Asenkron Tampon mantığının ve 5 dakikalık dur-kalk orkestrasyonunun kodlanması.
Aşama 4	1 Hafta	TS Bellek ve OOM Optimizasyonu	JS/TS tarafındaki bellek sızıntılarının (garbage collection) kontrolü. Arka planda çalışırken işletim sisteminin uygulamayı kapatmaması için yapılandırma.
Aşama 5	1 Hafta	Model Dağıtım Altyapısı	2GB'lık modellerin ilk açılışta uygulama içinden (In-App) Wi-Fi üzerinden indirilmesi mekanizması.
5. AI Co-Founder Eklemeleri ve Veto Kontrolü

Eklenen Stratejik Özellikler:

    Smart VAD (Voice Activity Detection): Hazır bir RN ses kütüphanesi ile sessizlik anlarında whisper.rn modelini uykuya alıp batarya tasarrufu sağlayacak bir VAD filtresi.

    Cihaz İçi Vektör Arama (On-Device Vector Search): Geçmiş toplantılar çok biriktiğinde, kullanıcı eski bir toplantıda geçen spesifik bir konuyu bulmak isteyecektir. Metinleri basit bir SQLite araması yerine, cihaz içi hafif bir vektör veritabanına kaydederek anlamsal arama (semantic search) yapılmasını sağlayacağız.

6. Detaylı Proje Yol Haritası (12 Spesifik Faz)

    Faz 1: Hazır Kütüphane Altyapısı: React Native kurulumu, whisper.rn, react-native-llama ve gerekli UI paketlerinin (npm install) yüklenip konfigüre edilmesi.

    Faz 2: Veri Kalıcılığı (SQLite): WatermelonDB ile toplantı metinlerinin, özetlerinin ve meta verilerinin yerel depolama mimarisi.

    Faz 3: Minimalist UI/UX: Ana kayıt butonu, transkripsiyon akış ekranı ve "OLED Dostu" karanlık mod tasarımı.

    Faz 4: Ses Yakalama ve Asenkron Tampon Modülü: Mikrofon erişiminin ayarlanması, gelen sesin TypeScript tarafında dizi (array) veya geçici dosya olarak tamponlanması.

    Faz 5: Whisper.rn Entegrasyonu: ggml-small modelinin uygulama içine gömülmesi ve STT motorunun konfigürasyonu.

    Faz 6: Gerçek Zamanlı Transkripsiyon: Ses verisinin whisper.rn motoruna verilmesi ve dönen metnin React state'leri üzerinden UI'da akıtılması.

    Faz 7: React-native-llama ve Qwen Entegrasyonu: Qwen-1.5B modelinin cihazda çalıştırılması ve system prompt mühendisliği.

    Faz 8: TS Orkestrasyonu (Duraklatma Mantığı): setInterval ve asenkron fonksiyonlar kullanılarak Whisper'ın durdurulması, Llama'nın çalıştırılması ve tamponlanan sesin işlenmesi.

    Faz 9: Akıllı Özetleme ve İsimlendirme: Her 5 dakikada bir "periyodik özet" üretimi ve toplantı bitiminde metinden "akıllı başlık" oluşturma.

    Faz 10: Smart VAD Entegrasyonu: Hazır RN VAD modülleri ile sessizlik tespiti yapıp donanım tüketimini minimize etme.

    Faz 11: On-Device Vector Search: Geçmiş toplantılar içinde anlamsal (semantic) arama yapabilmek için TS destekli hafif bir vektör arama çözümü entegrasyonu.

    Faz 12: JS RAM ve Termal Yönetim: React tarafında oluşan objelerin garbage collector tarafından temizlendiğinden emin olma ve OOM (Out of Memory) çökmelerini önleme.
