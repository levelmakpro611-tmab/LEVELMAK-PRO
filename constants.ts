
export const XP_PER_LEVEL = 1000; // Base XP for level 1

export const getXpForNextLevel = (level: number) => {
  // Formula for how much XP is needed to complete the current level
  // Level 1: 1200
  // Level 2: 2400
  return Math.floor(level * 1000 * 1.2);
};

export const getTotalXpAtLevel = (level: number) => {
  // Sum of all XP needed for all levels up to this one
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXpForNextLevel(i);
  }
  return total;
};

export const AVATAR_LEVELS = [
  { level: 1, name: 'Débutant', minXp: 0, color: '#3B82F6' },
  { level: 2, name: 'Apprenant', minXp: 500, color: '#10B981' },
  { level: 3, name: 'Savant', minXp: 1500, color: '#8B5CF6' },
  { level: 4, name: 'Expert', minXp: 4000, color: '#F59E0B' },
  { level: 5, name: 'Maître du Savoir', minXp: 10000, color: '#EF4444' },
];

export const LEAGUES = [
  { id: 'bronze', name: 'Ligue Bronze', minXp: 0, color: '#CD7F32', icon: '🥉' },
  { id: 'silver', name: 'Ligue Argent', minXp: 5000, color: '#C0C0C0', icon: '🥈' },
  { id: 'gold', name: 'Ligue Or', minXp: 15000, color: '#FFD700', icon: '🥇' },
  { id: 'diamond', name: 'Ligue Diamant', minXp: 50000, color: '#B9F2FF', icon: '💎' },
  { id: 'master', name: 'Ligue Master', minXp: 100000, color: '#EF4444', icon: '🔥' },
];

export const getLeagueFromXp = (xp: number) => {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (xp >= LEAGUES[i].minXp) {
      return LEAGUES[i].id;
    }
  }
  return LEAGUES[0].id;
};

export const SUBJECTS = [
  'Mathématiques',
  'Physique-Chimie',
  'SVT',
  'Français',
  'Histoire-Géo',
  'Anglais',
  'Philosophie',
  'Informatique'
];

export const BADGES = [
  { id: 'first_quiz', name: 'Premier Pas', icon: '🎯', description: 'Compléter votre premier quiz' },
  { id: 'quiz_master', name: 'Maître des Quiz', icon: '🏆', description: 'Compléter 50 quiz' },
  { id: 'reading_owl', name: 'Chouette de Bibliothèque', icon: '🦉', description: 'Lire 10 livres' },
  { id: 'word_smith', name: 'Plume d\'Or', icon: '✒️', description: 'Écrire 5 histoires' },
  { id: 'streak_7', name: 'Régularité', icon: '🔥', description: 'Connexion 7 jours de suite' },
];

export const POTIONS = [
  {
    id: 'potion_double_xp',
    name: 'Potion de Double XP',
    description: 'Double tes gains d\'XP pendant 5 minutes.',
    price: 150,
    color: '#8B5CF6',
    icon: 'Zap',
    image: '/assets/fiole magique/WhatsApp Image 2026-02-10 at 02.26.05 (1).jpeg',
    duration: 5 * 60 * 1000 // 5 minutes in ms
  },
  {
    id: 'potion_shield',
    name: 'Bouclier de Quiz',
    description: 'Pardonne une mauvaise réponse lors d\'un quiz.',
    price: 100,
    color: '#3B82F6',
    icon: 'Shield',
    image: '/assets/fiole magique/WhatsApp Image 2026-02-10 at 02.26.02.jpeg',
    category: 'quiz'
  },
  {
    id: 'potion_skip',
    name: 'Fiole de Sauvetage',
    description: 'Permet de passer une question de quiz sans répondre.',
    price: 120,
    color: '#10B981',
    icon: 'SkipForward',
    image: '/assets/fiole magique/WhatsApp Image 2026-02-10 at 02.26.03.jpeg',
    category: 'quiz'
  },
  {
    id: 'potion_inspiration',
    name: 'Essence d\'Inspiration',
    description: 'Donne une idée de roman unique via l\'IA.',
    price: 80,
    color: '#F59E0B',
    icon: 'Sparkles',
    image: '/assets/fiole magique/WhatsApp Image 2026-02-10 at 02.26.07.jpeg',
    category: 'writing'
  },
  {
    id: 'potion_mystery',
    name: 'Fiole Mystère',
    description: 'Débloque un avatar au hasard dans la boutique.',
    price: 300,
    color: '#EC4899',
    icon: 'Gift',
    image: '/assets/fiole magique/WhatsApp Image 2026-02-10 at 02.33.14.jpeg',
    category: 'meta'
  },
  {
    id: 'potion_fortune',
    name: 'Élixir de Fortune',
    description: 'Augmente les gains de LevelCoins pendant 10 minutes.',
    price: 200,
    color: '#FFD700',
    icon: 'Coins',
    image: '/assets/fiole magique/WhatsApp Image 2026-02-10 at 02.26.04.jpeg',
    duration: 10 * 60 * 1000 // 10 minutes in ms
  },
  {
    id: 'water_can',
    name: 'Bidon d\'Eau',
    description: 'Permet d\'arroser tes plantes pour les garder en bonne santé et les faire grandir.',
    price: 30,
    color: '#3B82F6',
    icon: 'Droplets',
    image: '/assets/garden/water_can.png',
    category: 'garden'
  },
  {
    id: 'fertilizer',
    name: 'Engrais Magique',
    description: 'Accélère instantanément la croissance d\'une plante.',
    price: 75,
    color: '#10B981',
    icon: 'Sparkles',
    image: '/assets/garden/fertilizer.png',
    category: 'garden'
  }
];
