import React, { useState } from 'react';
import { Search, MoreVertical, Shield, Ban, Trash2, CheckCircle, XCircle, Filter, ChevronDown, User, UserX, Lock, Unlock, Mail, Phone, Calendar, GraduationCap, Award, Zap } from 'lucide-react';
import { UserAnalytics } from '../../types';
import { deleteUser, suspendUser, blockUser, unblockUser } from '../../services/adminService';

interface UserManagementProps {
    users: UserAnalytics[];
    onRefresh: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onRefresh }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'blocked'>('all');
    const [selectedUser, setSelectedUser] = useState<UserAnalytics | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'suspend' | 'block' | 'activate' | null; userId: string | null }>({ type: null, userId: null });
    const [loading, setLoading] = useState(false);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.phoneNumber && user.phoneNumber.includes(searchTerm));
        const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleAction = async (type: 'delete' | 'suspend' | 'block', userId: string) => {
        setLoading(true);
        try {
            if (type === 'delete') await deleteUser(userId);
            else if (type === 'suspend') await suspendUser(userId);
            else if (type === 'block') await blockUser(userId);
            else if (type === 'activate') await unblockUser(userId);

            onRefresh();
            setConfirmAction({ type: null, userId: null });
        } catch (error) {
            console.error(`Error performing ${type}:`, error);
            alert(`Erreur lors de l'action ${type}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total" value={users.length} color="blue" />
                <StatCard label="Actifs" value={users.filter(u => u.status === 'active').length} color="green" />
                <StatCard label="Suspendus" value={users.filter(u => u.status === 'suspended').length} color="orange" />
                <StatCard label="Bloqués" value={users.filter(u => u.status === 'blocked').length} color="red" />
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all placeholder:text-slate-600"
                    />
                </div>

                <div className="flex gap-2 bg-black/20 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                    {(['all', 'active', 'suspended', 'blocked'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${filterStatus === status
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {status === 'all' ? 'Tous' : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20 border-b border-white/10">
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Utilisateur</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Niveau & XP</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Statut</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Activité</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <tr key={user.userId} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black shadow-lg">
                                                {user.userName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{user.userName}</p>
                                                <p className="text-[10px] text-slate-500">{user.email}</p>
                                                {user.phoneNumber && <p className="text-[10px] text-slate-500 font-bold">{user.phoneNumber}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Award size={14} className="text-yellow-500" />
                                                <span className="text-xs font-bold text-white">Lvl {user.level}</span>
                                            </div>
                                            <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }}></div>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{user.xp} XP total</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${user.status === 'active'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : user.status === 'suspended'
                                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-white font-medium">{new Date(user.lastActive).toLocaleDateString('fr-FR')}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Dernière activité</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all"
                                                title="Détails"
                                            >
                                                <Shield size={16} />
                                            </button>

                                            {user.status === 'active' ? (
                                                <>
                                                    <button
                                                        onClick={() => setConfirmAction({ type: 'suspend', userId: user.userId })}
                                                        className="p-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg transition-all"
                                                        title="Suspendre"
                                                    >
                                                        <Ban size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmAction({ type: 'block', userId: user.userId })}
                                                        className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-all"
                                                        title="Bloquer"
                                                    >
                                                        <Lock size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmAction({ type: 'activate', userId: user.userId })}
                                                    className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all"
                                                    title="Réactiver"
                                                >
                                                    <Unlock size={16} />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setConfirmAction({ type: 'delete', userId: user.userId })}
                                                className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-20 text-slate-600">
                        <UserX size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-bold">Aucun utilisateur trouvé</p>
                        <p className="text-sm">Essayez d'ajuster vos critères de recherche</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedUser(null)}>
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl text-white font-black shadow-2xl">
                                {selectedUser.userName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white">{selectedUser.userName}</h3>
                                <p className="text-slate-400 flex items-center gap-2 mt-1">
                                    <Mail size={14} /> {selectedUser.email}
                                </p>
                                <p className="text-slate-400 flex items-center gap-2">
                                    <Phone size={14} /> {selectedUser.phoneNumber || 'Non renseigné'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <DetailItem icon={<Calendar />} label="Âge" value={selectedUser.ageRange || 'N/A'} />
                            <DetailItem icon={<User />} label="Genre" value={selectedUser.gender || 'N/A'} />
                            <DetailItem icon={<GraduationCap />} label="Éducation" value={selectedUser.education || 'N/A'} />
                            <DetailItem icon={<Award />} label="Niveau" value={`Niveau ${selectedUser.level}`} />
                            <DetailItem icon={<Zap />} label="XP" value={`${selectedUser.xp} XP`} />
                            <DetailItem icon={<CheckCircle />} label="Quiz" value={`${selectedUser.quizzesCompleted} complétés`} />
                        </div>

                        <div className="pt-6 border-t border-white/5 flex gap-4">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black transition-all"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={() => {
                                    setConfirmAction({ type: 'suspend', userId: selectedUser.userId });
                                    setSelectedUser(null);
                                }}
                                className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-orange-600/20"
                            >
                                Suspendre
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Confirmation Modal */}
            {confirmAction.type && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-6">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${confirmAction.type === 'delete' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'
                            }`}>
                            {confirmAction.type === 'delete' ? <Trash2 size={40} /> : confirmAction.type === 'activate' ? <Unlock size={40} /> : <Ban size={40} />}
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-white">Êtes-vous sûr ?</h4>
                            <p className="text-slate-400 text-sm mt-2">
                                {confirmAction.type === 'activate' ? "Cette action rendra l'accès complet à l'utilisateur immédiatement." : "Cette action sur l'utilisateur est irréversible et affectera son accès à la plateforme."}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmAction({ type: null, userId: null })}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleAction(confirmAction.type!, confirmAction.userId!)}
                                disabled={loading}
                                className={`flex-1 py-3 text-white rounded-xl font-bold transition-all ${confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                                    confirmAction.type === 'activate' ? 'bg-green-600 hover:bg-green-700' :
                                        'bg-orange-600 hover:bg-orange-700'
                                    }`}
                            >
                                {loading ? '...' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-components
const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-600/10 border-blue-500/20 text-blue-400',
        green: 'bg-green-600/10 border-green-500/20 text-green-400',
        orange: 'bg-orange-600/10 border-orange-500/20 text-orange-400',
        red: 'bg-red-600/10 border-red-500/20 text-red-400'
    };
    return (
        <div className={`${colors[color]} border rounded-2xl p-6 backdrop-blur-xl`}>
            <p className="text-3xl font-black tracking-tighter">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-60 text-current">{label}</p>
        </div>
    );
};

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 text-slate-500 mb-1">
            <span className="scale-75 origin-left">{icon}</span>
            <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-white font-bold">{value}</p>
    </div>
);

export default UserManagement;
