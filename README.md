LEVELMAK PRO - Plateforme Éducative Gaming & IA

LEVELMAK PRO est une plateforme d'apprentissage immersive de niveau production, combinant la puissance de l'Intelligence Artificielle (Google Gemini) et des mécaniques de gamification avancées (leagues, boutique d'avatars, Mind Garden) pour offrir une expérience éducative stimulante.

L'application est construite avec **React 19 + TypeScript + Vite + TailwindCSS**, interfacée avec **Supabase** pour le backend, et optimisée pour le déploiement mobile via **Capacitor**.

---

 🎨 Fonctionnalités Principales

 🤖 Intelligence Artificielle & Apprentissage
*   **AILab (Atelier Feynman & Personnages Historiques)** : Entretien interactif basé sur la technique de Feynman pour tester sa compréhension d'un sujet, ou dialogue immersif avec des personnages historiques réels.
*   **Générateur de Quiz IA** : Création instantanée de quiz personnalisés sur n'importe quel sujet et niveau scolaire à l'aide de Gemini AI.
*   **Coach Éducatif Virtuel** : Module de chat d'accompagnement et d'aide aux devoirs.

### 🎮 Gamification & Engagement
*   **Mind Garden** : Un jardin virtuel gamifié où chaque utilisateur peut planter et arroser des arbres ou des fleurs en fonction de son activité d'étude et des points XP accumulés.
*   **Ligues & Leaderboard** : Système compétitif de ligues (Bronze, Silver, Gold, Diamond, Master) avec calcul automatique des rangs selon l'XP hebdomadaire.
*   **Boutique d'Avatars & Consommables** : Achat d'accessoires, auras, potions de boost d'XP et badges avec la monnaie virtuelle *LevelCoins*.
*   **Système SRS (Spaced Repetition System)** : Module de Flashcards utilisant une planification de révision intelligente.

### 👥 Communauté & Social
*   **Flux Communautaire (Feed)** : Publication de statuts, partage de succès (badges, scores) et commentaires interactifs.
*   **Carte Interactive** : Visualisation en temps réel des autres utilisateurs actifs à proximité grâce à la géolocalisation sécurisée.
*   **Collaborative Doodle** : Espace de dessin collaboratif et interactif.
*   **TutorHub** : Espace d'inscription, de validation et de mise en relation entre tuteurs et étudiants.

---

## 📁 Architecture des Fichiers

```
levelmak-pro/
├── src/
│   ├── components/        # Composants réutilisables (Layout, LevelBot, MindGarden...)
│   ├── pages/            # Écrans principaux (Dashboard, Auth, AILab, Shop, Community...)
│   ├── services/         # Interactions API & Backend
│   │   ├── supabase.ts   # Configuration et initialisation du client
│   │   ├── authService.ts# Authentification & mapping utilisateur
│   │   ├── aiService.ts  # Génération IA avec Gemini (prompts externes)
│   │   ├── aiPrompts.ts  # Centralisation de tous les prompts système IA
│   │   ├── contentService.ts # Persistance des quiz/stories/decks personnalisés
│   │   └── syncService.ts# Synchronisation bidirectionnelle Cache <-> Cloud
│   ├── hooks/            # Hooks personnalisés et gestion d'état
│   │   ├── store/        # Zustand Slices (useAuthStore, useContentStore, useUIStore...)
│   │   └── useStore.tsx  # Store unifié global
│   ├── utils/            # Utilitaires système (chiffrement, mathématiques)
│   │   └── crypto.ts     # Algorithme de chiffrement synchrone pour localStorage
│   ├── types.ts          # Définitions des types TypeScript globaux
│   ├── App.tsx           # Composant racine et routage applicatif
│   └── index.tsx         # Point d'entrée de l'application (avec monkeypatching de sécurité)
```

---

## 🔐 Sécurité & Chiffrement

1.  **Vérification Admin Renforcée (Database-Driven)** : La vérification admin est liée à la colonne `role` dans Supabase, protégée par des politiques de Row Level Security (RLS) empêchant toute falsification ou élévation de privilèges client.
2.  **Chiffrement transparent du LocalStorage** : Pour protéger la vie privée des utilisateurs sur le Web et le Mobile (Capacitor), les clés et valeurs contenant des données personnelles (`levelmak_user`, `admin_`, `support_`) sont chiffrées de manière transparente au vol grâce à un chiffrement XOR + Base64 dynamique.

---

## 💾 Schéma de Base de Données (Supabase)

L'architecture s'appuie sur les tables principales suivantes :

*   **`profiles`** : Informations de base de l'utilisateur (xp, level_coins, badges, inventory, role `student | teacher | admin`, avatar_config).
*   **`user_quizzes`** : Stockage des quiz personnalisés créés par les utilisateurs (questions en format `JSONB`).
*   **`user_stories`** : Histoires créées via le module Creative Writing.
*   **`user_flashcard_decks`** & **`user_flashcards`** : Decks personnalisés et planification SRS de chaque carte.
*   **`shop_items`** : Catalogue dynamique des articles de la boutique.

Les scripts SQL pour initialiser ces tables et leurs politiques RLS correspondantes se trouvent dans [supabase/migrations/](file:///c:/Users/DELL/Desktop/levelmak-pro/supabase/migrations).

---

## 🛠️ Installation & Démarrage

### 1. Cloner et installer les dépendances
```bash
npm install
```

### 2. Variables d'Environnement (`.env`)
Créez un fichier `.env` à la racine :
```env
VITE_SUPABASE_URL=https://<votre-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<votre-clé-anon>
VITE_OPENROUTER_API_KEY=<clé-api-openrouter-gemini>
```

### 3. Lancer en local
```bash
npm run dev
```

### 4. Build pour la Production
```bash
npm run build
```

---

## 📱 Développement Mobile (Capacitor)

*   **Build & Synchronisation** : `npm run build:mobile`
*   **Lancer sur Android** : `npm run run:android`
*   **Lancer sur iOS** : `npm run run:ios`
