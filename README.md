cat << 'EOF' > README.md
# 🎙️ ConferenceAi: On-Device AI Meeting Assistant

Gizlilik odaklı, %100 çevrimdışı çalışan ve yüksek performanslı mobil cihazlar (Samsung S24/S25, iPhone 15/16 Pro vb.) için optimize edilmiş akıllı toplantı asistanı.

## 🌟 Temel Özellikler
- **Real-time STT:** `whisper.rn` (ggml-small) kullanarak anlık konuşma dökümü sağlar.
- **On-Device LLM:** `llama.rn` (Qwen 2.5 7B) ile toplantı sonunda otomatik akıllı özetleme yapar.
- **Yerel Veri Saklama:** `@nozbe/watermelondb` (SQLite) ile tüm veriler cihazda kalır, buluta çıkmaz.
- **Dinamik Kaynak Yönetimi:** RAM darboğazını önlemek için Whisper ve Llama motorları sıralı (sequential) çalıştırılır.

## 🛠 Teknik Mimari (Sequential Processing)
Uygulama, mobil cihazlardaki RAM limitlerini aşmamak için **"Continuous Recording + Final Summary"** stratejisini kullanır:
1. **Kayıt Aşaması:** Whisper motoru gerçek zamanlı transkripsiyon yapar. Llama motoru bu sırada kapalıdır.
2. **Özetleme Aşaması:** Toplantı durdurulduğunda Whisper durdurulur, kaynaklar serbest bırakılır ve Llama 7B motoru başlatılarak tüm döküm özetlenir.
3. **Kalıcılık:** Her transkripsiyon parçası ve final özeti anlık olarak WatermelonDB'ye kaydedilir.

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- **Node.js:** v22.x
- **Android:** SDK 34+ / **iOS:** Xcode 15+
- **Donanım:** En az 8GB RAM'li fiziksel cihaz (Yüksek GPU gücü önerilir).

### Adımlar
1. `npm install --legacy-peer-deps`
2. **Model Kurulumu:** 
   - `ModelDownloader.ts` aracılığıyla `qwen2.5-7b-instruct-q4_k_m.gguf` dosyasını indirin.
   - Whisper modeli için `src/assets/models/ggml-small.bin` yolunu kontrol edin.
3. `npx react-native run-android` veya `npx react-native run-ios`

## 📊 Mevcut Durum
Proje şu anda; ses kaydı, anlık döküm, veritabanı senkronizasyonu ve toplantı sonu özetleme döngüsünü stabil şekilde tamamlamaktadır.
