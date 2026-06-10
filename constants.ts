
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

export const HARDCODED_SHOP_ITEMS = [
        // Avatars - Budget Tier (20-50 coins) - 10 avatars
        {
            id: 'onepiece_1',
            name: 'Rookie Pirate',
            description: 'Le début de ta légende commence ici.',
            price: 20,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.03.53.jpeg'
        },
        {
            id: 'onepiece_2',
            name: 'Marine Cadet',
            description: 'Justice et honneur guident tes pas.',
            price: 25,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.04.12.jpeg'
        },
        {
            id: 'onepiece_3',
            name: 'Apprenti Navigateur',
            description: 'Trace ta route vers Grand Line.',
            price: 30,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.04.20.jpeg'
        },
        {
            id: 'onepiece_4',
            name: 'Cuisinier Débutant',
            description: 'Nourris tes rêves avec passion.',
            price: 35,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.04.33.jpeg'
        },
        {
            id: 'onepiece_5',
            name: 'Combattant Rookie',
            description: 'Forge ton style de combat unique.',
            price: 40,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.04.39.jpeg'
        },
        {
            id: 'onepiece_6',
            name: 'Artisan Apprenti',
            description: 'Crée ton futur de tes propres mains.',
            price: 45,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.04.42.jpeg'
        },
        {
            id: 'onepiece_7',
            name: 'Musicien Aspirant',
            description: 'La mélodie du savoir te guide.',
            price: 50,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.04.45.jpeg'
        },
        {
            id: 'onepiece_8',
            name: 'Médecin en Formation',
            description: 'Soigne le monde par ta science.',
            price: 50,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.04.47.jpeg'
        },
        {
            id: 'onepiece_9',
            name: 'Archéologue Novice',
            description: 'Découvre les secrets de l\'Histoire.',
            price: 50,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.04.54.jpeg'
        },
        {
            id: 'onepiece_10',
            name: 'Chasseur de Primes',
            description: 'Traque tes objectifs sans relâche.',
            price: 50,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.04.58.jpeg'
        },

        // Avatars - Standard Tier (60-100 coins) - 12 avatars
        {
            id: 'onepiece_11',
            name: 'Escrimeur Confirmé',
            description: 'La voie du sabre te révèle.',
            price: 60,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.04.59.jpeg'
        },
        {
            id: 'onepiece_12',
            name: 'Sniper Précis',
            description: 'Ta vision atteint des horizons lointains.',
            price: 65,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.00.jpeg'
        },
        {
            id: 'onepiece_13',
            name: 'Stratège Tactique',
            description: 'Planifie chaque mouvement avec génie.',
            price: 70,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.01.jpeg'
        },
        {
            id: 'onepiece_14',
            name: 'Ingénieur Créatif',
            description: 'Construis l\'impossible avec science.',
            price: 75,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.02.jpeg'
        },
        {
            id: 'onepiece_15',
            name: 'Espion Discret',
            description: 'Les secrets n\'ont pas de prise sur toi.',
            price: 80,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.04 (1).jpeg'
        },
        {
            id: 'onepiece_16',
            name: 'Combattant Agile',
            description: 'Ta vitesse surpasse toute défense.',
            price: 85,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.04.jpeg'
        },
        {
            id: 'onepiece_17',
            name: 'Capitaine Courageux',
            description: 'Mène ton équipage vers la victoire.',
            price: 90,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.06.jpeg'
        },
        {
            id: 'onepiece_18',
            name: 'Guerrier Tenace',
            description: 'Rien ne peut briser ta détermination.',
            price: 95,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.07.jpeg'
        },
        {
            id: 'onepiece_19',
            name: 'Maître Forgeron',
            description: 'Forge des armes légendaires.',
            price: 100,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.08.jpeg'
        },
        {
            id: 'onepiece_20',
            name: 'Aventurier Audacieux',
            description: 'L\'inconnu t\'appelle à chaque aube.',
            price: 100,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.14.jpeg'
        },
        {
            id: 'onepiece_21',
            name: 'Tireur d\'Élite',
            description: 'Chaque tir est une certitude.',
            price: 100,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.15.jpeg'
        },
        {
            id: 'onepiece_22',
            name: 'Navigator Expert',
            description: 'Les mers n\'ont plus de mystères.',
            price: 100,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.16 (1).jpeg'
        },

        // Avatars - Premium Tier (120-200 coins) - 12 avatars
        {
            id: 'onepiece_23',
            name: 'Commandant Marine',
            description: 'La justice absolue est ton crédo.',
            price: 120,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.16.jpeg'
        },
        {
            id: 'onepiece_24',
            name: 'Champion de Dojo',
            description: 'Les arts martiaux coulent dans tes veines.',
            price: 130,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.17.jpeg'
        },
        {
            id: 'onepiece_25',
            name: 'Noble Révolutionnaire',
            description: 'Change le monde par ta conviction.',
            price: 140,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.19 (1).jpeg'
        },
        {
            id: 'onepiece_26',
            name: 'Roi des Mers',
            description: 'Domine les océans par ta force.',
            price: 150,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.19.jpeg'
        },
        {
            id: 'onepiece_27',
            name: 'Scientifique Visionnaire',
            description: 'Repousse les limites du possible.',
            price: 160,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.21.jpeg'
        },
        {
            id: 'onepiece_28',
            name: 'Lame Légendaire',
            description: 'Ton sabre tranche l\'impossible.',
            price: 170,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.22 (1).jpeg'
        },
        {
            id: 'onepiece_29',
            name: 'Conquérant Indomptable',
            description: 'Ta volonté plie la réalité.',
            price: 180,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.22.jpeg'
        },
        {
            id: 'onepiece_30',
            name: 'Maître Stratège',
            description: 'Le champ de bataille est ton échiquier.',
            price: 190,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.23 (1).jpeg'
        },
        {
            id: 'onepiece_31',
            name: 'Héros des Opprimés',
            description: 'Protège ceux qui ne peuvent se défendre.',
            price: 200,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.23.jpeg'
        },
        {
            id: 'onepiece_32',
            name: 'Titan du Combat',
            description: 'Ta puissance est sans égale.',
            price: 200,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.24.jpeg'
        },
        {
            id: 'onepiece_33',
            name: 'Sage Millénaire',
            description: 'Ta sagesse traverse les âges.',
            price: 200,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.25.jpeg'
        },
        {
            id: 'onepiece_34',
            name: 'Gardien Immortel',
            description: 'Le temps n\'a pas de prise sur toi.',
            price: 200,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.26.jpeg'
        },

        // Avatars - Elite Tier (250-400 coins) - 10 avatars
        {
            id: 'onepiece_35',
            name: 'Vice-Amiral Suprême',
            description: 'Commande les flottes avec autorité.',
            price: 250,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.27.jpeg'
        },
        {
            id: 'onepiece_36',
            name: 'Supernova Légendaire',
            description: 'Ta renommée traverse les océans.',
            price: 280,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.28 (1).jpeg'
        },
        {
            id: 'onepiece_37',
            name: 'Empereur des Mers',
            description: 'Les Yonko te reconnaissent comme égal.',
            price: 310,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.28.jpeg'
        },
        {
            id: 'onepiece_38',
            name: 'Révolutionnaire Légendaire',
            description: 'Le monde tremble à ton passage.',
            price: 340,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.29.jpeg'
        },
        {
            id: 'onepiece_39',
            name: 'Shichibukai Redouté',
            description: 'Les gouvernements comptent sur toi.',
            price: 370,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.31 (1).jpeg'
        },
        {
            id: 'onepiece_40',
            name: 'Champion Mondial',
            description: 'Ta force est reconnue partout.',
            price: 400,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.31.jpeg'
        },
        {
            id: 'onepiece_41',
            name: 'Maître du Haki',
            description: 'Les trois types de Haki te servent.',
            price: 400,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.33.jpeg'
        },
        {
            id: 'onepiece_42',
            name: 'Porteur du Fruit Légendaire',
            description: 'Ton pouvoir défie la nature.',
            price: 400,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.34.jpeg'
        },
        {
            id: 'onepiece_43',
            name: 'Seigneur des Pirates',
            description: 'Les équipages s\'inclinent devant toi.',
            price: 400,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.36 (1).jpeg'
        },
        {
            id: 'onepiece_44',
            name: 'Amiral de la Flotte',
            description: 'La marine entière obéit à tes ordres.',
            price: 400,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.36.jpeg'
        },

        // Avatars - Legendary Tier (500-800 coins) - 6 avatars
        {
            id: 'onepiece_45',
            name: 'Descendant du Siècle Oublié',
            description: 'Le savoir interdit coule en toi.',
            price: 500,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.37 (1).jpeg'
        },
        {
            id: 'onepiece_46',
            name: 'Ancien Dieu Vivant',
            description: 'Les légendes parlent de toi.',
            price: 600,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.37.jpeg'
        },
        {
            id: 'onepiece_47',
            name: 'Porteur du Will of D',
            description: 'Le destin du monde repose sur toi.',
            price: 700,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.38.jpeg'
        },
        {
            id: 'onepiece_48',
            name: 'Roi des Dieux',
            description: 'Mary Geoise reconnaît ta suprématie.',
            price: 750,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.39.jpeg'
        },
        {
            id: 'onepiece_49',
            name: 'Dieu du Soleil',
            description: 'Illumine le monde de ta puissance.',
            price: 800,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.40.jpeg'
        },
        {
            id: 'onepiece_50',
            name: 'Dragon Céleste Rebelle',
            description: 'Défie l\'ordre mondial établi.',
            price: 800,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.42.jpeg'
        },

        // Avatars - Ultimate Tier (900-1000 coins) - 4 avatars
        {
            id: 'onepiece_51',
            name: 'Joyboy Réincarné',
            description: 'La promesse millénaire s\'accomplit.',
            price: 900,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.43 (1).jpeg'
        },
        {
            id: 'onepiece_52',
            name: 'Gear 5 Awakened',
            description: 'La liberté incarnée en puissance.',
            price: 950,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.43.jpeg'
        },
        {
            id: 'onepiece_53',
            name: 'Roi des Pirates',
            description: 'Le One Piece t\'attend au bout du voyage.',
            price: 1000,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.44.jpeg'
        },
        {
            id: 'onepiece_54',
            name: 'L\'Homme le Plus Libre',
            description: 'Personne ne peut entraver ta volonté.',
            price: 1000,
            category: 'avatar',
            image: '/assets/les avatars de one peace/WhatsApp Image 2026-01-30 at 23.05.45.jpeg'
        },
        // Badges
        {
            id: 'badge_elite',
            name: 'Badge Élite',
            description: 'Affiche ton statut d\'étudiant exceptionnel.',
            price: 300,
            category: 'badge',
            color: '#F59E0B'
        },
        {
            id: 'badge_master',
            name: 'Maître des Quiz',
            description: 'Pour ceux qui ne ratent jamais une question.',
            price: 250,
            category: 'badge',
            color: '#8B5CF6'
        },
        // Wallpapers
        {
            id: 'wall_galaxy',
            name: 'Nébuleuse lointaine',
            description: 'Un fond d\'écran spatial pour tes révisions stellaires.',
            price: 150,
            category: 'wallpaper',
            image: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2070&auto=format&fit=crop'
        },
        {
            id: 'wall_forest',
            name: 'Forêt Zen',
            description: 'Retrouve ton calme avec ce paysage apaisant.',
            price: 120,
            category: 'wallpaper',
            image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071&auto=format&fit=crop'
        },
        {
            id: 'wall_tech',
            name: 'Code Matrix',
            description: 'Plonge dans le flux des données.',
            price: 200,
            category: 'wallpaper',
            image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop'
        },
        {
            id: 'wall_sunset',
            name: 'Coucher de soleil',
            description: 'Une lueur dorée pour finir tes devoirs.',
            price: 100,
            category: 'wallpaper',
            image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop'
        }
];

