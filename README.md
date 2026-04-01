cat << 'EOF' > README.md
# 🎙️ On-Device AI Meeting Assistant

A 100% offline, privacy-first meeting assistant built for high-end mobile devices. This application listens to meetings, transcribes audio in real-time, and generates smart summaries every 5 minutes using on-device Large Language Models (LLMs). Zero cloud dependencies, zero API costs, full data privacy.

## 🚀 Vision & Value Proposition

* **Core Function:** Real-time speech-to-text (STT) and periodic summarization completely offline.
* **Target Devices:** High-end devices due to RAM constraints. Minimum 8GB RAM for Android (Snapdragon 8 Gen 2+) and iPhone 14 Pro / 15 series+ for iOS.
* **Languages:** Fully supports bilingual interactions (Turkish & English).

## 🧠 Technical Architecture: Asynchronous Audio Buffer

Running two heavy AI models (`whisper` and `llama`) simultaneously on a mobile device will cause Thermal Throttling and Out-Of-Memory (OOM) crashes. We solved this using a **TypeScript-driven Asynchronous Audio Buffer Strategy**:

1. `whisper.rn` runs continuously, transcribing audio.
2. At the 5-minute mark, the transcribed text is routed to the `react-native-llama` (Qwen) engine.
3. To allocate GPU/CPU resources to the LLM, the STT engine (`whisper.rn`) is temporarily **paused**.
4. The microphone remains active. Incoming raw PCM audio is saved to a temporary RAM buffer.
5. Once Qwen finishes the summary (approx. 2-4 seconds), the buffered audio is rapidly fed into `whisper.rn` to catch up to real-time execution. Zero data loss.

## 🛠 Tech Stack

* **Framework:** React Native (TypeScript) - *Pragmatic Architecture, no custom C++ bridges*
* **STT Engine:** `whisper.rn` (Model: `ggml-small`)
* **LLM Engine:** `llama.rn` (Model: Qwen-1.5-1.5B 4-bit Quantized)
* **Local Database:** `@nozbe/watermelondb` (SQLite)
* **Audio Capture:** `react-native-audio-record`

## ⚙️ Getting Started (Local Development)

### Prerequisites
* **Node.js:** v22.x LTS (Strictly required. Do not use v25+ or v18-)
* **Package Manager:** `npm`
* **Android Development:** Android Studio, Android SDK 34, NDK installed.
* **iOS Development:** Xcode, CocoaPods (Mac only).

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/kadiryildiz283/on-device-meeting-assistant.git](https://github.com/kadiryildiz283/on-device-meeting-assistant.git)
   cd on-device-meeting-assistant

    Install dependencies:
    Bash

    npm install --legacy-peer-deps

    Model Setup (Crucial):
    Since AI models are too large for Git, you must download them manually for development.

        Download ggml-small.bin for Whisper and place it in src/assets/models/.

        Download the quantized qwen-1.5b-4bit.gguf for Llama and place it in src/assets/models/.

Running the App

For Android:
Bash

npx react-native run-android

(Ensure you have an emulator running or a physical high-end Android device connected via USB debugging).

For iOS:
Bash

cd ios && pod install && cd ..
npx react-native run-ios

🗺️ Roadmap (12 Phases)

    Phase 1: NPM Packages & Environment Setup (Completed)

    Phase 2: Local Persistence Layer (SQLite/WatermelonDB)

    Phase 3: Minimalist UI & Dark Mode

    Phase 4: Audio Capture & TS Buffer Module

    Phase 5: STT Engine (whisper.rn) Integration

    Phase 6: Real-time Transcription Stream UI

    Phase 7: LLM Engine (llama.rn) Integration

    Phase 8: TS Async Buffer Orchestration

    Phase 9: Periodic Summarization & Auto-Naming

    Phase 10: Smart VAD (Voice Activity Detection)

    Phase 11: On-Device Vector Search (TS)

    Phase 12: RAM Management & OOM Prevention
    EOF
