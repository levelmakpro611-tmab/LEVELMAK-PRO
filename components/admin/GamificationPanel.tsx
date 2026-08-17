import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Coins, Zap, Search, User as UserIcon, Plus, Minus, LayoutGrid, List } from 'lucide-react';
import { User } from '../../types';
import { BADGES } from '../../constants';
import { getLeaderboard, grantUserBadge, adjustUserResources } from '../../services/adminService';
import { motion, AnimatePresence } from 'framer-motion';

const GamificationPanel: React.FC = () => {
    const [leaderboard, setLeaderboard] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges' | 'actions'>('leaderboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadLeaderboard();
    }, []);

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

    const handleSearchUser = () => {
        // Simple client-side search for now from the leaderboard list or we could fetch specific user
        // For admin ease, filtering the loaded leaderboard is a good start
        // A real search would query Firestore
        const found = leaderboard.find(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.phoneNumber && u.phoneNumber.includes(searchQuery))
        );
        if (found) setSelectedUser(found);
        else alert('Utilisateur non trouvé dans le Top 50 (Recherche limitée pour démo)');
    };

    const handleGiveBadge = async (badgeId: string) => {
        if (!selectedUser) return;
        setActionLoading(true);
        try {
            await grantUserBadge(selectedUser.id, badgeId);
            alert(`Badge ${badgeId} accordé !`);
            // Refresh
            const updatedUsers = await getLeaderboard(50);
            setLeaderboard(updatedUsers);
            setSelectedUser(updatedUsers.find(u => u.id === selectedUser.id) || null);
        } catch (e) {
            alert('Erreur');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAdjustResources = async (type: 'xp' | 'coins', amount: number) => {
        if (!selectedUser) return;
        setActionLoading(true);
        try {
            await adjustUserResources(selectedUser.id, type, amount);
            alert(`${Math.abs(amount)} ${type} ${amount > 0 ? 'ajoutés' : 'retirés'} !`);
            // Refresh
            const updatedUsers = await getLeaderboard(50);
            setLeaderboard(updatedUsers);
            setSelectedUser(updatedUsers.find(u => u.id === selectedUser.id) || null);
        } catch (e) {
            alert('Erreur');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in h-[calc(100vh-140px)] flex flex-col">
            {/* Header Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'leaderboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                    <Trophy size={16} /> Classement
                </button>
                <button
                    onClick={() => setActiveTab('badges')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'badges' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                    <Medal size={16} /> Badges Système
                </button>
                <button
                    onClick={() => setActiveTab('actions')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'actions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                    <Zap size={16} /> Actions Manuelles
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
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
                                    <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5 hover:border-blue-500/30 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 flex items-center justify-center font-black rounded-lg ${index < 3 ? 'bg-yellow-500 text-black shadow-md' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-400'}`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.name}</p>
                                                <p className="text-xs text-slate-500">{user.level}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-right">
                                            <div>
                                                <p className="text-purple-600 dark:text-purple-400 font-black text-sm">{user.totalXp} XP</p>
                                                <p className="text-xs text-slate-500">Total</p>
                                            </div>
                                            <div className="w-px h-8 bg-slate-200 dark:bg-white/10"></div>
                                            <div>
                                                <p className="text-yellow-600 dark:text-yellow-400 font-black text-sm">{user.levelCoins} 🪙</p>
                                                <p className="text-xs text-slate-500">Coins</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'badges' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {BADGES.map((badge) => (
                            <div key={badge.id} className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center gap-3 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm">
                                <span className="text-4xl">{badge.icon}</span>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">{badge.name}</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{badge.description}</p>
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-600 uppercase mt-2">ID: {badge.id}</div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'actions' && (
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Selector */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Search size={18} /> Sélectionner un utilisateur
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Nom ou téléphone..."
                                        className="flex-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none placeholder:text-slate-400"
                                    />
                                    <button
                                        onClick={handleSearchUser}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-colors shadow-md"
                                    >
                                        Chercher
                                    </button>
                                </div>

                                {selectedUser && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <UserIcon size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{selectedUser.name}</p>
                                                <p className="text-xs text-blue-600 dark:text-blue-400">Niveau {selectedUser.avatar?.currentLevel || 1}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            <div className="p-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-lg text-center">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">XP</p>
                                                <p className="font-bold text-slate-900 dark:text-white">{selectedUser.totalXp}</p>
                                            </div>
                                            <div className="p-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-lg text-center">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Coins</p>
                                                <p className="font-bold text-yellow-600 dark:text-yellow-400">{selectedUser.levelCoins}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={`space-y-6 transition-opacity ${selectedUser ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            {/* Coins/XP Adjustment */}
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Zap size={18} /> Récompenses Rapides
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleAdjustResources('xp', 100)}
                                        disabled={actionLoading}
                                        className="p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 font-bold text-sm transition-all"
                                    >
                                        +100 XP
                                    </button>
                                    <button
                                        onClick={() => handleAdjustResources('coins', 50)}
                                        disabled={actionLoading}
                                        className="p-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-400 font-bold text-sm transition-all"
                                    >
                                        +50 Coins
                                    </button>
                                </div>
                            </div>

                            {/* Badge Granting */}
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Medal size={18} /> Donner un Badge
                                </h3>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {BADGES.map(badge => (
                                        <button
                                            key={badge.id}
                                            onClick={() => handleGiveBadge(badge.id)}
                                            disabled={selectedUser?.badges?.includes(badge.id) || actionLoading}
                                            className={`p-2 rounded-lg border text-left text-xs flex items-center gap-2 transition-all ${selectedUser?.badges?.includes(badge.id)
                                                    ? 'bg-green-500/10 border-green-500/30 text-green-500 opacity-50 cursor-not-allowed'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                                                }`}
                                        >
                                            <span>{badge.icon}</span>
                                            <span className="truncate">{badge.name}</span>
                                            {selectedUser?.badges?.includes(badge.id) && <span className="ml-auto">✓</span>}
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
