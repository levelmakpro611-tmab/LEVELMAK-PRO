# Manuel Technique de Maintenance - LevelMak Pro

Ce manuel détaille tout ce qu'il faut savoir sur la construction de l'application, comme si tu l'avais codée toi-même.

## 1. Pile Technologique (Tech Stack)
L'application est construite avec des outils modernes et performants :
- **Langage** : TypeScript (pour éviter les erreurs de code).
- **Frontend** : **React** avec le moteur de build **Vite** (très rapide).
- **Style** : **Tailwind CSS** (pour un design moderne et responsive).
- **Backend/Base de données** : **Firebase** (Firestore pour les données, Auth pour les utilisateurs).
- **Mobile** : **Capacitor** (permet de transformer le site web en application Android/iOS).
- **Intelligence Artificielle** : **Google Gemini API** (Modèle 1.5 Flash).
## 2. Architecture et Structure des Dossiers
Voici comment naviguer dans ton code :
- `src/components/` : Contient les éléments visuels réutilisables (Boutons, Modales, LevelBot).
- `src/pages/` : Les pages principales (Dashboard, Bibliothèque, Ranking).
- `src/services/` : Le "cerveau" de l'app. C'est ici que se trouvent les appels à l'IA (`gemini.ts`), à la base de données (`firebase.ts`), et à la gestion du cache (`cache.ts`).
- `src/hooks/` : Contient `useStore.tsx`, le fichier le plus important pour gérer l'état de l'application (XP, Coins, données utilisateur).

---

## 3. Les Services Clés

### A. L'IA (gemini.ts)
C'est le module le plus complexe. Il gère :
- **Le Coach IA** : Un système interactif avec mémoire (historique des messages) et mode "Inférence" pour comprendre les questions courtes.
- **La Planification IA** : Analyse les sujets et génère un calendrier JSON structuré.
- **La Bibliothèque** : Recherche des livres et génère des résumés.

### B. Gestion de l'État (useStore.tsx)
Nous utilisons **Zustand**. C'est ce qui permet de mettre à jour ton solde de LevelCoins instantanément partout dans l'application sans recharger la page.

### C. Synchronisation Quotidienne (cache.ts)
Pour que tout le monde ait le même "Mot du Jour", nous utilisons un système de cache global stocké dans Firestore. L'app vérifie chaque jour si une nouvelle donnée doit être générée.


## 4. Design et Esthétique
Le design repose sur un concept de **"Glassmorphism"** :
- **Transparence** : Utilisation de `backdrop-blur` (effet de verre).
- **Couleurs** : Dégradés allant du Violet (`primary`) au Bleu (`secondary`).
- **Responsive** : L'interface s'adapte automatiquement entre un écran d'ordinateur et un téléphone grâce aux classes `md:` (ex: `w-full md:w-1/2`).

## 5. Comment la maintenir ?

### Pour modifier le comportement de l'IA :
Ouvre `src/services/gemini.ts` et modifie les `systemInstruction`. C'est là que tu donnes ses "ordres" au bot.

### Pour changer les prix de la boutique :
Cela se gère dans Firestore (collection `shopItems`) ou directement dans le composant `Shop.tsx`.

### Pour compiler l'application mobile :
Utilise les commandes :
1. `npm run build` (pour créer les fichiers web).
2. `npx cap sync android` (pour envoyer les fichiers vers Android Studio).


> [!TIP]
> **Le secret de cette app** : Tout est basé sur le **JSON**. L'IA communique avec ton code via des objets structurés `{ "key": "value" }`. Si tu veux ajouter une fonctionnalité, demande toujours à l'IA de te répondre sous forme de JSON pour qu'elle puisse être intégrée facilement à l'interface.
