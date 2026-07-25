
export const XP_PER_LEVEL = 1000; // Base XP for level 1

export const getXpForNextLevel = (level: number) => {
  // 100 XP needed per level
  return 100;
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
        {
            id: 'new_avatar_1',
            name: 'Apprenti Curieux',
            description: 'Un compagnon félin curieux de tout apprendre.',
            price: 200,
            category: 'avatar',
            image: '/assets/avatars_shop/-5792189133450492382_121.jpg'
        },
        {
            id: 'new_avatar_2',
            name: 'Écolier Modèle',
            description: 'Toujours attentif et exemplaire en classe.',
            price: 200,
            category: 'avatar',
            image: '/assets/avatars_shop/-5792189133450492383_121.jpg'
        },

        {
            id: 'new_avatar_4',
            name: 'Calculateur Rapide',
            description: 'Résout les équations plus vite que son ombre.',
            price: 200,
            category: 'avatar',
            image: '/assets/avatars_shop/-5848414473013017593_121.jpg'
        },
        {
            id: 'new_avatar_5',
            name: 'Jeune Chercheur',
            description: 'Toujours en quête de nouvelles vérités scientifiques.',
            price: 200,
            category: 'avatar',
            image: '/assets/avatars_shop/-5848414473013017596_121.jpg'
        },
        {
            id: 'new_avatar_6',
            name: 'Observateur Attentif',
            description: 'Il observe les détails pour ne rater aucun piège.',
            price: 200,
            category: 'avatar',
            image: '/assets/avatars_shop/-5848414473013017598_121.jpg'
        },
        {
            id: 'new_avatar_7',
            name: 'Pionnier du Savoir',
            description: 'Il ouvre la voie à de nouvelles méthodes d\'étude.',
            price: 200,
            category: 'avatar',
            image: '/assets/avatars_shop/-5848414473013017600_121.jpg'
        },
        {
            id: 'new_avatar_8',
            name: 'Explorateur Scolaire',
            description: 'Prêt à parcourir tous les sujets de l\'application.',
            price: 200,
            category: 'avatar',
            image: '/assets/avatars_shop/-5848414473013017601_121.jpg'
        },
        {
            id: 'new_avatar_9',
            name: 'Esprit Vif',
            description: 'Un esprit agile capable de s\'adapter à toutes les matières.',
            price: 200,
            category: 'avatar',
            image: '/assets/avatars_shop/-5875119394248574589_121.jpg'
        },
        {
            id: 'new_avatar_10',
            name: 'Esprit Libre',
            description: 'Il étudie selon ses propres règles et progresse vite.',
            price: 200,
            category: 'avatar',
            image: '/assets/avatars_shop/-5875119394248574590_121.jpg'
        },
        {
            id: 'new_avatar_11',
            name: 'Bachelier Brillant',
            description: 'Fier titulaire d\'un bagage académique impressionnant.',
            price: 250,
            category: 'avatar',
            image: '/assets/avatars_shop/-5890708609409595895_121.jpg'
        },
        {
            id: 'new_avatar_12',
            name: 'Major de Promo',
            description: 'Celui qui trône fièrement en tête de sa promotion.',
            price: 260,
            category: 'avatar',
            image: '/assets/avatars_shop/-6050874176169950458_121.jpg'
        },
        {
            id: 'new_avatar_13',
            name: 'Philosophe Junior',
            description: 'Penseur profond qui questionne chaque réponse.',
            price: 260,
            category: 'avatar',
            image: '/assets/avatars_shop/-6050874176169950459_121.jpg'
        },
        {
            id: 'new_avatar_14',
            name: 'Polyglotte Passionné',
            description: 'Parle plusieurs langues et adore la grammaire.',
            price: 270,
            category: 'avatar',
            image: '/assets/avatars_shop/-6050874176169950460_121.jpg'
        },
        {
            id: 'new_avatar_15',
            name: 'Féru d\'Histoire',
            description: 'Il connaît les dates historiques sur le bout des doigts.',
            price: 270,
            category: 'avatar',
            image: '/assets/avatars_shop/-6050874176169950461_121.jpg'
        },
        {
            id: 'new_avatar_16',
            name: 'Codeur Agile',
            description: 'Transforme la logique pure en lignes de code fonctionnelles.',
            price: 280,
            category: 'avatar',
            image: '/assets/avatars_shop/-6050874176169950462_121.jpg'
        },
        {
            id: 'new_avatar_17',
            name: 'Chimiste en Herbe',
            description: 'Adore mélanger les formules et les savoirs complexes.',
            price: 280,
            category: 'avatar',
            image: '/assets/avatars_shop/-6050874176169950463_121.jpg'
        },
        {
            id: 'new_avatar_18',
            name: 'Algorithmicien',
            description: 'Rien ne lui plaît plus qu\'un algorithme bien structuré.',
            price: 290,
            category: 'avatar',
            image: '/assets/avatars_shop/-6050874176169950466_121.jpg'
        },
        {
            id: 'new_avatar_19',
            name: 'Astrophysicien Junior',
            description: 'Il a la tête dans les étoiles et le cœur dans les livres.',
            price: 290,
            category: 'avatar',
            image: '/assets/avatars_shop/-6050874176169950467_121.jpg'
        },
        {
            id: 'new_avatar_20',
            name: 'Mathématicien en Devenir',
            description: 'Voit le monde à travers les théorèmes et les formules.',
            price: 300,
            category: 'avatar',
            image: '/assets/avatars_shop/-6050874176169950468_121.jpg'
        },
        {
            id: 'new_avatar_21',
            name: 'Cerveau d\'Or',
            description: 'Un intellect brillant qui brille dans le classement général.',
            price: 350,
            category: 'avatar',
            image: '/assets/avatars_shop/1000104001.png'
        },
        {
            id: 'new_avatar_22',
            name: 'Maître de Conférences',
            description: 'Partage sa sagesse et guide ses camarades d\'étude.',
            price: 400,
            category: 'avatar',
            image: '/assets/avatars_shop/avatar_28.jpg'
        },
        {
            id: 'new_avatar_23',
            name: 'Lauréat Académique',
            description: 'Récompensé pour ses performances académiques exceptionnelles.',
            price: 440,
            category: 'avatar',
            image: '/assets/avatars_shop/avatar_33.jpg'
        },
        {
            id: 'new_avatar_24',
            name: 'Prodige des Sciences',
            description: 'Un jeune talent dont les capacités fascinent son entourage.',
            price: 490,
            category: 'avatar',
            image: '/assets/avatars_shop/avatar_36.jpg'
        },
        {
            id: 'new_avatar_25',
            name: 'Nobel en Puissance',
            description: 'Son assiduité pourrait bien lui valoir un prix international.',
            price: 540,
            category: 'avatar',
            image: '/assets/avatars_shop/avatar_38.jpg'
        },
        {
            id: 'new_avatar_26',
            name: 'Académicien Sage',
            description: 'Membre estimé de la haute société du savoir.',
            price: 580,
            category: 'avatar',
            image: '/assets/avatars_shop/avatar_43.jpg'
        },
        {
            id: 'new_avatar_27',
            name: 'Savant Audacieux',
            description: 'Ses théories bousculent les idées reçues.',
            price: 630,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127551860864949.jpg'
        },
        {
            id: 'new_avatar_28',
            name: 'Esprit Encyclopédique',
            description: 'Mémoire photographique et soif inextinguible de culture.',
            price: 680,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127552773607047.jpg'
        },
        {
            id: 'new_avatar_29',
            name: 'Penseur Libre',
            description: 'Indépendant et rigoureux dans ses analyses.',
            price: 720,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127552952997302.jpg'
        },
        {
            id: 'new_avatar_30',
            name: 'Génie Flamboyant',
            description: 'Une intelligence étincelante qui illumine la ligue.',
            price: 770,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127890621523256.jpg'
        },
        {
            id: 'new_avatar_31',
            name: 'Stratège des Quiz',
            description: 'Il a réponse à tout, particulièrement sous pression.',
            price: 810,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127893893895981.jpg'
        },
        {
            id: 'new_avatar_32',
            name: 'Guide de l\'Élite',
            description: 'Il montre le chemin de la réussite aux autres apprenants.',
            price: 860,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127894054003681.jpg'
        },
        {
            id: 'new_avatar_33',
            name: 'Mentor Lumineux',
            description: 'Sa clarté d\'esprit éclaire les concepts les plus obscurs.',
            price: 910,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127895288365274.jpg'
        },
        {
            id: 'new_avatar_34',
            name: 'Héros Académique',
            description: 'Il surmonte toutes les difficultés scolaires avec bravoure.',
            price: 950,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127900336464599.jpg'
        },
        {
            id: 'new_avatar_35',
            name: 'Docteur Honoris Causa',
            description: 'Une distinction honorifique pour ses contributions exceptionnelles.',
            price: 1000,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127900486638603.jpg'
        },
        {
            id: 'new_avatar_36',
            name: 'Doyen d\'Exception',
            description: 'Un pilier d\'expérience et de sagesse académique.',
            price: 1100,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127900552890878.jpg'
        },
        {
            id: 'new_avatar_37',
            name: 'Grand Chancelier',
            description: 'Il veille au respect des normes d\'excellence intellectuelle.',
            price: 1300,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127900598036734.jpg'
        },
        {
            id: 'new_avatar_38',
            name: 'Phénix de l\'Élite',
            description: 'Il renaît toujours plus fort après chaque erreur.',
            price: 1500,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127908261890232.jpg'
        },
        {
            id: 'new_avatar_39',
            name: 'Oracle du Savoir',
            description: 'Il anticipe les questions et maîtrise tous les sujets.',
            price: 1750,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127908536965226.jpg'
        },
        {
            id: 'new_avatar_40',
            name: 'Sagesse Éternelle',
            description: 'La somme de toutes les connaissances acquises au fil du temps.',
            price: 1950,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17127908756665390.jpg'
        },
        {
            id: 'new_avatar_41',
            name: 'Génie Inspiré',
            description: 'Il trouve des solutions là où d\'autres voient des impasses.',
            price: 2150,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17130292446534572-1.jpg'
        },
        {
            id: 'new_avatar_42',
            name: 'Maître Suprême',
            description: 'Au sommet de la hiérarchie des étudiants de LEVELMAK.',
            price: 2350,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17130292531605757-1.jpg'
        },
        {
            id: 'new_avatar_43',
            name: 'Esprit Universel',
            description: 'Un savoir global qui transcende les matières classiques.',
            price: 2600,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17130292928222418-1.jpg'
        },
        {
            id: 'new_avatar_44',
            name: 'Divinité Scolaire',
            description: 'Une compréhension si vaste qu\'elle frôle le mystique.',
            price: 2800,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17130293010839735-1.jpg'
        },
        {
            id: 'new_avatar_45',
            name: 'Ultime Champion',
            description: 'Le grand vainqueur de tous les duels intellectuels.',
            price: 3000,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17130293237014158-1.jpg'
        },
        {
            id: 'new_avatar_46',
            name: 'Légende du Campus',
            description: 'Son nom est gravé dans l\'histoire de la communauté.',
            price: 3200,
            category: 'avatar',
            image: '/assets/avatars_shop/FB_IMG_17130293333823761.jpg'
        },
        {
            id: 'new_avatar_47',
            name: 'Empereur Académique',
            description: 'Souverain absolu sur le royaume de la connaissance.',
            price: 3400,
            category: 'avatar',
            image: '/assets/avatars_shop/IMG_1372.JPG.jpg'
        },
        {
            id: 'new_avatar_48',
            name: 'Gardien du Temple',
            description: 'Il protège et conserve le patrimoine culturel de l\'humanité.',
            price: 3600,
            category: 'avatar',
            image: '/assets/avatars_shop/real_1.jpg'
        },
        {
            id: 'new_avatar_49',
            name: 'Vanguard Académique',
            description: 'Toujours à la pointe de l\'innovation et de l\'apprentissage.',
            price: 3800,
            category: 'avatar',
            image: '/assets/avatars_shop/real_2.jpg'
        },
        {
            id: 'new_avatar_50',
            name: 'Archimède Moderne',
            description: 'Donnez-lui un point d\'appui et il soulèvera le classement.',
            price: 4000,
            category: 'avatar',
            image: '/assets/avatars_shop/real_3.jpg'
        },
        {
            id: 'new_avatar_51',
            name: 'Galilée Inspiré',
            description: 'Il observe le monde pour en décrypter les lois célestes.',
            price: 4200,
            category: 'avatar',
            image: '/assets/avatars_shop/real_4.jpg'
        },
        {
            id: 'new_avatar_52',
            name: 'Socrate du Web',
            description: 'Une sagesse basée sur le dialogue et le questionnement permanent.',
            price: 4400,
            category: 'avatar',
            image: '/assets/avatars_shop/real_5.jpg'
        },
        {
            id: 'new_avatar_53',
            name: 'Hypatie du Futur',
            description: 'Une brillante mathématicienne qui inspire les générations futures.',
            price: 4600,
            category: 'avatar',
            image: '/assets/avatars_shop/Screenshot_20250206-224921_WhatsApp.jpg'
        },
        {
            id: 'new_avatar_54',
            name: 'Mansa Musa du Savoir',
            description: 'Il possède la richesse inestimable d\'un savoir partagé.',
            price: 4800,
            category: 'avatar',
            image: '/assets/avatars_shop/temp_image_213F4E6A-2AE5-4B55-82F2-9962A8FA70A2.webp'
        },
        {
            id: 'new_avatar_55',
            name: 'Einstein de la Tech',
            description: 'Il redéfinit la physique de l\'apprentissage moderne.',
            price: 5000,
            category: 'avatar',
            image: '/assets/avatars_shop/temp_image_6B850500-CE6B-42AB-9940-33B2A286381A.webp'
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
            id: 'new_wall_1',
            name: 'Aurore Boréale',
            description: 'Des lueurs vertes magiques pour illuminer ton espace d\'apprentissage.',
            price: 250,
            category: 'wallpaper',
            image: '/assets/avatars_shop/1000103980.png'
        },
        {
            id: 'new_wall_2',
            name: 'Dunes Dorées',
            description: 'Le calme infini du désert sous un soleil couchant flamboyant.',
            price: 500,
            category: 'wallpaper',
            image: '/assets/avatars_shop/pexels-alamsaim-29280658.jpg'
        },
        {
            id: 'new_wall_3',
            name: 'Forêt Mystique',
            description: 'Un sentier boisé paisible propice à la concentration et au calme.',
            price: 1000,
            category: 'wallpaper',
            image: '/assets/avatars_shop/pexels-danieljschwarz-37326386.jpg'
        },
        {
            id: 'new_wall_4',
            name: 'Sommet Enneigé',
            description: 'Un grand bol d\'air frais au sommet des montagnes de la connaissance.',
            price: 1500,
            category: 'wallpaper',
            image: '/assets/avatars_shop/pexels-nanda-gopal-lakshman-1548481679-27667695.jpg'
        },
        {
            id: 'new_wall_5',
            name: 'Canyon Sublime',
            description: 'La majesté des roches sculptées par le temps et la persévérance.',
            price: 2500,
            category: 'wallpaper',
            image: '/assets/avatars_shop/pexels-steve-29738253.jpg'
        },
        {
            id: 'new_wall_6',
            name: 'Océan de Nuages',
            description: 'Prends de la hauteur et révise tes cours au-dessus du monde.',
            price: 4000,
            category: 'wallpaper',
            image: '/assets/avatars_shop/pexels-wenxiang-83911323-37138139.jpg'
        }
];

