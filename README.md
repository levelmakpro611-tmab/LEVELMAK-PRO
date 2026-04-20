# 🚀 LEVELMAK - Plateforme Éducative avec IA (Vercel)

Une plateforme d'apprentissage interactive propulsée par l'intelligence artificielle, avec authentification Supabase et génération de contenu par Gemini AI.

## 🔥 Fonctionnalités

- ✅ **Authentification Supabase** (Email/Password + Google Sign-In + Téléphone)
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

### 2. Configuration Supabase

1. Créez un projet sur [Supabase](https://supabase.com/)
2. Activez **Authentication** (Email, Google)
3. Configurez les tables SQL (`profiles`, `user_activities`, `conversations`, etc.)
4. Copiez votre configuration Supabase dans `services/supabase.ts`

### 3. Configurer Row Level Security (RLS)

Déployez les politiques de sécurité (RLS) directement depuis le Dashboard Supabase ou via SQL.



### 4. API Gemini

1. Obtenez une clé API sur [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Ajoutez-la dans `.env`

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
│   │   ├── supabase.ts   # Configuration Supabase
│   │   ├── authService.ts # Authentification
│   │   └── gemini.ts     # API Gemini
│   ├── hooks/            # React hooks
│   │   └── useStore.tsx  # State management
│   ├── types/            # Types TypeScript
│   └── App.tsx           # Composant principal
└── index.html
```

## 🔐 Sécurité

- **Supabase RLS** : Les utilisateurs ne peuvent accéder qu'à leurs propres données
- **Supabase Auth** : Authentification sécurisée avec tokens JWT
- **API Keys** : Les clés API publiques sont côté client

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
- 🐘 Supabase (PostgreSQL + Auth + Storage)
- 🤖 Google Gemini AI
- ⚡ Vite
- 🎨 Tailwind CSS
