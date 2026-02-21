# 🚀 LEVELMAK - Plateforme Éducative avec IA (Vercel)

Une plateforme d'apprentissage interactive propulsée par l'intelligence artificielle, avec authentification Firebase et génération de contenu par Gemini AI.

## 🔥 Fonctionnalités

- ✅ **Authentification Firebase** (Email/Password + Google Sign-In)
- 🤖 **Génération de Quiz IA** avec Google Gemini
- 📚 **Bibliothèque Intelligente** (recherche Google Books)
- 💬 **Coach IA Personnalisé** pour l'aide aux devoirs
- 🎨 **Interface Premium Dark Glassmorphism**
- 📊 **Suiv de progression et système XP**
- 🏆 **Badges et accomplissements**

## 🛠️ Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configuration Firebase

1. Créez un projet sur [Firebase Console](https://console.firebase.google.com/)
2. Activez **Authentication** (Email/Password + Google)
3. Activez **Cloud Firestore**
4. Copiez votre configuration Firebase dans `services/firebase.ts` (déjà fait)

### 3. Configurer Firestore Rules

Déployez les règles de sécurité Firestore :

```bash
firebase deploy --only firestore:rules
```

Ou copiez le contenu de `firestore.rules` dans la console Firebase.

### 4. API Gemini

1. Obtenez une clé API sur [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Ajoutez-la dans `services/gemini.ts`

### 5. Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 📁 Structure du Projet

```
levelmak-pro/
├── src/
│   ├── components/        # Composants réutilisables
│   │   ├── Layout.tsx    # Layout principal avec sidebar
│   │   └── LevelBot.tsx  # Chat bot IA
│   ├── pages/            # Pages de l'application
│   │   ├── Auth.tsx      # Authentification
│   │   ├── Dashboard.tsx # Tableau de bord
│   │   ├── QuizGenerator.tsx
│   │   └── QuizPlayer.tsx
│   ├── services/         # Services externes
│   │   ├── firebase.ts   # Configuration Firebase
│   │   ├── authService.ts # Authentification
│   │   └── gemini.ts     # API Gemini
│   ├── hooks/            # React hooks
│   │   └── useStore.tsx  # State management
│   ├── types/            # Types TypeScript
│   └── App.tsx           # Composant principal
├── firestore.rules       # Règles de sécurité Firestore
└── index.html
```

## 🔐 Sécurité

- **Firestore Rules** : Les utilisateurs ne peuvent accéder qu'à leurs propres données
- **Firebase Auth** : Authentification sécurisée avec tokens JWT
- **API Keys** : Les clés API sont côté client (normal pour Firebase)

## 🎨 Design System

- **Couleurs** : 
  - Primary: `#3B82F6` (Bleu)
  - Secondary: `#8B5CF6` (Violet)
  - Accent: `#F59E0B` (Or)
  - Background: `#0F172A` (Slate foncé)

- **Fonts** :
  - Display: Plus Jakarta Sans
  - Body: Inter

- **Effets** : Glassmorphism, Blur, Gradients, Animations fluides

## 📱 Fonctionnalités à venir

- [ ] Mode hors-ligne avec PWA
- [ ] Atelier d'écriture collaboratif
- [ ] Réseau social éducatif
- [ ] Export PDF des quiz
- [ ] Statistiques avancées

## 🤝 Contribution

Ce projet est en développement actif. N'hésitez pas à proposer des améliorations !

## 📄 Licence

MIT License - Créé avec ❤️ pour l'éducation

---

**Powered by:**
- ⚛️ React + TypeScript
- 🔥 Firebase (Auth + Firestore)
- 🤖 Google Gemini AI
- ⚡ Vite
- 🎨 Tailwind CSS
