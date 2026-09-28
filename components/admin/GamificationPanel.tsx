import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Coins, Zap, Search, User as UserIcon, Plus, Minus, LayoutGrid, List, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { User } from '../../types';
import { BADGES } from '../../constants';
import { getLeaderboard, grantUserBadge, adjustUserResources, deleteUser } from '../../services/adminService';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const GamificationPanel: React.FC = () => {
    const [leaderboard, setLeaderboard] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges' | 'actions'>('leaderboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [statusToast, setStatusToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setStatusToast({ message, type });
        setTimeout(() => {
            setStatusToast(null);
        }, 4000);
    };

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            const users = await getLeaderboard(50);
            setLeaderboard(users);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchUser = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const q = searchQuery.trim();
        if (!q) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // 1. Try finding in loaded leaderboard first
            const matchedInLoaded = leaderboard.filter(u =>
                (u.name && u.name.toLowerCase().includes(q.toLowerCase())) ||
                (u.username && u.username.toLowerCase().includes(q.toLowerCase())) ||
                (u.phoneNumber && u.phoneNumber.includes(q))
            );

            // 2. Query Supabase directly to find any user outside Top 50
            const { data: dbUsers, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`name.ilike.%${q}%,username.ilike.%${q}%,phone_number.ilike.%${q}%,email.ilike.%${q}%`)
                .limit(10);

            let combinedResults: User[] = [...matchedInLoaded];

            if (!error && dbUsers && dbUsers.length > 0) {
                const mappedDbUsers: User[] = dbUsers.map(u => ({
                    id: u.id,
                    name: u.name || u.username || 'Élève',
                    username: u.username || u.name || 'Élève',
                    totalXp: Number(u.total_xp || u.xp || 0),
                    phoneNumber: u.phone_number,
                    level: u.level || 1,
                    badges: Array.isArray(u.badges) ? u.badges : [],
                    levelCoins: Number(u.level_coins || 0),
                    streak: u.streak || { current: 0, lastLogin: new Date().toISOString() },
                    stats: u.stats || {},
                    activities: u.activities || [],
                    avatar: u.avatar_config || { baseColor: '#1E293B', accessory: 'none', aura: 'none', currentLevel: u.level || 1 },
                    role: u.role || 'student'
                } as User));

                // Merge unique by id
                mappedDbUsers.forEach(dbU => {
                    if (!combinedResults.some(r => r.id === dbU.id)) {
                        combinedResults.push(dbU);
                    }
                });
            }

            setSearchResults(combinedResults);

            if (combinedResults.length === 1) {
                setSelectedUser(combinedResults[0]);
                showToast(`Élève sélectionné : ${combinedResults[0].name}`, 'success');
            } else if (combinedResults.length === 0) {
                showToast(`Aucun élève trouvé pour "${q}"`, 'error');
            }
        } catch (err: any) {
            console.error('Erreur recherche utilisateur:', err);
            // Fallback to local leaderboard filter
            const found = leaderboard.find(u =>
                u.name.toLowerCase().includes(q.toLowerCase()) ||
                (u.phoneNumber && u.phoneNumber.includes(q))
            );
            if (found) {
                setSelectedUser(found);
                showToast(`Élève sélectionné : ${found.name}`, 'success');
            } else {
                showToast('Utilisateur non trouvé', 'error');
            }
        } finally {
            setIsSearching(false);
        }
    };

    const handleGiveBadge = async (badgeId: string) => {
        if (!selectedUser) return;
        setActionLoading(true);

        // Optimistic update
        const updatedBadges = [...(selectedUser.badges || [])];
        if (!updatedBadges.includes(badgeId)) {
            updatedBadges.push(badgeId);
        }
        const updatedSelected = { ...selectedUser, badges: updatedBadges };
        setSelectedUser(updatedSelected);
        setLeaderboard(prev => prev.map(u => u.id === selectedUser.id ? { ...u, badges: updatedBadges } : u));

        try {
            await grantUserBadge(selectedUser.id, badgeId);
            showToast(`Badge ${badgeId} accordé avec succès à ${selectedUser.name} !`, 'success');
            // Refresh in background
            const updatedUsers = await getLeaderboard(50);
            setLeaderboard(updatedUsers);
            const fresh = updatedUsers.find(u => u.id === selectedUser.id);
            if (fresh) setSelectedUser(fresh);
        } catch (e: any) {
            console.error('Error granting badge:', e);
            showToast(`Erreur lors de l'attribution du badge: ${e.message || 'Échec'}`, 'error');
            loadLeaderboard();
        } finally {
            setActionLoading(false);
        }
    };

    const handleAdjustResources = async (type: 'xp' | 'coins', amount: number) => {
        if (!selectedUser) return;
        setActionLoading(true);

        const currentXp = Number(selectedUser.totalXp || 0);
        const currentCoins = Number(selectedUser.levelCoins || 0);
        const newXp = type === 'xp' ? Math.max(0, currentXp + amount) : currentXp;
        const newCoins = type === 'coins' ? Math.max(0, currentCoins + amount) : currentCoins;

        // Instant optimistic update
        const updatedSelected: User = {
            ...selectedUser,
            totalXp: newXp,
            levelCoins: newCoins,
        };
        setSelectedUser(updatedSelected);
        setLeaderboard(prev => prev.map(u => u.id === selectedUser.id ? {
            ...u,
            totalXp: newXp,
            levelCoins: newCoins,
        } : u));

        const label = type === 'coins' ? `${amount > 0 ? '+' : ''}${amount} Coins 🪙` : `${amount > 0 ? '+' : ''}${amount} XP ⚡`;

        try {
            const res = await adjustUserResources(selectedUser.id, type, amount);
            showToast(`${label} appliqué avec succès à ${selectedUser.name} !`, 'success');

            // Apply authoritative returned numbers if available
            if (res && (res.totalXp !== undefined || res.levelCoins !== undefined)) {
                const authoritativeXp = res.totalXp !== undefined ? Number(res.totalXp) : newXp;
                const authoritativeCoins = res.levelCoins !== undefined ? Number(res.levelCoins) : newCoins;
                setSelectedUser(curr => curr ? { ...curr, totalXp: authoritativeXp, levelCoins: authoritativeCoins } : null);
                setLeaderboard(prev => prev.map(u => u.id === selectedUser.id ? { ...u, totalXp: authoritativeXp, levelCoins: authoritativeCoins } : u));
            }

            // Sync full leaderboard in background
            const updatedUsers = await getLeaderboard(50);
            setLeaderboard(updatedUsers);
            const fresh = updatedUsers.find(u => u.id === selectedUser.id);
            if (fresh) setSelectedUser(fresh);
        } catch (e: any) {
            console.error('Error adjusting resources:', e);
            showToast(`Erreur lors de la mise à jour : ${e.message || 'Échec de synchronisation'}`, 'error');
            // Revert by re-fetching
            loadLeaderboard();
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in min-h-[calc(100dvh-130px)] md:min-h-[calc(100vh-140px)] pb-24 md:pb-8 flex flex-col">
            {/* Header Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-3 md:pb-4 overflow-x-auto custom-scrollbar no-scrollbar">
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0 ${activeTab === 'leaderboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                    <Trophy size={16} /> Classement
                </button>
                <button
                    onClick={() => setActiveTab('badges')}
                    className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0 ${activeTab === 'badges' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                    <Medal size={16} /> Badges Système
                </button>
                <button
                    onClick={() => setActiveTab('actions')}
                    className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap shrink-0 ${activeTab === 'actions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                    <Zap size={16} /> Actions Manuelles (+Coins/XP)
                </button>
            </div>

            {/* Notification Toast */}
            <AnimatePresence>
                {statusToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`p-3 rounded-xl border text-sm font-bold flex items-center gap-2 shadow-lg ${
                            statusToast.type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                        }`}
                    >
                        {statusToast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span>{statusToast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
                {activeTab === 'leaderboard' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                            <h3 className="font-bold text-slate-900 dark:text-white">Top Joueurs (XP)</h3>
                            <button onClick={loadLeaderboard} className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">Actualiser</button>
                        </div>
                        {loading ? (
                            <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div></div>
                        ) : (
                            <div className="grid gap-3">
                                {leaderboard.map((user, index) => (
                                    <div 
                                        key={user.id} 
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setActiveTab('actions');
                                        }}
                                        className="flex items-center justify-between p-3.5 md:p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group cursor-pointer"
                                        title="Cliquer pour gérer ce profil"
                                    >
                                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                            <div className={`w-8 h-8 flex items-center justify-center font-black rounded-lg shrink-0 ${index < 3 ? 'bg-yellow-500 text-black shadow-md' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-400'}`}>
                                                {index + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2 truncate">
                                                    <span className="truncate">{user.name}</span>
                                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 shrink-0 group-hover:inline-block hidden">Gérer</span>
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">{user.phoneNumber || `Niveau ${user.level || 1}`}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-4 text-right shrink-0">
                                            <div>
                                                <p className="text-purple-600 dark:text-purple-400 font-black text-xs md:text-sm">{user.totalXp} XP</p>
                                                <p className="text-[10px] md:text-xs text-slate-500">Total</p>
                                            </div>
                                            <div className="w-px h-6 md:h-8 bg-slate-200 dark:border-white/10"></div>
                                            <div>
                                                <p className="text-yellow-600 dark:text-yellow-400 font-black text-xs md:text-sm">{user.levelCoins} 🪙</p>
                                                <p className="text-[10px] md:text-xs text-slate-500">Coins</p>
                                            </div>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`Supprimer définitivement "${user.name}" de l'application et du classement ?`)) {
                                                        try {
                                                            await deleteUser(user.id);
                                                            await loadLeaderboard();
                                                            showToast(`Utilisateur ${user.name} supprimé.`, 'success');
                                                        } catch (err: any) {
                                                            showToast(err.message || 'Erreur lors de la suppression', 'error');
                                                        }
                                                    }
                                                }}
                                                className="p-1.5 md:p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer ml-1"
                                                title={`Supprimer définitivement ${user.name}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'badges' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                        {BADGES.map((badge) => (
                            <div key={badge.id} className="p-4 md:p-6 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center gap-2 md:gap-3 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm">
                                <span className="text-3xl md:text-4xl">{badge.icon}</span>
                                <div>
                                    <h4 className="font-bold text-xs md:text-sm text-slate-900 dark:text-white">{badge.name}</h4>
                                    <p className="text-[11px] md:text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{badge.description}</p>
                                </div>
                                <div className="text-[9px] md:text-[10px] font-mono text-slate-500 dark:text-slate-600 uppercase mt-auto pt-1">ID: {badge.id}</div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'actions' && (
                    <div className="grid md:grid-cols-2 gap-4 md:gap-8">
                        {/* Selector */}
                        <div className="space-y-4 md:space-y-6">
                            <div className="bg-white dark:bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                                <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white flex items-center gap-2">
                                    <Search size={18} className="text-blue-500" /> Rechercher un élève
                                </h3>
                                <form onSubmit={handleSearchUser} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Nom, identifiant, téléphone..."
                                        className="flex-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 md:px-4 py-2.5 text-xs md:text-sm text-slate-900 dark:text-white focus:border-blue-500 outline-none placeholder:text-slate-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSearching}
                                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3 md:px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                                    >
                                        {isSearching ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Search size={16} />}
                                        <span>Chercher</span>
                                    </button>
                                </form>

                                {/* Search Results Dropdown/List */}
                                {searchResults.length > 1 && (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-white/10 rounded-xl p-2 bg-slate-50 dark:bg-black/20">
                                        <p className="text-[11px] font-bold text-slate-500 px-2 py-1">Plusieurs élèves trouvés ({searchResults.length}) :</p>
                                        {searchResults.map(res => (
                                            <button
                                                key={res.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedUser(res);
                                                    setSearchResults([]);
                                                }}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between text-xs transition-colors"
                                            >
                                                <span className="font-bold text-slate-900 dark:text-white">{res.name}</span>
                                                <span className="text-slate-500 text-[11px]">{res.levelCoins} 🪙 | {res.totalXp} XP</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Selected User Card */}
                                {selectedUser ? (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                                <UserIcon size={24} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-black text-sm md:text-base text-slate-900 dark:text-white truncate">{selectedUser.name}</p>
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold truncate">{selectedUser.phoneNumber || selectedUser.username || 'Compte actif'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            <div className="p-3 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-xl text-center">
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">XP Actuel</p>
                                                <p className="font-black text-base md:text-lg text-purple-600 dark:text-purple-400">{selectedUser.totalXp} ⚡</p>
                                            </div>
                                            <div className="p-3 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-xl text-center">
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Coins Actuels</p>
                                                <p className="font-black text-base md:text-lg text-yellow-600 dark:text-yellow-400">{selectedUser.levelCoins} 🪙</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                        <p className="text-xs text-slate-500 font-medium">Recherchez un élève ou cliquez sur un profil dans le classement pour lui créditer des Coins ou XP.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={`space-y-4 md:space-y-6 transition-opacity ${selectedUser ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            {/* Coins/XP Adjustment */}
                            <div className="bg-white dark:bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white flex items-center gap-2">
                                        <Zap size={18} className="text-amber-500" /> Récompenses & Ajustements
                                    </h3>
                                    {actionLoading && (
                                        <div className="flex items-center gap-1.5 text-xs text-blue-500 font-bold">
                                            <div className="animate-spin w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full" />
                                            <span>Mise à jour...</span>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustResources('coins', 50)}
                                        disabled={actionLoading}
                                        className="p-3 md:p-3.5 bg-yellow-500/10 hover:bg-yellow-500/20 active:scale-95 border border-yellow-500/30 rounded-xl text-yellow-600 dark:text-yellow-400 font-black text-xs md:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        +50 Coins 🪙
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustResources('xp', 100)}
                                        disabled={actionLoading}
                                        className="p-3 md:p-3.5 bg-purple-500/10 hover:bg-purple-500/20 active:scale-95 border border-purple-500/30 rounded-xl text-purple-600 dark:text-purple-400 font-black text-xs md:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        +100 XP ⚡
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustResources('coins', -50)}
                                        disabled={actionLoading}
                                        className="p-2.5 md:p-3 bg-slate-100 dark:bg-white/5 hover:bg-red-500/10 active:scale-95 border border-slate-200 dark:border-white/10 hover:border-red-500/30 rounded-xl text-slate-600 dark:text-slate-400 hover:text-red-500 font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                                    >
                                        -50 Coins
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustResources('xp', -100)}
                                        disabled={actionLoading}
                                        className="p-2.5 md:p-3 bg-slate-100 dark:bg-white/5 hover:bg-red-500/10 active:scale-95 border border-slate-200 dark:border-white/10 hover:border-red-500/30 rounded-xl text-slate-600 dark:text-slate-400 hover:text-red-500 font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                                    >
                                        -100 XP
                                    </button>
                                </div>
                            </div>

                            {/* Badge Granting */}
                            <div className="bg-white dark:bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 space-y-3 md:space-y-4 shadow-sm">
                                <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white flex items-center gap-2">
                                    <Medal size={18} className="text-amber-500" /> Donner un Badge
                                </h3>
                                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                    {BADGES.map(badge => (
                                        <button
                                            key={badge.id}
                                            type="button"
                                            onClick={() => handleGiveBadge(badge.id)}
                                            disabled={selectedUser?.badges?.includes(badge.id) || actionLoading}
                                            className={`p-2.5 rounded-xl border text-left text-xs flex items-center gap-2 transition-all ${selectedUser?.badges?.includes(badge.id)
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-500 font-bold opacity-80 cursor-default'
                                                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30 text-slate-700 dark:text-slate-300 active:scale-95'
                                                }`}
                                        >
                                            <span className="text-base shrink-0">{badge.icon}</span>
                                            <span className="truncate flex-1 font-semibold">{badge.name}</span>
                                            {selectedUser?.badges?.includes(badge.id) && <span className="ml-auto text-emerald-500 font-black">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamificationPanel;
