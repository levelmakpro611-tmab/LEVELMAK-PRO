import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Flag, MessageSquare, User, CheckCircle, XCircle, Clock, 
    AlertTriangle, Shield, Trash2, Eye, Ban, Search, RefreshCw
} from 'lucide-react';
import { chatService, Report } from '../../services/communityService';
import { adminNotificationService } from '../../services/adminNotificationService';

const ReportManagement: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    useEffect(() => {
        loadReports();
        
        // Listen for new reports (realtime) if needed, 
        // but for now simple refresh is enough or we rely on AdminNotifPanel
    }, []);

    const loadReports = async () => {
        setLoading(true);
        try {
            const data = await chatService.getReports();
            setReports(data);
        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (reportId: string, status: 'resolved' | 'dismissed') => {
        try {
            await chatService.resolveReport(reportId, status);
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
            if (selectedReport?.id === reportId) setSelectedReport(null);
            
            // Log action or send notification if needed
        } catch (error) {
            console.error('Error resolving report:', error);
        }
    };

    const filteredReports = reports.filter(r => {
        const matchesFilter = filter === 'all' || r.status === filter;
        const matchesSearch = !searchTerm || 
            r.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.targetContent && r.targetContent.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase"><Clock size={12}/>En attente</span>;
            case 'resolved': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase"><CheckCircle size={12}/>Résolu</span>;
            case 'dismissed': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-500 text-[10px] font-black uppercase"><XCircle size={12}/>Refusé</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-500/20 rounded-lg text-orange-500"><AlertTriangle size={18}/></div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Signalements actifs</h4>
                    </div>
                    <p className="text-3xl font-black text-white">{reports.filter(r => r.status === 'pending').length}</p>
                </div>
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500"><RefreshCw size={18}/></div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total traités</h4>
                    </div>
                    <p className="text-3xl font-black text-white">{reports.filter(r => r.status !== 'pending').length}</p>
                </div>
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-500"><Shield size={18}/></div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taux de résolution</h4>
                    </div>
                    <p className="text-3xl font-black text-white">
                        {reports.length > 0 ? Math.round((reports.filter(r => r.status === 'resolved').length / reports.length) * 100) : 0}%
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex bg-black/20 p-1 rounded-xl w-full md:w-auto">
                    {(['all', 'pending', 'resolved', 'dismissed'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all
                                ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            {f === 'pending' ? 'En attente' : f === 'resolved' ? 'Résolus' : f === 'dismissed' ? 'Refusés' : 'Tous'}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Rechercher un signalement..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50 font-bold"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contenu</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Signaleur</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Motif</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <RefreshCw className="animate-spin text-blue-500 mx-auto mb-2" size={32} />
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Chargement des signalements...</p>
                                    </td>
                                </tr>
                            ) : filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <CheckCircle className="text-emerald-500/20 mx-auto mb-2" size={48} />
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Aucun signalement trouvé</p>
                                    </td>
                                </tr>
                            ) : filteredReports.map(report => (
                                <tr key={report.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${report.targetType === 'message' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                {report.targetType === 'message' ? <MessageSquare size={16}/> : <User size={16}/>}
                                            </div>
                                            <div className="min-w-0 max-w-[200px]">
                                                <p className="text-[12px] font-bold text-white truncate">
                                                    {report.targetType === 'message' ? 'Message' : 'Utilisateur'}
                                                </p>
                                                {report.targetContent && (
                                                    <p className="text-[10px] text-slate-500 truncate mt-0.5 italic">"{report.targetContent}"</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-[12px] font-bold text-white">{report.reporterName}</p>
                                        <p className="text-[10px] text-slate-500">ID: {report.reporterId.substring(0, 8)}...</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-black rounded-lg border border-red-500/10">
                                            {report.reason}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-[11px] text-slate-400 font-medium">
                                            {new Date(report.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(report.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => setSelectedReport(report)}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                                                title="Voir détails"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {report.status === 'pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleResolve(report.id, 'resolved')}
                                                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg transition-all"
                                                        title="Approuver & Sanctionner"
                                                    >
                                                        <Ban size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleResolve(report.id, 'dismissed')}
                                                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"
                                                        title="Ignorer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedReport && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setSelectedReport(null)} 
                            className="absolute inset-0 bg-slate-950/90 " 
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                            className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                                            <Flag size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white tracking-tight">Signalement détaillé</h3>
                                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">ID: {selectedReport.id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedReport(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-500 transition-colors"><XCircle size={24}/></button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Informations Source</h4>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><User size={20}/></div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{selectedReport.reporterName}</p>
                                                <p className="text-[10px] text-slate-500">Signaleur</p>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-white/5">
                                            <p className="text-xs text-slate-400 font-medium">Motif invoqué:</p>
                                            <p className="text-sm font-black text-red-400 mt-1 uppercase tracking-tight">{selectedReport.reason}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Contenu Incriminé</h4>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                                                {selectedReport.targetType === 'message' ? <MessageSquare size={20}/> : <User size={20}/>}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{selectedReport.targetType === 'message' ? 'Message Chat' : 'Profil Utilisateur'}</p>
                                                <p className="text-[10px] text-slate-500">Cible du signalement</p>
                                            </div>
                                        </div>
                                        {selectedReport.targetContent && (
                                            <div className="pt-3 border-t border-white/5 italic text-sm text-slate-200 bg-black/20 p-3 rounded-xl">
                                                "{selectedReport.targetContent}"
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedReport.details && (
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Précisions supplémentaires</h4>
                                        <p className="text-sm text-slate-300 leading-relaxed">{selectedReport.details}</p>
                                    </div>
                                )}

                                <div className="pt-4 flex gap-4">
                                    {selectedReport.status === 'pending' ? (
                                        <>
                                            <button 
                                                onClick={() => handleResolve(selectedReport.id, 'resolved')}
                                                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Ban size={16}/> Valider & Sanctionner
                                            </button>
                                            <button 
                                                onClick={() => handleResolve(selectedReport.id, 'dismissed')}
                                                className="flex-1 py-4 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
                                            >
                                                <XCircle size={16}/> Rejeter le signalement
                                            </button>
                                        </>
                                    ) : (
                                        <div className="w-full py-4 text-center border border-white/5 rounded-2xl bg-white/[0.02] text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                            Signalement {selectedReport.status === 'resolved' ? 'Traité' : 'Rejeté'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReportManagement;
