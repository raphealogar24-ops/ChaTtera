# CipherGrid E2EE Messenger (Chattera for Android)

Zero-trust, end-to-end encrypted real-time messaging Android application built with **Kotlin**, **Jetpack Compose**, **Room Database**, and native **Java Cryptography Architecture (JCA)**.

---

## 🚀 Features

- **End-to-End Encryption Engine (`ECDH P-256` + `AES-256-GCM`)**:
  - Key agreement using NIST P-256 (`secp256r1`)
  - Authenticated frame encryption using AES-256-GCM with 96-bit random IVs
  - SHA-256 fingerprint generation & 60-digit pairwise Safety Number verification
  - In-memory key agreements and local Room key vault
- **Real-Time Chat & Voice Notes**:
  - Voice recording with real-time waveform visualization
  - Synthesized PCM audio playback with speed controls (`1x`, `1.5x`, `2x`)
  - Disappearing stealth messages (`15s`, `60s`)
  - Emoji reactions, message replies, photo sharing, and unsend/revocation
  - Built-in X-Ray Packet Inspector (`Details` mode) to inspect raw encrypted ciphertext and IVs
- **Google Search Integration**:
  - Live Google Web Search directly linked from the main search bar with automatic intent routing
  - In-chat Google Web Search tool with suggested search topics, copy link, and share-to-chat capabilities
  - Interactive Google Search preview cards (`[SEARCH:...]`) rendered directly in conversations with one-tap web viewing
- **Status Stories**:
  - Create and view cryptographic status updates with instant encrypted replies
- **Encrypted Voice & Video Calls**:
  - Audio and video call interface with acoustic waveforms, mute/video/speaker controls
  - Short Authentication String (SAS) security verification
  - Persistent call history and logs
- **Chattera Smart Escrow & Naira (`₦`) Wallet**:
  - Instant balance management and top-ups
  - In-chat instant Naira transfers (`[CHT-PAY:...]`)
  - Persistent transaction ledger
- **Security Audit Bench**:
  - Live encryption test bench and 12-vector security invariant matrix

---

## 🛠️ Project Structure

```text
├── app/
│   ├── build.gradle.kts          # App-level build configurations & dependencies
│   ├── proguard-rules.pro        # ProGuard rules for release builds
│   └── src/main/
│       ├── AndroidManifest.xml   # Permissions, activities, and metadata
│       ├── java/com/example/
│       │   ├── MainActivity.kt               # Main entrypoint with edge-to-edge Compose UI
│       │   ├── crypto/
│       │   │   ├── E2eeEngine.kt             # ECDH P-256 & AES-256-GCM cryptographic engine
│       │   │   └── VoiceAudioEngine.kt       # Voice note recording & PCM audio synthesis
│       │   ├── data/
│       │   │   ├── Models.kt                 # Room entities & data transfer models
│       │   │   └── ChatteraDatabase.kt       # Room database & pre-populated seed data
│       │   └── ui/
│       │       ├── ChatteraViewModel.kt      # MVI/MVVM reactive state management
│       │       ├── theme/Theme.kt            # Material 3 dynamic color & typography
│       │       └── components/
│       │           ├── AuthScreen.kt         # Sign in, sign up, and account switcher
│       │           ├── CommonComponents.kt   # Top bars, tabs, search, and avatar items
│       │           ├── ChatThreadScreen.kt   # Chat timeline, composer, audio, and inspector
│       │           ├── ModalsAndDialogs.kt   # Call modals, status viewer, safety numbers
│       │           └── WalletAndAuditScreens.kt # Wallet view & security test bench
│       └── res/                              # Adaptive launcher icons, themes, and strings
├── gradle/
│   ├── libs.versions.toml        # Gradle Version Catalog
│   └── wrapper/                  # Gradle Wrapper binaries and properties
├── build.gradle.kts              # Root Gradle configuration
├── settings.gradle.kts           # Module definitions and repository settings
├── gradle.properties             # JVM arguments & AndroidX flags
├── gradlew / gradlew.bat         # Gradle wrapper executable scripts
└── README.md
```

---

## ⚙️ How to Build and Run

### Prerequisites
- **Android Studio Ladybug (or newer)**
- **JDK 21**
- **Android SDK Platform 36** (minSdk: 26)

### Command Line
To compile and assemble the debug APK:
```bash
./gradlew assembleDebug
```
The output APK will be generated at `app/build/outputs/apk/debug/app-debug.apk`.

### In Android Studio
1. Open Android Studio and select **Open**.
2. Select the repository root directory.
3. Allow Gradle to sync.
4. Select a connected device or emulator and click **Run** (Shift + F10).
