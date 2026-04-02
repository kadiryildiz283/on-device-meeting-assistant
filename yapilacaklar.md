# 🛠 Project Issues & Backlog

### 🔴 High Priority (Kritik)
- [ ] **Whisper API Migration:** `transcribeRealtime` metodu deprecated olduğu için `RealtimeTranscriber` sınıfına geçiş yapılacak (Loglardaki uyarıyı düzelt).
- [ ] **UI Progress Bar:** `ModelDownloader` çalışırken ana ekranda (App.tsx) indirme yüzdesini gösteren bir Overlay/Progress Bar eklenecek.
- [ ] **Error Handling:** Tüm catch bloklarına kullanıcıyı bilgilendirecek (Alert veya Toast) mekanizma eklenecek.

### 🟡 Medium Priority (Geliştirme)
- [ ] **Model Selection UI:** Kullanıcının Whisper model boyutunu (tiny, small, base) ve Llama modelini (1B, 7B) seçebileceği bir ayarlar menüsü yapılacak.
- [ ] **VAD (Voice Activity Detection):** Sessiz anlarda Whisper'ın gereksiz işlem yapmasını önlemek için ses aktivite algılama eklenecek.
- [ ] **Timestamping:** Konuşma dökümlerine ve özetlere tarih/saat damgaları eklenecek.

### 🔵 Low Priority (İyileştirme)
- [ ] **History Actions:** Geçmiş toplantıları silme ve özeti panoya kopyalama (Copy to Clipboard) butonları eklenecek.
- [ ] **Modern UI:** Mevcut minimalist arayüz, profesyonel bir "Dark Theme" odaklı modern tasarıma dönüştürülecek.
- [ ] **Deduplication:** Benzer veya tekrarlanan transkript parçalarını temizleyen algoritma (Levenshtein) geliştirilecek.
