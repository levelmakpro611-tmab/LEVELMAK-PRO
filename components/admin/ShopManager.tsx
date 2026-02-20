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
    Save
} from 'lucide-react';
import { getAllShopItems, addShopItem, updateShopItem, deleteShopItem } from '../../services/adminService';
import { ShopItem } from '../../types';

const ShopManager: React.FC = () => {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [saving, setSaving] = useState(false);

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
            const shopItems = await getAllShopItems();
            setItems(shopItems);
        } catch (error) {
            console.error('Error loading shop items:', error);
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
            if (editingItem && editingItem.firestoreId) {
                await updateShopItem(editingItem.firestoreId, formData, imageFile || undefined);
            } else {
                const newItem: Omit<ShopItem, 'firestoreId'> = {
                    id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: formData.name!,
                    description: formData.description!,
                    price: formData.price!,
                    category: formData.category!,
                    image: formData.image,
                    color: formData.color,
                    icon: formData.icon
                };
                await addShopItem(newItem, imageFile || undefined);
            }
            await loadItems();
            setShowModal(false);
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Erreur lors de la sauvegarde');
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                    <motion.div
                        key={item.firestoreId}
                        layout
                        className="bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-primary/50 transition-all group"
                    >
                        <div className="aspect-square rounded-xl bg-white/5 overflow-hidden flex items-center justify-center">
                            {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                                <ShoppingBag size={48} className="text-slate-600" />
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
                                            <option value="avatar">Avatar</option>
                                            <option value="badge">Badge</option>
                                            <option value="theme">Thème</option>
                                            <option value="potion">Potion</option>
                                        </select>
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
