# Sunucu Kurulum Rehberi - ConferenceAi

Bu rehber, toplantı asistanının çalışması için gereken sunucuların kurulumunu anlatır.

---

## 1. STT Sunucusu (Whisper.cpp)

### Gereksinimler
- Ubuntu 22.04 / Debian 12 (veya macOS)
- 8GB+ RAM
- x86_64 işlemci (AVX2 desteği önerilir)

### Kurulum ve Çalıştırma
Whisper.cpp deposunu klonlayıp derledikten sonra, sunucuyu büyük model ile 8080 portunda başlatmak için:

```bash
# Server'ı ggml-large-v3.bin modeli ile başlat
./build/bin/whisper-server -m models/ggml-large-v3.bin --port 8080
```

---

## 2. LLM Sunucusu (Ollama)

### Kurulum ve Çalıştırma
Ollama sunucusunu başlatın ve yeni LLM modelini (qwen3.6:35b) indirin:

```bash
# Ollama'yı başlat (Varsayılan Port: 11434)
ollama serve

# qwen3.6:35b modelini çekin
ollama pull qwen3.6:35b
```

---

## 3. Bağlantı Ayarları
Uygulamada Sunucu IP adresini `172.16.10.142` olarak güncelleyin.
- **STT (Whisper) Adresi:** `http://172.16.10.142:8080/inference`
- **LLM (Ollama) Adresi:** `http://172.16.10.142:11434/api/generate`
