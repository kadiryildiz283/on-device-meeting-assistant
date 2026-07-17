# 🎙️ ConferenceAi: Sunucu Tabanlı Toplantı Asistanı

Gizlilik odaklı, sunucu destekli yapay zeka ile çalışan ve yüksek performanslı mobil cihazlar (Samsung S24/S25, iPhone 15/16 Pro vb.) için optimize edilmiş akıllı toplantı asistanı.

## 🌟 Temel Özellikler
- **Dinamik Sunucu Bağlantısı:** Sunucu IP veya Host adresi uygulama içinden dinamik olarak değiştirilebilir.
- **Canlı Sunucu Durum Barı:** Whisper (STT) ve Ollama (LLM) sunucu bağlantıları 5 saniyede bir pinglenerek bağlı olup olmadıkları ana ekrandaki göstergelerle (Yeşil/Kırmızı) canlı gösterilir.
- **Esnek Model Yapılandırması:** Ollama tarafında kullanılan LLM model adı uygulama arayüzünden dinamik olarak ayarlanabilir (Örn: `qwen3.6:35b`, `llama3`, `mistral` vb.).
- **Yerel Veri Saklama:** `@nozbe/watermelondb` (SQLite) ile tüm veriler cihazda kalır, buluta çıkmaz.
- **Kesintisiz & Akıllı Senkronizasyon:** Sunuculara ulaşılamadığında ses kaydı cihazda güvenle saklanır, hataya düşülmez ve her 10 saniyede bir otomatik olarak yeniden denenir. Sunucular açıldığı an işlem otomatik tamamlanır.
- **Arka Plan ve Başlangıç Senkronizasyonu:** Uygulama kapalıyken bile arka planda işlem devam eder. Ayrıca uygulama her açıldığında bekleyen tüm senkronizasyonlar otomatik olarak tetiklenerek kaldığı yerden devam eder.

## 🛠 Teknik Mimari (Kaydet -> Senkronize Et)

Uygulama, cihaz donanımını yormamak için tüm AI işlemlerini sunucuya devreder:

1. **Kayıt Aşaması:** `react-native-audio-record` ile ses 16kHz WAV formatında diske yazılır. AI motorları bu sırada tamamen kapalıdır.
2. **Bekleme Aşaması:** Kayıt durdurulduğunda dosya yolu ve "pending" durumu veritabanına kaydedilir.
3. **Senkronizasyon Aşaması (Her 10 Saniyede Bir Kontrol):**
   - Sunucuların durumları kontrol edilir (`STT` ve `LLM` aktifliği).
   - Sunuculara ulaşılamıyorsa → İşlem bekletilir, 10 saniye sonra tekrar denenir. Ses dosyası asla silinmez.
   - Sunuculara ulaşılabiliyorsa → STT → LLM işlemleri sırayla tamamlanır.
   - İşlemler başarıyla bitince → Yerel diskteki ses dosyası silinerek yer açılır.
4. **Tamamlama:** Özet ve transkripsiyon veritabanına kaydedilir, kullanıcıya bildirim gönderilir.

---

## 🚀 Geliştiriciler İçin Kurulum Rehberi

### Gereksinimler
- **Node.js:** v22.x
- **Android:** SDK 34+ / **iOS:** Xcode 15+
- **Donanım:** En az 6GB RAM'li fiziksel cihaz.

### Sunucu Gereksinimleri
Sunucuları yerel bilgisayarınızda veya uzaktaki bir sunucuda çalıştırabilirsiniz.

### 1. Bağımlılıkların Kurulumu
```bash
npm install
cd android && ./gradlew clean && cd ..
```

### 2. Sunucu Yapılandırması

#### A. Whisper.cpp STT Sunucusu
whisper.cpp server'ı başlatmak için:
```bash
# Server'ı başlat (Varsayılan Port: 8080)
./build/bin/whisper-server -m models/ggml-large-v3.bin --port 8080
```

#### B. Ollama LLM Sunucusu (Varsayılan Port: 11434)
```bash
# Ollama'yı başlat
ollama serve

# İstediğiniz modeli indirin (Örnek modeller)
ollama pull qwen3.6:35b
```

### 3. Uygulama Yapılandırması

Sunucu adreslerini ve LLM model adını uygulama arayüzünde en üstte yer alan **Sunucu** alanına tıklayarak değiştirebilirsiniz:
- **Android Emülatör:** `10.0.2.2` girin.
- **Fiziksel Cihaz:** Bilgisayarınızın yerel IP adresini girin (Örn: `192.168.1.100`).
- **Ollama Model Adı:** Ollama sunucunuzda indirilmiş olan modelin adını girin (Örn: `qwen3.6:35b` veya `llama3`).


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
