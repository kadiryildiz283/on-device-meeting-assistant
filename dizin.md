
Skip to content

    kadiryildiz283
    on-device-meeting-assistant

Repository navigation

    Code
    Issues26 (26)
    Pull requests
    Agents
    Discussions
    Actions
    Projects
    Security and quality
    Insights
    Settings

Owner avatar
on-device-meeting-assistant
Public

kadiryildiz283/on-device-meeting-assistant
tT
Name	Last commit message
	Last commit date
kadiryildiz283aider-chat-bot
kadiryildiz283
and
aider-chat-bot
fix: LLM arkaplan süreçlerini ve tekrar önleme parametrelerini güncelle
97fdd63
 · 
2 months ago
.bundle
	
Initial commit
	
3 months ago
__tests__
	
Initial commit
	
3 months ago
android
	
feat: arkaplan servisleri eklendi
	
2 months ago
ios
	
Initial commit
	
3 months ago
src
	
fix: LLM arkaplan süreçlerini ve tekrar önleme parametrelerini güncelle
	
2 months ago
.eslintrc.js
	
Initial commit
	
3 months ago
.gitignore
	
yapilacaklar.md yazıldı
	
2 months ago
.prettierrc.js
	
Initial commit
	
3 months ago
.watchmanconfig
	
Initial commit
	
3 months ago
Gemfile
	
Initial commit
	
3 months ago
README.md
	
uygulama v2.0
	
2 months ago
app.json
	
Initial commit
	
3 months ago
app.md
	
react eklendi
	
3 months ago
babel.config.js
	
feat: finalize history UI, MeetingDetailScreen and sanitize components
	
2 months ago
dosyalar.md
	
tüm dosyalar (ai için)
	
2 months ago
index.js
	
feat: integrate STT engine & async orchestrator (models excluded)
	
2 months ago
jest.config.js
	
Initial commit
	
3 months ago
kural.md
	
feat: arkaplan servisleri eklendi
	
2 months ago
metro.config.js
	
Test
	
2 months ago
package-lock.json
	
feat: arkaplan servisleri eklendi
	
2 months ago
package.json
	
feat: arkaplan servisleri eklendi
	
2 months ago
tsconfig.json
	
Initial commit
	
3 months ago
yapilacaklar.md
	
feat: arkaplan servisleri eklendi
	
2 months ago
Repository files navigation

    README

🎙️ ConferenceAi: On-Device AI Meeting Assistant

Gizlilik odaklı, %100 çevrimdışı çalışan ve yüksek performanslı mobil cihazlar (Samsung S24/S25, iPhone 15/16 Pro vb.) için optimize edilmiş akıllı toplantı asistanı.
🌟 Temel Özellikler

    Stabil STT (Batch Processing): whisper.rn (ggml-small/tiny) kullanılarak yüksek doğrulukta, C++ çökmelerine (Segmentation Fault) karşı korumalı ses-metin dökümü.
    On-Device LLM: llama.rn (Qwen 2.5) ile toplantı sonunda otomatik akıllı özetleme yapar.
    Yerel Veri Saklama: @nozbe/watermelondb (SQLite) ile tüm veriler cihazda kalır, buluta çıkmaz.
    Dinamik Kaynak Yönetimi: RAM darboğazını önlemek için Kayıt, Whisper ve Llama motorları kesin bir sırayla (sequential) çalıştırılır ve işi biten motor RAM'den tamamen silinir.

🛠 Teknik Mimari (Record First, Transcribe Later)

Uygulama, mobil cihazlardaki donanım limitlerini aşmamak için doğrusal bir boru hattı (pipeline) kullanır:

    Kayıt Aşaması: react-native-audio-record ile ses 16kHz WAV formatında diske yazılır. AI motorları bu sırada tamamen kapalıdır.
    STT Aşaması: Toplantı durdurulduğunda kaydedilen dosya whisper.rn motoruna toplu (batch) olarak verilir ve metin çözülür. Ardından Whisper RAM'den silinir.
    Özetleme Aşaması: llama.rn motoru başlatılır, elde edilen tam metin özetlenir ve motor RAM'den silinir.
    Kalıcılık: Nihai özet ve transkripsiyon anlık olarak WatermelonDB'ye kaydedilir.

🚀 Geliştiriciler İçin Kurulum Rehberi
Gereksinimler

    Node.js: v22.x
    Android: SDK 34+ / iOS: Xcode 15+
    Donanım: En az 8GB RAM'li fiziksel cihaz (Yüksek GPU gücü önerilir).

1. Bağımlılıkların Kurulumu

Projede stabiliteyi bozduğu için react-native-sherpa-onnx ve türevi paketler terk edilmiştir. Temiz bir kurulum için:

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

About
No description, website, or topics provided.
Resources
Readme
Activity
Stars
2 stars
Watchers
0 watching
Forks
0 forks
Releases 1
Android Release Latest
on Apr 3
Packages
No packages published
Publish your first package
Contributors 2

    @kadiryildiz283
    kadiryildiz283
    @aider-chat-bot
    aider-chat-bot Aider

Languages

    TypeScript 91.5%
    Kotlin 3.8%
    Ruby 1.9%
    Swift 1.6%
    JavaScript 1.2% 

Suggested workflows
Based on your tech stack

    Datadog Synthetics logo
    Datadog Synthetics
    Run Datadog Synthetic tests within your GitHub Actions workflow
    Deno logo
    Deno
    Test your Deno project
    SLSA Generic generator logo
    SLSA Generic generator
    Generate SLSA3 provenance for your existing release workflows

More workflows
Footer
© 2026 GitHub, Inc.
Footer navigation

    Terms
    Privacy
    Security
    Status
    Community
    Docs
    Contact


