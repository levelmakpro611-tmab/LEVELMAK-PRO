# LEVELMAK Mobile - Guide de Build et Distribution

## 🚀 Quick Start

### Développement Local

```bash
# 1. Build du projet React
npm run build

# 2. Sync avec plateformes natives
npm run sync

# 3. Ouvrir Android Studio
npm run open:android

# 4. Ouvrir Xcode (macOS uniquement)
npm run open:ios
```

### Run on Device/Emulator

```bash
# Android (build + run)
npm run run:android

# iOS (build + run, macOS uniquement)
npm run run:ios
```

---

## 📱 Structure du Projet Mobile

```
levelmak-pro/
├── android/              # Projet Android natif
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/   # Web assets (dist/)
│   │   │   ├── java/     # Code Java natif
│   │   │   └── res/      # Ressources Android
│   │   └── build.gradle
│   └── gradle/
├── ios/                  # Projet iOS natif  
│   ├── App/
│   │   ├── App.xcworkspace
│   │   ├── Assets.xcassets
│   │   └── Info.plist
│   └── Podfile
├── resources/            # Assets sources (icônes, splash)
├── services/
│   ├── nativeAdapters.ts  # Haptics, StatusBar, Platform
│   ├── storage.ts         # Capacitor Preferences wrapper
│   └── fileSystem.ts      # File caching system
└── capacitor.config.ts   # Configuration Capacitor
```

---

## 🔧 Configuration des Plateformes

### Android

#### Prérequis
- **Android Studio** (dernière version)
- **JDK 17+**
- **Android SDK** (API 24+) 

#### Configuration du Build

1. **Ouvrir le projet Android**
   ```bash
   npm run open:android
   ```

2. **Configurer le Keystore pour Release**
   
   Créer `android/keystore.properties`:
   ```properties
   storeFile=levelmak-release.keystore
   storePassword=YOUR_STORE_PASSWORD
   keyAlias=levelmak
   keyPassword=YOUR_KEY_PASSWORD
   ```

3. **Générer le Keystore**
   ```bash
   keytool -genkey -v -keystore android/keystore/levelmak-release.keystore -alias levelmak -keyalg RSA -keysize 2048 -validity 10000
   ```

4. **Build Release APK**
   - Dans Android Studio : **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Fichier généré : `android/app/build/outputs/apk/release/app-release.apk`

5. **Build Release AAB (Google Play Store)**
   - Dans Android Studio : **Build → Generate Signed Bundle / APK → Android App Bundle**
   - Fichier généré : `android/app/build/outputs/bundle/release/app-release.aab`

#### Permissions configurées
- `INTERNET` : Accès réseau (API Gemini, Firebase)
- `ACCESS_NETWORK_STATE` : Vérification connectivité
- `CAMERA` : Profil photo (si activé)
- `WRITE_EXTERNAL_STORAGE` : Cache PDF
- `VIBRATE` : Haptic feedback

---

### iOS

#### Prérequis
- **macOS** (obligatoire)
- **Xcode 15+**
- **CocoaPods** (`sudo gem install cocoapods`)
- **Apple Developer Account** (pour distribution)

#### Configuration du Build

1. **Ouvrir le projet iOS**
   ```bash
   npm run open:ios
   ```

2. **Configurer Signing & Capabilities**
   - Sélectionner target `App`
   - Onglet **Signing & Capabilities**
   - Choisir votre Team (Apple Developer Account)
   - Bundle Identifier : `com.levelmak.app`

3. **Build for Testing (Simulator)**
   - Sélectionner un simulateur iOS (iPhone 15, iOS 17+)
   - Cliquer sur **Play** ou `Cmd+R`

4. **Build for Release (Device)**
   - Sélectionner **Any iOS Device (arm64)**
   - **Product → Archive**
   - **Distribute App → App Store Connect** ou **Ad Hoc**

#### Capabilities configurées
- Background Modes : Remote notifications
- Push Notifications

---

## 🎨 Personnalisation des Assets

### Icône d'App

**Format requis** : 1024x1024 PNG avec transparence

1. Placer `icon.png` dans `/resources/`
2. Générer toutes les tailles :
   ```bash
   npx cap-assets generate --iconSource resources/icon.png
   ```

### Splash Screen

**Format requis** : 2732x2732 PNG

1. Placer `splash.png` dans `/resources/`
2. Générer assets :
   ```bash
   npx cap-assets generate --splashSource resources/splash.png
   ```

---

## 🔍 Tests et Débogage

### Android

**Chrome DevTools** :
1. Activer le débogage USB sur l'appareil
2. Ouvrir Chrome : `chrome://inspect`
3. Sélectionner LEVELMAK pour inspecter

**Logs Android Studio** :
- **Logcat** : Filtrer par package `com.levelmak.app`

### iOS

**Safari Web Inspector** :
1. Sur iPhone : **Réglages → Safari → Avancé → Inspecteur Web**
2. Sur Mac Safari : **Développement → [iPhone] → LEVELMAK**

**Xcode Console** :
- **View → Debug Area → Activate Console**

---

## 📦 Distribution

### Google Play Store

1. **Créer un compte Google Play Console** ($25 unique)
2. **Créer une nouvelle app**
   - Nom : LEVELMAK
   - Langue par défaut : Français
   - Type : Application

3. **Upload AAB**
   - **Production → Créer une version**
   - Upload `app-release.aab`
   - Notes de version

4. **Store Listing**
   - Description courte (80 caractères max)
   - Description complète
   - Screenshots (JPG/PNG 16:9):
     - Phone : 2-8 screenshots
     - Tablet : 2-8 screenshots

5. **Classification du contenu**
   - Éducation
   - Tous âges

6. **Soumettre pour révision** (1-7 jours)

---

### Apple App Store

1. **Créer App Store Connect** (99$/année)
2. **Créer une nouvelle app**
   - Bundle ID : `com.levelmak.app`
   - SKU : `LEVELMAK001`

3. **Build Upload**
   - Xcode → **Product → Archive**
   - **Distribute App → App Store Connect**
   - Validation automatique

4. **App Store Page**
   - Screenshots (JPG/PNG):
     - iPhone 6.7" : 3-10 screenshots
     - iPad Pro 12.9" : 3-10 screenshots
   - App Preview (vidéo optionnelle)
   - Description (4000 caractères max)
   - Mots-clés (100 caractères max)
   - Catégorie : Éducation

5. **Confidentialité**
   - URL politique de confidentialité
   - Permissions utilisées

6. **Soumettre pour révision** (24-48h)

---

## 🌟 Fonctionnalités Natives Intégrées

### ✅ Haptic Feedback
- Navigation : Vibration légère
- Sélection : Impact medium
- Succès/Erreur : Notifications
- Level Up : Séquence spéciale

### ✅ Status Bar
- Style adaptatif (dark theme)
- Background personnalisé
- Overlay transparent

### ✅ Splash Screen
- Auto-hide après 2s
- Transition fluide
- Background premium

### ✅ Stockage Natif
- Capacitor Preferences (chiffré)
- Fallback localStorage (web)
- Migration automatique

### ✅ File System
- Cache PDF local
- Mode offline pour livres
- Gestion automatique cache

---

## 🐛 Troubleshooting

### Build Errors

**Android Gradle Sync Failed**
```bash
cd android
./gradlew clean
cd ..
npm run sync
```

**iOS Pod Install Failed**
```bash
cd ios/App
pod deintegrate
pod install
```

### Runtime Errors

**White Screen on Launch**
- Vérifier console : Erreur JS
- Vérifier `dist/` existe et contient index.html
- Rebuild : `npm run build:mobile`

**Plugins not working**
```bash
npx cap sync
```

---

## 📊 Performance

### Métriques Actuelles
- **Build time** : ~31s
- **Sync time** : ~4.5s
- **Bundle size** : 1.67 MB JS + 6.16 KB CSS
- **Plugins** : 7 actifs

### Optimisations Recommandées
- Code splitting (reduce main bundle)
- Lazy loading routes
- Image compression (WebP)
- Tree shaking

---

## 🎯 Next Steps

### Fonctionnalités à Ajouter
- [ ] Push Notifications (Firebase Cloud Messaging)
- [ ] Pull-to-Refresh
- [ ] Swipe Gestures (Flashcards)
- [ ] Share API (partage quiz/livres)
- [ ] Camera API (photo profil native)
- [ ] Deep Links (navigation externe)

### Améliorations
- [ ] Optimiser bundle size (<1 MB)
- [ ] Add App Shortcuts (Android)
- [ ] Add Quick Actions (iOS)
- [ ] Dark/Light icon theme
- [ ] Localization (EN, ES)

---

## 📞 Support

Si besoin d'aide sur la transformation mobile, référence :
- **Capacitor Docs** : https://capacitorjs.com/docs
- **Android Developer** : https://developer.android.com
- **Apple Developer** : https://developer.apple.com

---

**LEVELMAK Mobile** est maintenant une application native complète, prête pour Android et iOS ! 🚀📱
