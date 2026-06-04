# 🎙️ ConferenceAi: Sunucu Tabanlı Toplantı Asistanı

Gizlilik odaklı, sunucu destekli yapay zeka ile çalışan ve yüksek performanslı mobil cihazlar (Samsung S24/S25, iPhone 15/16 Pro vb.) için optimize edilmiş akıllı toplantı asistanı.

## 🌟 Temel Özellikler
- **Sunucu STT (whisper.cpp):** 172.16.10.141 sunucusunda çalışan Whisper motoru ile yüksek doğrulukta ses-metin dökümü.
- **Sunucu LLM (Ollama):** 172.16.10.141:11434 sunucusunda çalışan Qwen 2.5 modeli ile toplantı sonunda otomatik akıllı özetleme.
- **Yerel Veri Saklama:** `@nozbe/watermelondb` (SQLite) ile tüm veriler cihazda kalır, buluta çıkmaz.
- **Akıllı Senkronizasyon:** Sunucuya ulaşılamazsa ses kaydı saklanır ve her dakika otomatik senkronizasyon denenir.
- **Arka Plan İşleme:** Uygulama kapalıyken bile senkronizasyon devam eder.

## 🛠 Teknik Mimari (Kaydet -> Senkronize Et)

Uygulama, cihazdonanımını yormamak için tüm AI işlemlerini sunucuya devreder:

1. **Kayıt Aşaması:** `react-native-audio-record` ile ses 16kHz WAV formatında diske yazılır. AI motorları bu sırada tamamen kapalıdır.
2. **Bekleme Aşaması:** Kayıt durdurulduğunda dosya yolu ve "pending" durumu veritabanına kaydedilir.
3. **Senkronizasyon Aşaması:**
   - Eğer sunucuya ulaşılabiliyorsa → STT → LLM işlemleri sırayla yapılır.
   - Eğer ulaşılamıyorsa → Dosya saklanır, her dakika sunucu kontrol edilir.
   - Başarısız olursa → Dosya ASLA silinmez, "failed" durumuyla işaretlenir.
4. **Tamamlama:** Özet ve transkripsiyon veritabanına kaydedilir, kullanıcıya bildirim gönderilir.

---

## 🚀 Geliştiriciler İçin Kurulum Rehberi

### Gereksinimler
- **Node.js:** v22.x
- **Android:** SDK 34+ / **iOS:** Xcode 15+
- **Donanım:** En az 6GB RAM'li fiziksel cihaz.

### Sunucu Gereksinimleri
- **STT Sunucusu:** 172.16.10.141 (whisper.cpp server, port 8080)
- **LLM Sunucusu:** 172.16.10.141:11434 (Ollama)

### 1. Bağımlılıkların Kurulumu
```bash
npm install
cd android && ./gradlew clean && cd ..
```

### 2. Sunucu Yapılandırması

#### A. Whisper.cpp STT Sunucusu (172.16.10.141)

whisper.cpp server'ı başlatmak için:
```bash
# Modeli indir (örnek: tiny)
./models/download-ggml-model.sh tiny

# Server'ı başlat
./server -m models/ggml-tiny.bin -t 4 --port 8080
```

#### B. Ollama LLM Sunucusu (172.16.10.141:11434)

```bash
# Ollama'yı başlat
ollama serve

# Qwen 2.5 modelini indir (veya daha küçük bir model)
ollama pull qwen2.5:latest
# veya daha hafif bir model için:
# ollama pull qwen2.5:1.5b
```

### 3. Uygulama Yapılandırması

Sunucu adreslerini değiştirmek için `src/services/SyncService.ts` dosyasını düzenleyin:

```typescript
const STT_SERVER = 'http://172.16.10.141:8080/inference';
const LLM_SERVER = 'http://172.16.10.141:11434/api/generate';
```

### 4. Çalıştırma

```bash
npm start -- --reset-cache

# Farklı terminalde Android derlemesi
npx react-native run-android
```

---

## 📊 Veritabanı Şeması

| Alan | Tür | Açıklama |
|------|-----|----------|
| id | string | Benzersiz tanımlayıcı |
| title | string | Toplantı başlığı |
| summary | string | LLM tarafından oluşturulan özet (isteğe bağlı) |
| audio_file_path | string | Yerel ses dosyası yolu (isteğe bağlı) |
| status | string | İşlem durumu: pending, processing, completed, failed |
| created_at | number | Oluşturulma zamanı |

## 🔄 Senkronizasyon Durumları

| Durum | Açıklama |
|-------|----------|
| pending | Sunucuya yüklendi, işlem bekliyor |
| processing | Sunucuda işleniyor |
| completed | STT ve LLM tamamlandı |
| failed | İşlem başarısız, tekrar denenecek |

## 🗑️ Eski Mimari (On-Device)

Eski on-device AI mimarisi artık kullanılmıyor. Aşağıdaki dosyalar ve bağımlılıklar kaldırılmıştır:
- `whisper.rn` (yerel Whisper)
- `llama.rn` (yerel Llama)
- `react-native-sherpa-onnx`

Yerel model indirme gereksinimi ortadan kalkmıştır.
