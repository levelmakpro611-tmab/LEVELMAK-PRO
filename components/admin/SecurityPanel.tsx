import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, UserX, Unlock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Report, User } from '../../types';
import { getReports, resolveReport, getBlockedUsers, unblockUser } from '../../services/adminService';
import { motion } from 'framer-motion';

const SecurityPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'reports' | 'bans'>('reports');
    const [reports, setReports] = useState<Report[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'reports') {
                const data = await getReports();
                if (data.length === 0) {
                    // Mock data for demo
                    setReports([
                        { id: '1', reporterId: 'u1', reporterName: 'Alice', targetId: 'c1', targetType: 'comment', reason: 'Spam / Pub', status: 'pending', timestamp: new Date().toISOString() },
                        { id: '2', reporterId: 'u2', reporterName: 'Bob', targetId: 'u3', targetType: 'user', reason: 'Harcèlement', status: 'pending', timestamp: new Date(Date.now() - 86400000).toISOString() },
                    ]);
                } else {
                    setReports(data);
                }
            } else {
                const data = await getBlockedUsers();
                setBlockedUsers(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id: string, action: 'resolved' | 'dismissed') => {
        try {
            await resolveReport(id, action);
            setReports(prev => prev.filter(r => r.id !== id));
        } catch (e) {
            alert('Erreur lors du traitement');
        }
    };

    const handleUnblock = async (userId: string) => {
        if (!confirm('Voulez-vous vraiment débloquer cet utilisateur ?')) return;
        try {
            await unblockUser(userId);
            setBlockedUsers(prev => prev.filter(u => u.id !== userId));
        } catch (e) {
            alert('Erreur lors du déblocage');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in h-[calc(100vh-140px)] flex flex-col">
            {/* Header Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
                >
                    <AlertTriangle size={16} /> Signalements
                    {reports.length > 0 && <span className="bg-white text-red-500 text-xs px-1.5 rounded-full font-black">{reports.length}</span>}
                </button>
                <button
                    onClick={() => setActiveTab('bans')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'bans' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
                >
                    <UserX size={16} /> Utilisateurs Bloqués
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div></div>
                ) : (
                    <>
                        {activeTab === 'reports' && (
                            <div className="space-y-3">
                                {reports.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
                                        Aucun signalement en attente. Tout est calme !
                                    </div>
                                ) : (
                                    reports.map(report => (
                                        <div key={report.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:bg-white/10 transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${report.targetType === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                        {report.targetType}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{new Date(report.timestamp).toLocaleDateString()}</span>
                                                </div>
                                                <p className="font-bold text-white text-sm">Signalé par: {report.reporterName}</p>
                                                <p className="text-red-400 font-medium mt-1"><AlertTriangle size={12} className="inline mr-1" />Raison: {report.reason}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { }} className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors" title="Voir détails">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => handleResolve(report.id, 'dismissed')} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 text-sm font-bold transition-colors">
                                                    Ignorer
                                                </button>
                                                <button onClick={() => handleResolve(report.id, 'resolved')} className="px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-bold transition-colors shadow-lg shadow-red-500/20">
                                                    Sanctionner / Résoudre
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'bans' && (
                            <div className="space-y-3">
                                {blockedUsers.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        Aucun utilisateur banni.
                                    </div>
                                ) : (
                                    blockedUsers.map(user => (
                                        <div key={user.id} className="bg-black/40 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                                                    <UserX size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{user.name}</p>
                                                    <p className="text-xs text-red-400">Suspendu / Bloqué</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleUnblock(user.id)}
                                                className="flex items-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-sm font-bold transition-all"
                                            >
                                                <Unlock size={16} /> Débloquer
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SecurityPanel;
