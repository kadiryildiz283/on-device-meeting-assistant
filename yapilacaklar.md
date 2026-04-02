# 🛠 Project Issues & Backlog

Proje açıklaması:

Kullanıcı uygulamaya girer, hoşgeldiniz ekranı çıkar, model seçme ekranı çıkar, whisper seçme ekranı çıkar. seçilen model indirilir. indirildikten sonra toplantıyı başlat butonu aktif olur. butona basarsa konuşulunları uygulama ana ekranda zaman etikleri ile gösterir. toplantı bittiğinde seçilen ai toplantının özetini amacını toplantıya katılanları gibi toplantı değişkenlerini açıklar, eğer toplantı metni ai'yi aşarsa chunklara bölünür ve ai'ya söylenir chunk1 özeti chunk2 özeti şeklinde bastırılır. geçmiş toplantılarının konusunu ai tekrar düzeltir böylece kullanıcı geçmiş toplantıları daha iyi seçer.

### 🔴 High Priority (Kritik)
- [ ] **Whisper API Migration:** `transcribeRealtime` metodu deprecated olduğu için `RealtimeTranscriber` sınıfına geçiş yapılacak (Loglardaki uyarıyı düzelt).
- [ ] **UI Progress Bar:** `ModelDownloader` çalışırken ana ekranda (App.tsx) indirme yüzdesini gösteren bir Overlay/Progress Bar eklenecek. Bu kullanıcın seçtiği model doğrultusunda inecek.
- [ ] **Error Handling:** Tüm catch bloklarına kullanıcıyı bilgilendirecek (Alert veya Toast) mekanizma eklenecek.

### 🟡 Medium Priority (Geliştirme)
- [ ] **Model Selection UI:** Kullanıcının Whisper model boyutunu (tiny, small, base) ve Llama modelini (1B, 7B) seçebileceği bir ayarlar menüsü yapılacak.
- [ ] **VAD (Voice Activity Detection):** Sessiz anlarda Whisper'ın gereksiz işlem yapmasını önlemek için ses aktivite algılama eklenecek. ayrıca whisper çok yavaş çalışıyor ana ekrana kelimeleri dökmekte zorlanıyor, performans sorunları giderilmeli.
- [ ] **Timestamping:** Konuşma dökümlerine ve özetlere tarih/saat damgaları eklenecek.

### 🔵 Low Priority (İyileştirme)
- [ ] **History Actions:** Geçmiş toplantıları silme ve özeti panoya kopyalama (Copy to Clipboard) butonları eklenecek.
- [ ] **Modern UI:** Mevcut minimalist arayüz, profesyonel bir "Dark Theme" odaklı modern tasarıma dönüştürülecek.
- [ ] **Deduplication:** Benzer veya tekrarlanan transkript parçalarını temizleyen algoritma (Levenshtein) geliştirilecek.
