# COORDINA — Android APK Build Guide

This project is built with React 19, TypeScript, Vite, and Tailwind CSS. It is pre-configured with **Capacitor** (`capacitor.config.ts`) to compile directly into a native Android APK package (`ng.coordina.app`).

---

## Option 1: Automated Cloud Build via GitHub Actions (Zero Local Setup)

The repository includes a ready-to-run GitHub Actions workflow in [`.github/workflows/build-apk.yml`](file:///C:/Users/Samuel/.gemini/antigravity/scratch/cho/.github/workflows/build-apk.yml).

1. Push your code to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "feat: setup coordina android apk build"
   git remote add origin https://github.com/your-username/coordina.git
   git push -u origin main
   ```
2. In your GitHub repository, open the **Actions** tab.
3. The **Build Android APK** workflow will automatically run on GitHub's cloud runners (with JDK 17 and Android SDK pre-installed).
4. When finished (typically 2–3 minutes), click into the run and download the generated `coordina-v1.0.0-debug.apk` directly from the **Artifacts** section!

---

## Option 2: Local Android Studio Build (On Your Computer)

### Prerequisites
1. **Java JDK 17+** ([Adoptium Temurin](https://adoptium.net/))
2. **Android Studio** ([developer.android.com/studio](https://developer.android.com/studio)) with Android SDK Platform 34 installed.

### Step-by-Step Commands

1. **Install Capacitor CLI and Android platform**:
   ```powershell
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```

2. **Compile the React app production bundle**:
   ```powershell
   npm run build
   ```

3. **Initialize the native Android project folder**:
   ```powershell
   npx cap add android
   npx cap sync android
   ```
   *(This creates the `android/` directory containing the native Java/Kotlin Android project).*

4. **Build the APK**:
   - **Via Command Line**:
     ```powershell
     cd android
     ./gradlew assembleDebug
     ```
     The compiled `.apk` will be output at:  
     `android/app/build/outputs/apk/debug/app-debug.apk`

   - **Via Android Studio GUI**:
     ```powershell
     npx cap open android
     ```
     In Android Studio, click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## Option 3: Instant Progressive Web App (PWA) on Android

COORDINA is mobile-optimized and can be installed immediately on any Android phone without an APK:
1. Open `http://localhost:5174/` (or your deployed URL) in Google Chrome on your Android device.
2. Tap the three dots menu (⋮) in Chrome.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. COORDINA installs as a standalone app with its own icon on your home screen, full-screen UI, and offline ticket caching.

