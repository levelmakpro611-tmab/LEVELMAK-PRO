import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag,
    Zap,
    Star,
    Heart,
    Check,
    Coins,
    Crown,
    Gem,
    Palette,
    UserCircle,
    BadgeCheck,
    Lock,
    FlaskConical
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { POTIONS } from '../constants';
import { ShopItem } from '../types';
import { getAllShopItems } from '../services/adminService';

const Shop: React.FC = () => {
    const { user, purchaseItem, equipItem, purchasePotion, usePotion, t } = useStore();
    const [activeTab, setActiveTab] = useState<'all' | 'avatar' | 'badge' | 'theme' | 'potion'>('all');
    const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);

    const inventory = user?.inventory || [];
    const coins = user?.levelCoins || 0;

    // Load items from Firestore
    useEffect(() => {
        const loadItems = async () => {
            try {
                const firestoreItems = await getAllShopItems();
                const potionItems: ShopItem[] = POTIONS.map(p => ({
                    ...p,
                    category: 'potion' as const
                }));

                // If Firestore is empty, use hardcoded avatars as fallback
                if (firestoreItems.length === 0) {
                    setItems([...hardcodedItems, ...potionItems]);
                } else {
                    setItems([...firestoreItems, ...potionItems]);
                }
            } catch (error) {
                console.error('Error loading shop items:', error);
                setItems([...hardcodedItems, ...POTIONS.map(p => ({ ...p, category: 'potion' as const }))]);
            } finally {
                setLoading(false);
            }
        };
        loadItems();
    }, []);

    // Hardcoded fallback items (original avatars list)
    const hardcodedItems: ShopItem[] = [
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
        // Themes
        {
            id: 'theme_gold',
            name: 'Thème Or Royal',
            description: 'Une interface luxueuse pour ton dashboard.',
            price: 500,
            category: 'theme',
            color: '#D4AF37'
        },
        {
            id: 'theme_neon',
            name: 'Thème Néon Cyber',
            description: 'Un look futuriste et dynamique.',
            price: 400,
            category: 'theme',
            color: '#10B981'
        },
    ];

    const filteredItems = activeTab === 'all'
        ? items
        : items.filter(item => item.category === activeTab);

    const handlePurchase = (item: ShopItem) => {
        const translatedName = t(`items.${item.id}.name`);
        const displayName = translatedName.startsWith('items.') ? item.name : translatedName;

        if (item.category === 'potion') {
            const success = purchasePotion(item.id);
            if (success) {
                setPurchaseSuccess(displayName);
                setTimeout(() => setPurchaseSuccess(null), 3000);
            } else {
                alert(t('shop.insufficient'));
            }
            return;
        }

        if (inventory.includes(item.id)) return;

        const success = purchaseItem(item.id, item.price);
        if (success) {
            setPurchaseSuccess(displayName);
            setTimeout(() => setPurchaseSuccess(null), 3000);
        } else {
            alert(t('shop.insufficient'));
        }
    };

    const handleUse = (item: ShopItem) => {
        const translatedName = t(`items.${item.id}.name`);
        const displayName = translatedName.startsWith('items.') ? item.name : translatedName;

        usePotion(item.id);
        setPurchaseSuccess(`${t('shop.active')}: ${displayName}`);
        setTimeout(() => setPurchaseSuccess(null), 3000);
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 border-b border-white/5 pb-8 md:pb-10">
                <div className="space-y-3 md:space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-secondary/10 rounded-full border border-secondary/20 text-secondary font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px]">
                        <ShoppingBag size={12} md:size={14} className="animate-pulse" /> {t('shop.title')}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tighter">
                        {t('shop.subtitle')}
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base max-w-xl font-medium leading-relaxed">
                        {t('shop.desc')}
                    </p>
                </div>

                <div className="bg-slate-900/50 border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 flex items-center gap-4 md:gap-6 shadow-2xl backdrop-blur-xl">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('shop.balance')}</span>
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <span className="text-xl md:text-3xl font-display font-black text-slate-900 dark:text-white">{coins}</span>
                            <Coins className="text-secondary" size={18} md:size={24} />
                        </div>
                    </div>
                    <div className="w-px h-8 md:h-10 bg-white/10" />
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('shop.items')}</span>
                        <span className="text-lg md:text-2xl font-display font-black text-slate-900 dark:text-white">{inventory.length}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-nowrap md:flex-wrap gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide -mx-4 px-4">
                {[
                    { id: 'all', icon: Gem },
                    { id: 'avatar', icon: UserCircle },
                    { id: 'badge', icon: BadgeCheck },
                    { id: 'theme', icon: Palette },
                    { id: 'potion', icon: FlaskConical },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 md:gap-3 px-3.5 md:px-6 py-2.5 md:py-4 rounded-lg md:rounded-2xl text-[8px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-secondary text-white shadow-glow'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        <tab.icon size={12} md={18} />
                        {t(`shop.tabs.${tab.id}`)}
                    </button>
                ))}
            </div>

            {/* Success Message */}
            <AnimatePresence>
                {purchaseSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-success/20 border border-success/30 p-4 rounded-2xl flex items-center justify-center gap-3 text-success font-bold"
                    >
                        <Check size={20} />
                        {t('shop.success')} {purchaseSuccess} ! 🎉
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {filteredItems.map(item => {
                    const translatedName = t(`items.${item.id}.name`);
                    const displayName = translatedName.startsWith('items.') ? item.name : translatedName;

                    const translatedDesc = t(`items.${item.id}.desc`);
                    const displayDesc = translatedDesc.startsWith('items.') ? item.description : translatedDesc;

                    return (
                        <motion.div
                            layout
                            key={item.id}
                            className={`group relative overflow-hidden bg-slate-900 border border-white/10 rounded-2xl md:rounded-[2.5rem] p-3 md:p-6 transition-all hover:border-secondary/50 ${inventory.includes(item.id) ? 'opacity-75' : ''
                                }`}
                        >
                            {/* Status Label */}
                            {inventory.includes(item.id) && (
                                <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-success/20 text-success rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                                    <Check size={12} /> {t('shop.owned')}
                                </div>
                            )}

                            {/* Item Visual */}
                            <div className="aspect-square rounded-xl md:rounded-[2rem] bg-white/5 mb-3 md:mb-6 overflow-hidden flex items-center justify-center relative">
                                {item.category === 'avatar' ? (
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                    />
                                ) : item.category === 'badge' ? (
                                    <div className="relative">
                                        <div className="absolute inset-0 blur-2xl opacity-20" style={{ backgroundColor: item.color }} />
                                        <BadgeCheck size={40} md={80} style={{ color: item.color }} className="relative animate-float" />
                                    </div>
                                ) : item.category === 'potion' ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <div className="absolute inset-0 blur-3xl opacity-30" style={{ backgroundColor: item.color }} />
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-contain p-2 relative z-10 transition-transform group-hover:scale-110 drop-shadow-2xl"
                                            />
                                        ) : (
                                            <div className="relative p-6 md:p-10 bg-white/5 rounded-full border border-white/10 shadow-glow flex items-center justify-center animate-pulse" style={{ borderColor: `${item.color}40` }}>
                                                <FlaskConical size={32} md={64} style={{ color: item.color }} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 md:p-8 w-full h-full flex items-center justify-center" style={{ backgroundColor: `${item.color}10` }}>
                                        <Palette size={40} md={80} style={{ color: item.color }} className="animate-pulse" />
                                    </div>
                                )}
                            </div>

                            {/* Inventory Count for consumables */}
                            {item.category === 'potion' && user?.consumables?.[item.id] && (
                                <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-secondary/20 text-secondary-light rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                                    {t('shop.stock')}: {user.consumables[item.id]}
                                </div>
                            )}

                            {/* Content */}
                            <div className="space-y-1 md:space-y-2 mb-4 md:mb-6">
                                <h3 className="text-sm md:text-xl font-display font-black text-slate-900 dark:text-white line-clamp-1">{displayName}</h3>
                                <p className="text-slate-500 text-[10px] md:text-sm font-medium line-clamp-2 md:line-clamp-none">{displayDesc}</p>
                            </div>

                            {/* Purchase/Equip/Use Button */}
                            {item.category === 'potion' && user?.consumables?.[item.id] ? (
                                <button
                                    onClick={() => handleUse(item)}
                                    className="w-full py-2.5 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] md:tracking-[0.2em] transition-all bg-secondary text-white shadow-glow hover:bg-secondary-light active:scale-95"
                                >
                                    <FlaskConical size={14} md={16} />
                                    {t('shop.use')} ({user.consumables[item.id]})
                                </button>
                            ) : item.category !== 'potion' && inventory.includes(item.id) ? (
                                <button
                                    onClick={() => equipItem(item.id, item.category, item.image)}
                                    className={`w-full py-2.5 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] md:tracking-[0.2em] transition-all ${(item.category === 'avatar' && user?.avatar?.image === item.image)
                                        ? 'bg-success text-white shadow-glow'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                >
                                    {(item.category === 'avatar' && user?.avatar?.image === item.image)
                                        ? <><BadgeCheck size={14} md={16} /> {t('shop.active')}</>
                                        : t('shop.equip')
                                    }
                                </button>
                            ) : (
                                <button
                                    onClick={() => handlePurchase(item)}
                                    className="w-full py-2.5 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] md:tracking-[0.2em] transition-all bg-white/5 text-white hover:bg-secondary hover:shadow-glow active:scale-95"
                                >
                                    <span>{item.price}</span>
                                    <Coins size={14} md={16} />
                                    <span className="opacity-50 text-[8px] md:text-[10px]">{t('shop.buy')}</span>
                                </button>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredItems.length === 0 && (
                <div className="py-20 text-center opacity-40">
                    <Star size={48} className="mx-auto mb-4" />
                    <p className="text-lg font-bold">{t('shop.empty')}</p>
                </div>
            )}
        </div>
    );
};

export default Shop;
