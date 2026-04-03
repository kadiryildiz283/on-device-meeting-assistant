# 🎙️ ConferenceAi: On-Device AI Meeting Assistant

Gizlilik odaklı, %100 çevrimdışı çalışan ve yüksek performanslı mobil cihazlar (Samsung S24/S25, iPhone 15/16 Pro vb.) için optimize edilmiş akıllı toplantı asistanı.

## 🌟 Temel Özellikler
- **Stabil STT (Batch Processing):** `whisper.rn` (ggml-small/tiny) kullanılarak yüksek doğrulukta, C++ çökmelerine (Segmentation Fault) karşı korumalı ses-metin dökümü.
- **On-Device LLM:** `llama.rn` (Qwen 2.5) ile toplantı sonunda otomatik akıllı özetleme yapar.
- **Yerel Veri Saklama:** `@nozbe/watermelondb` (SQLite) ile tüm veriler cihazda kalır, buluta çıkmaz.
- **Dinamik Kaynak Yönetimi:** RAM darboğazını önlemek için Kayıt, Whisper ve Llama motorları kesin bir sırayla (sequential) çalıştırılır ve işi biten motor RAM'den tamamen silinir.

## 🛠 Teknik Mimari (Record First, Transcribe Later)
Uygulama, mobil cihazlardaki donanım limitlerini aşmamak için doğrusal bir boru hattı (pipeline) kullanır:
1. **Kayıt Aşaması:** `react-native-audio-record` ile ses 16kHz WAV formatında diske yazılır. AI motorları bu sırada tamamen kapalıdır.
2. **STT Aşaması:** Toplantı durdurulduğunda kaydedilen dosya `whisper.rn` motoruna toplu (batch) olarak verilir ve metin çözülür. Ardından Whisper RAM'den silinir.
3. **Özetleme Aşaması:** `llama.rn` motoru başlatılır, elde edilen tam metin özetlenir ve motor RAM'den silinir.
4. **Kalıcılık:** Nihai özet ve transkripsiyon anlık olarak WatermelonDB'ye kaydedilir.

---

## 🚀 Geliştiriciler İçin Kurulum Rehberi

### Gereksinimler
- **Node.js:** v22.x
- **Android:** SDK 34+ / **iOS:** Xcode 15+
- **Donanım:** En az 8GB RAM'li fiziksel cihaz (Yüksek GPU gücü önerilir).

### 1. Bağımlılıkların Kurulumu
Projede stabiliteyi bozduğu için `react-native-sherpa-onnx` ve türevi paketler terk edilmiştir. Temiz bir kurulum için:
```bash
npm install
cd android && ./gradlew clean && cd ..

2. AI Modellerinin Eklenmesi (KRİTİK ADIM)

C++ motorlarının çökmemesi için aşağıdaki STT ve LLM dosyalarını sisteme manuel veya UI üzerinden doğru şekilde tanıtmanız zorunludur.
A. Whisper Modelleri (STT)

Whisper modelleri indirme hatalarını önlemek için uygulamaya statik (bundled) olarak gömülmüştür. Bu dosyaları manuel indirip projeye dahil etmelisiniz:

    Hugging Face - ggerganov/whisper.cpp deposuna gidin.

    ggml-tiny.bin ve ggml-small.bin dosyalarını indirin.

    Projenizde aşağıdaki dizini oluşturun (eğer yoksa) ve dosyaları içine kopyalayın:

        src/assets/models/ggml-tiny.bin

        src/assets/models/ggml-small.bin

B. Llama Modeli (LLM)

Uygulama, temel analizler için qwen2.5-7b-instruct-q4_k_m.gguf (veya daha küçük 1.5B/3B) varyantlarını destekler.

    Otomatik Kurulum: Uygulama içindeki ayarlar menüsünden (Settings UI) istediğiniz modeli doğrudan cihazın belge dizinine indirebilirsiniz.

    Manuel Kurulum (Zaman Kazanmak İçin): İlgili GGUF dosyasını indirip Android cihazınızın root belgeler dizinine (veya Android/data/com.conferenceai/files/) qwen2.5-7b-instruct-q4_k_m.gguf ismiyle atabilirsiniz.

3. Çalıştırma

Statik .bin (Whisper) dosyalarını assets klasörüne eklediğiniz için Metro Bundler'ın önbelleğini temizleyerek başlamanız şarttır:
Bash

npm start -- --reset-cache

Farklı bir terminalde Android derlemesini başlatın:
Bash

npx react-native run-android
