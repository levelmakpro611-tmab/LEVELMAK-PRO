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
    FlaskConical,
    Loader2,
    Image as ImageIcon
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { POTIONS, HARDCODED_SHOP_ITEMS } from '../constants';
import { ShopItem } from '../types';
import { getAllShopItems, getDeterministicUUID } from '../services/adminService';

const Shop: React.FC = () => {
    const { user, purchaseItem, equipItem, purchasePotion, consumePotion, t } = useStore();
    const [activeTab, setActiveTab] = useState<'all' | 'avatar' | 'badge' | 'potion' | 'wallpaper' | 'owned'>('all');
    const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);

    const inventory = user?.inventory || [];
    const coins = user?.levelCoins || 0;

    // Load items from Firestore
    useEffect(() => {
        // ✅ Declare outside the async fn so we can clear in cleanup
        let cancelled = false;
        const safetyTimeout = setTimeout(() => {
            if (!cancelled) {
                setLoading(false);
                console.warn('Shop: Safety timeout triggered');
            }
        }, 10000);

        const loadItems = async () => {
            try {
                // Timeout logic to avoid hanging indefinitely
                const fetchWithTimeout = (promise: Promise<any>, ms: number) => {
                    let timeoutId: any;
                    const timeoutPromise = new Promise((_, reject) => {
                        timeoutId = setTimeout(() => reject(new Error('Timeout')), ms);
                    });
                    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
                };

                let firestoreItems: ShopItem[] = [];
                try {
                    console.log('Shop: Fetching items from Supabase...');
                    firestoreItems = await fetchWithTimeout(getAllShopItems(), 8000) as ShopItem[];
                    console.log(`Shop: Successfully fetched ${firestoreItems.length} items`);
                } catch (e) {
                    console.warn('Shop fetch timed out or failed, using fallbacks', e);
                    firestoreItems = [];
                }

                if (cancelled) return;

                const potionIds = new Set(POTIONS.map(p => getDeterministicUUID(p.id)));
                const potionItems: ShopItem[] = POTIONS.map(p => ({
                    ...p,
                    originalId: p.id,
                    id: getDeterministicUUID(p.id),
                    category: 'potion' as const
                }));

                const hardcodedItemsWithUuid = HARDCODED_ITEMS.map(item => ({
                    ...item,
                    originalId: item.id,
                    id: getDeterministicUUID(item.id)
                }));

                // Filter out deleted items from firestoreItems
                const activeDbItems = firestoreItems.filter(item => !item.description?.startsWith('__DELETED__') && item.price !== -1);

                // All DB IDs (active and deleted placeholders)
                const dbIds = new Set(firestoreItems.map(i => i.id));
                const mergedItems = [
                    ...activeDbItems.map(item => potionIds.has(item.id) ? { ...item, category: 'potion' as const } : item),
                    ...hardcodedItemsWithUuid.filter(item => !dbIds.has(item.id)),
                    ...potionItems.filter(item => !dbIds.has(item.id))
                ];

                if (!cancelled) setItems(mergedItems);
            } catch (error) {
                console.error('Error loading shop items:', error);
                if (!cancelled) {
                    const potionItems: ShopItem[] = POTIONS.map(p => ({
                        ...p,
                        originalId: p.id,
                        id: getDeterministicUUID(p.id),
                        category: 'potion' as const
                    }));
                    const hardcodedItemsWithUuid = HARDCODED_ITEMS.map(item => ({
                        ...item,
                        originalId: item.id,
                        id: getDeterministicUUID(item.id)
                    }));
                    setItems([...hardcodedItemsWithUuid, ...potionItems]);
                }
            } finally {
                clearTimeout(safetyTimeout);
                if (!cancelled) setLoading(false);
            }
        };

        loadItems();

        // ✅ Cleanup: cancel state updates and clear timer on unmount
        return () => {
            cancelled = true;
            clearTimeout(safetyTimeout);
        };
    }, []);


const HARDCODED_ITEMS = HARDCODED_SHOP_ITEMS as ShopItem[];

    const filteredItems = activeTab === 'all'
        ? items
        : activeTab === 'owned'
            ? items.filter(item => inventory.includes(item.id) || (item.originalId && inventory.includes(item.originalId)))
            : items.filter(item => activeTab === 'wallpaper' ? (item.category === 'wallpaper' || item.category === 'theme') : item.category === activeTab);

    const handlePurchase = (item: ShopItem) => {
        const translatedName = t(`items.${item.id}.name`);
        const displayName = translatedName.startsWith('items.') ? item.name : translatedName;

        if (item.category === 'potion') {
            const success = purchasePotion(item.id, item.originalId);
            if (success) {
                setPurchaseSuccess(displayName);
                setTimeout(() => setPurchaseSuccess(null), 3000);
            } else {
                alert(t('shop.insufficient'));
            }
            return;
        }

        if (inventory.includes(item.id) || (item.originalId && inventory.includes(item.originalId))) return;

        const success = purchaseItem(item.id, item.price, item.originalId);
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

        consumePotion(item.id, item.originalId);
        setPurchaseSuccess(`${t('shop.active')}: ${displayName}`);
        setTimeout(() => setPurchaseSuccess(null), 3000);
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 border-b border-white/5 pb-8 md:pb-10">
                <div className="space-y-3 md:space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-secondary/10 rounded-full border border-secondary/20 text-secondary font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px]">
                        <ShoppingBag className="w-3 h-3 md:w-3.5 md:h-3.5 animate-pulse" /> {t('shop.title')}
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
                            <Coins className="text-secondary w-4.5 h-4.5 md:w-6 md:h-6" />
                        </div>
                    </div>
                    <div className="w-px h-8 md:h-10 bg-white/10" />
                    <button
                        onClick={() => setActiveTab(activeTab === 'owned' ? 'all' : 'owned')}
                        className="flex flex-col items-end group cursor-pointer select-none focus:outline-none transition-all active:scale-95"
                    >
                        <span className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest group-hover:text-secondary transition-colors">{t('shop.items')}</span>
                        <span className={`text-lg md:text-2xl font-display font-black transition-colors ${activeTab === 'owned' ? 'text-secondary' : 'text-slate-900 dark:text-white group-hover:text-secondary'}`}>
                            {inventory.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-nowrap md:flex-wrap gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide -mx-4 px-4">
                {[
                    { id: 'all', icon: Gem },
                    { id: 'owned', icon: Check },
                    { id: 'avatar', icon: UserCircle },
                    { id: 'badge', icon: BadgeCheck },
                    { id: 'wallpaper', icon: ImageIcon },
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
                            className={`group relative overflow-hidden bg-slate-900 border border-white/10 rounded-2xl md:rounded-[2.5rem] p-3 md:p-6 transition-all hover:border-secondary/50 ${(inventory.includes(item.id) || (item.originalId && inventory.includes(item.originalId))) ? 'opacity-75' : ''
                                }`}
                        >
                            {/* Status Label */}
                            {(inventory.includes(item.id) || (item.originalId && inventory.includes(item.originalId))) && (
                                <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-success/20 text-success rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                                    <Check size={12} /> {t('shop.owned')}
                                </div>
                            )}

                            {/* Item Visual */}
                            <div className="aspect-square rounded-xl md:rounded-[2rem] bg-white/5 mb-3 md:mb-6 overflow-hidden flex items-center justify-center relative">
                                {item.category === 'avatar' || item.category === 'wallpaper' ? (
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
                            {item.category === 'potion' && (user?.consumables?.[item.id] || (item.originalId && user?.consumables?.[item.originalId])) && (
                                <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-secondary/20 text-secondary-light rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                                    {t('shop.stock')}: {user.consumables[item.id] || (item.originalId ? user.consumables[item.originalId] : 0)}
                                </div>
                            )}

                            {/* Content */}
                            <div className="space-y-1 md:space-y-2 mb-4 md:mb-6">
                                <h3 className="text-sm md:text-xl font-display font-black text-slate-900 dark:text-white line-clamp-1">{displayName}</h3>
                                <p className="text-slate-500 text-[10px] md:text-sm font-medium line-clamp-2 md:line-clamp-none">{displayDesc}</p>
                            </div>

                            {/* Purchase/Equip/Use Button */}
                            {item.category === 'potion' ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <button
                                        onClick={() => handlePurchase(item)}
                                        className="w-full py-2.5 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] md:tracking-[0.2em] transition-all bg-white/5 text-white hover:bg-secondary hover:shadow-glow active:scale-95"
                                    >
                                        <span>{item.price}</span>
                                        <Coins size={14} md={16} />
                                        <span className="opacity-50 text-[8px] md:text-[10px]">{t('shop.buy')}</span>
                                    </button>
                                    
                                    {((user?.consumables?.[item.id] || 0) > 0 || (item.originalId && (user?.consumables?.[item.originalId] || 0) > 0)) && !['water_can', 'fertilizer', 'potion_shield', 'potion_skip', 'potion_inspiration'].includes(item.originalId || item.id) && (
                                        <button
                                            onClick={() => handleUse(item)}
                                            className="w-full py-2 md:py-3 rounded-lg md:rounded-xl flex items-center justify-center gap-2 text-[8px] md:text-xs font-black uppercase tracking-wider transition-all bg-secondary/20 text-secondary hover:bg-secondary/30 active:scale-95 border border-secondary/30"
                                        >
                                            <FlaskConical size={12} md={14} />
                                            {t('shop.use')} ({user.consumables[item.id] || (item.originalId ? user.consumables[item.originalId] : 0)})
                                        </button>
                                    )}
                                </div>
                            ) : item.category !== 'potion' && (inventory.includes(item.id) || (item.originalId && inventory.includes(item.originalId))) ? (
                                <button
                                    onClick={() => equipItem(item.id, item.category, item.image, item.originalId)}
                                    className={`w-full py-2.5 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] md:tracking-[0.2em] transition-all ${
                                        ((item.category === 'avatar' && user?.avatar?.image === item.image) || (item.category === 'wallpaper' && user?.wallpaper === item.image))
                                            ? 'bg-success text-white shadow-glow'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                                >
                                    {(item.category === 'avatar' && user?.avatar?.image === item.image) || (item.category === 'wallpaper' && user?.wallpaper === item.image)
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
            {!loading && filteredItems.length === 0 && (
                <div className="py-20 text-center opacity-40">
                    <Star size={48} className="mx-auto mb-4" />
                    <p className="text-lg font-bold">{t('shop.empty')}</p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="py-20 text-center opacity-40">
                    <Loader2 size={48} className="mx-auto mb-4 animate-spin" />
                    <p className="text-lg font-bold">Chargement de la boutique...</p>
                </div>
            )}
        </div>
    );
};

export default Shop;
