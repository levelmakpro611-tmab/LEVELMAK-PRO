import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Edit2,
    Trash2,
    X,
    Upload,
    Loader2,
    ShoppingBag,
    Coins,
    Save,
    Gem,
    UserCircle,
    BadgeCheck,
    Image as ImageIcon,
    FlaskConical,
    Palette
} from 'lucide-react';
import { getAllShopItems, addShopItem, updateShopItem, deleteShopItem } from '../../services/adminService';
import { ShopItem } from '../../types';
import { POTIONS, HARDCODED_SHOP_ITEMS } from '../../constants';

const HARDCODED_ITEMS = HARDCODED_SHOP_ITEMS as ShopItem[];

const ShopManager: React.FC = () => {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'avatar' | 'badge' | 'potion' | 'wallpaper' | 'theme'>('all');

    const [formData, setFormData] = useState<Partial<ShopItem>>({
        name: '',
        description: '',
        price: 0,
        category: 'avatar',
        image: '',
        color: '',
        icon: ''
    });

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            const dbItems = await getAllShopItems();
            
            // Map hardcoded POTIONS to force their category to 'potion', matching Shop.tsx student logic
            const potionIds = new Set(POTIONS.map(p => p.id));
            const potionItems: ShopItem[] = POTIONS.map(p => ({
                ...p,
                category: 'potion' as const
            }));

            // Merge with hardcoded to show everything
            const dbIds = new Set(dbItems.map(i => i.id));
            const merged = [
                ...dbItems,
                ...HARDCODED_ITEMS.filter(i => !dbIds.has(i.id!)) as ShopItem[],
                ...potionItems.filter(i => !dbIds.has(i.id)) as ShopItem[]
            ];
            
            setItems(merged);
        } catch (error) {
            console.error('Error loading shop items:', error);
            // Fallback to hardcoded if DB fails
            const potionItems: ShopItem[] = POTIONS.map(p => ({
                ...p,
                category: 'potion' as const
            }));
            setItems([...HARDCODED_ITEMS, ...potionItems] as any);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        setFormData({
            name: '',
            description: '',
            price: 0,
            category: 'avatar',
            image: '',
            color: '',
            icon: ''
        });
        setImageFile(null);
        setImagePreview('');
        setShowModal(true);
    };

    const openEditModal = (item: ShopItem) => {
        setEditingItem(item);
        setFormData(item);
        setImagePreview(item.image || '');
        setImageFile(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.description || formData.price === undefined) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        setSaving(true);
        try {
            if (editingItem && editingItem.id) {
                // If it has a firestoreId, it's already in the DB
                if (editingItem.firestoreId) {
                    await updateShopItem(editingItem.id, formData, imageFile || undefined);
                } else {
                    // It's a hardcoded item being saved to DB for the first time
                    // Omit the string ID to let Supabase generate a valid UUID
                    await addShopItem({ ...formData } as ShopItem, imageFile || undefined);
                }
            } else {
                // New item: Omit ID to let Supabase generate a valid UUID
                await addShopItem({ ...formData } as ShopItem, imageFile || undefined);
            }
            await loadItems();
            setShowModal(false);
        } catch (error: any) {
            console.error('Error saving item:', error);
            alert(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: ShopItem) => {
        if (!confirm(`Supprimer "${item.name}" ?`)) return;

        try {
            if (item.firestoreId) {
                await deleteShopItem(item.firestoreId, item.image);
                await loadItems();
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Erreur lors de la suppression');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-black text-white">Gestion de la Boutique</h2>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-bold uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-glow"
                >
                    <Plus size={18} /> Ajouter un Article
                </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 md:gap-3 pb-2 overflow-x-auto">
                {[
                    { id: 'all', label: 'Tout', icon: Gem },
                    { id: 'avatar', label: 'Avatars', icon: UserCircle },
                    { id: 'badge', label: 'Badges', icon: BadgeCheck },
                    { id: 'wallpaper', label: 'Fonds / Thèmes', icon: ImageIcon },
                    { id: 'potion', label: 'Fioles', icon: FlaskConical },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-primary text-white shadow-glow'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items
                    .filter(item => {
                        if (activeTab === 'all') return true;
                        if (activeTab === 'wallpaper') return item.category === 'wallpaper' || item.category === 'theme';
                        return item.category === activeTab;
                    })
                    .map((item) => (
                        <motion.div
                            key={item.id}
                            layout
                            className="bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-primary/50 transition-all group"
                        >
                        <div className="aspect-square rounded-xl bg-white/5 overflow-hidden flex items-center justify-center relative">
                            {item.category === 'avatar' || item.category === 'wallpaper' ? (
                                item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <ShoppingBag size={48} className="text-slate-600" />
                                )
                            ) : item.category === 'badge' ? (
                                <div className="relative">
                                    <div className="absolute inset-0 blur-2xl opacity-20" style={{ backgroundColor: item.color }} />
                                    <BadgeCheck size={80} style={{ color: item.color || '#F59E0B' }} className="relative" />
                                </div>
                            ) : item.category === 'potion' ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-full h-full object-contain p-4" />
                                    ) : (
                                        <FlaskConical size={64} style={{ color: item.color || '#EC4899' }} />
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 w-full h-full flex items-center justify-center" style={{ backgroundColor: `${item.color || '#3B82F6'}10` }}>
                                    <Palette size={80} style={{ color: item.color || '#3B82F6' }} />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="text-lg font-bold text-white line-clamp-1">{item.name}</h3>
                                <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-black rounded-lg uppercase">
                                    {item.category}
                                </span>
                            </div>
                            <p className="text-sm text-slate-400 line-clamp-2">{item.description}</p>
                            <div className="flex items-center gap-2 text-secondary font-bold">
                                <Coins size={18} />
                                <span>{item.price}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => openEditModal(item)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-primary/20 text-white rounded-xl transition-all text-xs font-bold uppercase"
                            >
                                <Edit2 size={14} /> Modifier
                            </button>
                            <button
                                onClick={() => handleDelete(item)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-danger/20 text-white rounded-xl transition-all text-xs font-bold uppercase"
                            >
                                <Trash2 size={14} /> Supprimer
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => !saving && setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-white/10 rounded-3xl p-4 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-display font-black text-white">
                                    {editingItem ? 'Modifier l\'Article' : 'Nouvel Article'}
                                </h3>
                                <button
                                    onClick={() => !saving && setShowModal(false)}
                                    className="p-2 hover:bg-white/5 rounded-xl transition-all"
                                    disabled={saving}
                                >
                                    <X size={24} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Image Upload */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Image</label>
                                    <div className="flex gap-4">
                                        <label className="flex-shrink-0 w-32 h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-primary/50 transition-all flex items-center justify-center overflow-hidden bg-white/5">
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Upload size={32} className="text-slate-500" />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                                disabled={saving}
                                            />
                                        </label>
                                        <div className="flex-1 flex items-center text-xs text-slate-500">
                                            {imageFile ? imageFile.name : 'Aucune image sélectionnée'}
                                        </div>
                                    </div>
                                </div>

                                {/* Name */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Nom *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                        placeholder="Ex: Roi des Pirates"
                                        disabled={saving}
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Description *</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none resize-none"
                                        rows={3}
                                        placeholder="Description de l'article..."
                                        disabled={saving}
                                    />
                                </div>

                                {/* Price & Category */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Prix *</label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                            min="0"
                                            disabled={saving}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Catégorie *</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                            disabled={saving}
                                        >
                                            <option value="avatar" className="bg-slate-900 text-white">Avatar</option>
                                            <option value="badge" className="bg-slate-900 text-white">Badge</option>
                                            <option value="wallpaper" className="bg-slate-900 text-white">Fonds (Wallpaper)</option>
                                            <option value="theme" className="bg-slate-900 text-white">Thème</option>
                                            <option value="potion" className="bg-slate-900 text-white">Potion</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Color & Icon (Optional) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Couleur (Hex)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formData.color || ''}
                                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                                placeholder="#FF0000"
                                                disabled={saving}
                                            />
                                            <div 
                                                className="w-12 h-12 rounded-xl border border-white/10" 
                                                style={{ backgroundColor: formData.color || 'transparent' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Icône (Lucide name)</label>
                                        <input
                                            type="text"
                                            value={formData.icon || ''}
                                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                            placeholder="Zap, Star, etc."
                                            disabled={saving}
                                        />
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => !saving && setShowModal(false)}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase text-xs transition-all"
                                        disabled={saving}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || !formData.name || !formData.description}
                                        className="flex-1 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-glow disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {saving ? (
                                            <><Loader2 className="animate-spin" size={16} /> Sauvegarde...</>
                                        ) : (
                                            <><Save size={16} /> Sauvegarder</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ShopManager;
