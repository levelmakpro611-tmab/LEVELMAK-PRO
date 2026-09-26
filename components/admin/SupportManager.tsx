import React, { useState } from 'react';
import { LifeBuoy, AlertTriangle, CheckCircle, Trash2, Reply, Send, Printer, ShieldAlert, User, Search, MessageSquare, Clock, Copy, Check, CheckSquare, Square, X } from 'lucide-react';
import { UserComment } from '../../types';
import { updateCommentStatus, deleteComment, deleteComments, deleteAllCrashes } from '../../services/adminService';

interface SupportManagerProps {
    comments: UserComment[];
    onRefresh: () => void;
}

const getHumanReadableCrashTitle = (content: string): string => {
    if (content.includes('hideSplashScreen is not defined')) return 'Crash Initialisation (Splash Screen)';
    if (content.includes('ReferenceError')) return 'Crash Référence de Variable';
    if (content.includes('TypeError')) return 'Crash Type / Propriété Indéfinie';
    if (content.includes('Failed to fetch') || content.includes('NetworkError')) return 'Erreur de Connexion Réseau';
    if (content.includes('QuotaExceeded')) return 'Erreur Dépassement de Quota / Stockage';
    return 'Anomalie Système Détectée';
};

const formatTicketDate = (timestamp: string): string => {
    if (!timestamp) return 'Date inconnue';
    
    // Check if timestamp already matches French format "DD/MM/YYYY" (e.g. 12/08/2026 or 26/09/2026)
    // If so, do NOT pass to new Date("12/08/2026") which reverses Day and Month into Month 12 (December)
    const frRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/;
    const frMatch = timestamp.trim().match(frRegex);
    if (frMatch) {
        const day = frMatch[1].padStart(2, '0');
        const month = frMatch[2].padStart(2, '0');
        const year = frMatch[3];
        const timePart = frMatch[4] ? frMatch[4].trim() : '';
        return `${day}/${month}/${year}${timePart ? ` ${timePart}` : ''}`;
    }

    try {
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return timestamp;
        return d.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        return timestamp;
    }
};

const SupportManager: React.FC<SupportManagerProps> = ({ comments, onRefresh }) => {
    const [filterType, setFilterType] = useState<'all' | 'crashes' | 'user_support' | 'pending' | 'resolved'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [responseModal, setResponseModal] = useState<UserComment | null>(null);
    const [responseText, setResponseText] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);

    const handleCopyTicket = (item: UserComment, displayTitle: string, cleanContent: string) => {
        const fullText = `[${displayTitle.toUpperCase()}]\nDate: ${formatTicketDate(item.timestamp)}\n${item.userPhone ? `Utilisateur: ${item.userPhone}\n` : ''}\n--- DÉTAILS ---\n${cleanContent}${item.adminResponse ? `\n\n--- PRISE EN CHARGE ADMIN ---\n${item.adminResponse}` : ''}`;
        navigator.clipboard.writeText(fullText).then(() => {
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 2000);
        }).catch(err => {
            console.error('Erreur lors de la copie :', err);
        });
    };

    // Support items are comments with category 'support', user_phone 'crash-reporter', or starting with [CRASH
    const supportComments = comments.filter(c => 
        c.category === 'support' || c.userPhone === 'crash-reporter' || c.content.startsWith('[CRASH')
    );

    const filteredSupport = supportComments.filter(item => {
        const isCrash = item.content.startsWith('[CRASH') || item.userPhone === 'crash-reporter';
        if (filterType === 'crashes' && !isCrash) return false;
        if (filterType === 'user_support' && isCrash) return false;
        if (filterType === 'pending' && item.status !== 'pending') return false;
        if (filterType === 'resolved' && item.status !== 'approved') return false;

        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            return (
                item.userName.toLowerCase().includes(query) ||
                item.content.toLowerCase().includes(query) ||
                (item.userPhone || '').toLowerCase().includes(query)
            );
        }
        return true;
    });

    const handleResolve = async (commentId: string, replyText?: string) => {
        try {
            await updateCommentStatus(commentId, 'approved', replyText || responseText || 'Pris en charge par le support');
            setResponseText('');
            setResponseModal(null);
            onRefresh();
        } catch (error) {
            console.error('Error resolving support item:', error);
            alert('Erreur lors du traitement');
        }
    };

    const handleDelete = async (commentId: string) => {
        try {
            await deleteComment(commentId);
            setDeleteConfirm(null);
            setSelectedTicketIds(prev => prev.filter(id => id !== commentId));
            onRefresh();
        } catch (error) {
            console.error('Error deleting support item:', error);
            alert('Erreur lors de la suppression');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedTicketIds.length === 0) return;
        if (!confirm(`Confirmez-vous la suppression définitive de ${selectedTicketIds.length} ticket(s) ?`)) return;

        setIsDeletingBulk(true);
        try {
            await deleteComments(selectedTicketIds);
            setSelectedTicketIds([]);
            onRefresh();
        } catch (error) {
            console.error('Error deleting bulk tickets:', error);
            alert('Erreur lors de la suppression groupée');
        } finally {
            setIsDeletingBulk(false);
        }
    };

    const handleBulkResolve = async () => {
        if (selectedTicketIds.length === 0) return;
        setIsDeletingBulk(true);
        try {
            for (const id of selectedTicketIds) {
                await updateCommentStatus(id, 'approved', 'Résolu en masse par l\'administrateur');
            }
            setSelectedTicketIds([]);
            onRefresh();
        } catch (error) {
            console.error('Error bulk resolving:', error);
            alert('Erreur lors de la validation groupée');
        } finally {
            setIsDeletingBulk(false);
        }
    };

    const handleDeleteAllCrashes = async () => {
        const crashCount = supportComments.filter(c => c.content.startsWith('[CRASH') || c.userPhone === 'crash-reporter').length;
        if (crashCount === 0) {
            alert('Aucun rapport de crash à supprimer.');
            return;
        }
        if (!confirm(`Voulez-vous vraiment supprimer TOUS les ${crashCount} rapports de crash système de la base de données ?`)) return;

        setIsDeletingBulk(true);
        try {
            await deleteAllCrashes();
            setSelectedTicketIds([]);
            onRefresh();
        } catch (error) {
            console.error('Error deleting all crashes:', error);
            alert('Erreur lors de la purge complète des crashs');
        } finally {
            setIsDeletingBulk(false);
        }
    };

    const handleMarkAllAsResolved = async () => {
        if (!confirm('Voulez-vous vraiment marquer TOUS les tickets en attente comme lus / résolus ?')) return;
        try {
            const pendingTickets = supportComments.filter(c => c.status === 'pending');
            for (const ticket of pendingTickets) {
                await updateCommentStatus(ticket.id, 'approved', 'Résolu automatiquement par l\'administrateur');
            }
            onRefresh();
        } catch (error) {
            console.error('Error marking all as resolved:', error);
            alert('Erreur lors de la validation globale des tickets');
        }
    };

    const isAllFilteredSelected = filteredSupport.length > 0 && filteredSupport.every(item => selectedTicketIds.includes(item.id));

    const toggleSelectAll = () => {
        if (isAllFilteredSelected) {
            const filteredIds = new Set(filteredSupport.map(item => item.id));
            setSelectedTicketIds(prev => prev.filter(id => !filteredIds.has(id)));
        } else {
            const newSelected = Array.from(new Set([...selectedTicketIds, ...filteredSupport.map(item => item.id)]));
            setSelectedTicketIds(newSelected);
        }
    };

    const toggleTicketSelect = (id: string) => {
        setSelectedTicketIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-6">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-rose-900/40 via-purple-900/30 to-slate-900/40 border border-rose-500/20 p-6 rounded-3xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                        <LifeBuoy size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            Notifications & Messages Support
                            <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-mono">
                                {supportComments.length} tickets
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Espace dédié aux signalements de bogues, rapports de crash et demandes d'assistance des élèves.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <button
                        onClick={handleMarkAllAsResolved}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-900/40 flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer"
                    >
                        <CheckCircle size={16} />
                        Tout marquer comme lu / résolu
                    </button>
                    <button
                        onClick={handleDeleteAllCrashes}
                        disabled={isDeletingBulk}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-rose-900/40 flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Supprime tous les tickets de crash de la base de données"
                    >
                        <Trash2 size={16} />
                        Purger tous les crashs
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10">
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {[
                        { id: 'all', label: 'Tous', icon: LifeBuoy, count: supportComments.length },
                        { id: 'crashes', label: 'Crashes Système', icon: AlertTriangle, count: supportComments.filter(c => c.content.startsWith('[CRASH') || c.userPhone === 'crash-reporter').length },
                        { id: 'user_support', label: 'Support Élèves', icon: MessageSquare, count: supportComments.filter(c => !c.content.startsWith('[CRASH') && c.userPhone !== 'crash-reporter').length },
                        { id: 'pending', label: 'En attente', icon: Clock, count: supportComments.filter(c => c.status === 'pending').length },
                        { id: 'resolved', label: 'Résolus', icon: CheckCircle, count: supportComments.filter(c => c.status === 'approved').length },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterType(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                filterType === tab.id
                                    ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-lg shadow-rose-900/30'
                                    : 'bg-black/20 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <tab.icon size={14} className={filterType === tab.id ? 'text-white' : 'text-slate-400'} />
                            <span>{tab.label}</span>
                            <span className="text-[10px] opacity-75 bg-black/40 px-2 py-0.5 rounded-full">
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Rechercher un ticket..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                    />
                </div>
            </div>

            {/* Bulk Selection Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isAllFilteredSelected}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-white">
                            Sélectionner tout ({filteredSupport.length})
                        </span>
                    </label>
                    {selectedTicketIds.length > 0 && (
                        <span className="text-xs font-black text-rose-400 bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                            {selectedTicketIds.length} sélectionné(s)
                        </span>
                    )}
                </div>

                {selectedTicketIds.length > 0 && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={handleBulkDelete}
                            disabled={isDeletingBulk}
                            className="flex-1 sm:flex-none px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-950/40 disabled:opacity-50 cursor-pointer"
                        >
                            <Trash2 size={14} />
                            Supprimer ({selectedTicketIds.length})
                        </button>
                        <button
                            onClick={handleBulkResolve}
                            disabled={isDeletingBulk}
                            className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
                        >
                            <CheckCircle size={14} />
                            Marquer résolus
                        </button>
                        <button
                            onClick={() => setSelectedTicketIds([])}
                            className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
                            title="Désélectionner tout"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Support List */}
            <div className="space-y-4">
                {filteredSupport.map(item => {
                    const isCrash = item.content.startsWith('[CRASH') || item.userPhone === 'crash-reporter';
                    const displayTitle = isCrash ? getHumanReadableCrashTitle(item.content) : item.userName;
                    const cleanContent = item.content.replace(/^\[SUPPORT TICKET\]\s*/i, '');
                    const isTeacher = (item as any).userRole === 'teacher' || (item as any).role === 'teacher';
                    const isChecked = selectedTicketIds.includes(item.id);

                    return (
                        <div
                            key={item.id}
                            className={`p-5 rounded-2xl border transition-all ${
                                isChecked
                                    ? 'bg-rose-950/40 border-rose-500/70 ring-1 ring-rose-500/50'
                                    : isCrash 
                                    ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50' 
                                    : 'bg-slate-900/40 border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleTicketSelect(item.id)}
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-0 cursor-pointer shrink-0"
                                    />
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                        isCrash ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    }`}>
                                        {isCrash ? <ShieldAlert size={20} /> : <User size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-white text-sm">
                                                {displayTitle}
                                            </h4>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                                isCrash 
                                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                                                    : isTeacher
                                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                            }`}>
                                                {isCrash ? 'CRASH REPORT' : isTeacher ? 'SUPPORT ENSEIGNANT' : 'SUPPORT ÉLÈVE'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {!isCrash && item.userPhone && `Tél: ${item.userPhone} • `}
                                            Date: {formatTicketDate(item.timestamp)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleCopyTicket(item, displayTitle, cleanContent)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                            copiedId === item.id
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-glow'
                                                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10 hover:border-white/20'
                                        }`}
                                        title="Copier le rapport complet dans le presse-papiers"
                                    >
                                        {copiedId === item.id ? (
                                            <>
                                                <Check size={14} className="text-emerald-400" />
                                                <span className="text-emerald-400">Copié !</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={14} />
                                                <span>Copier</span>
                                            </>
                                        )}
                                    </button>

                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                                        item.status === 'pending'
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>
                                        {item.status === 'pending' ? 'En attente' : 'Résolu'}
                                    </span>

                                    {item.status === 'pending' && (
                                        <button
                                            onClick={() => setResponseModal(item)}
                                            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                        >
                                            <CheckCircle size={14} />
                                            Traiter / Répondre
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setDeleteConfirm(item.id)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all"
                                        title="Supprimer le ticket"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Content box */}
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                {cleanContent}
                            </div>

                            {/* Admin response if exists */}
                            {item.adminResponse && (
                                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
                                    <p className="font-bold text-[10px] uppercase text-blue-400 mb-1">Prise en charge par l'administration :</p>
                                    <p>{item.adminResponse}</p>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredSupport.length === 0 && (
                    <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                        <CheckCircle className="text-emerald-400 mx-auto mb-3" size={40} />
                        <h3 className="text-lg font-bold text-white">Aucun ticket de support</h3>
                        <p className="text-xs text-slate-400 mt-1">Tous les bogues et demandes de support sont pris en charge.</p>
                    </div>
                )}
            </div>

            {/* Reply Modal */}
            {responseModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setResponseModal(null)}>
                    <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 max-w-xl w-full space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <Reply className="text-rose-400" />
                            Traiter la demande de support
                        </h3>

                        <div className="bg-black/30 p-4 rounded-xl text-xs text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap border border-white/5 font-mono">
                            {responseModal.content}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-bold">Réponse / Note de résolution :</label>
                            <textarea
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                placeholder="Indiquez la solution ou le message à l'attention de l'élève..."
                                className="w-full h-28 px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-rose-500/50 resize-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setResponseModal(null)}
                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleResolve(responseModal.id)}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                            >
                                <Send size={14} />
                                Marquer comme Résolu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500">
                            <Trash2 size={24} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-black text-white">Supprimer ce ticket ?</h3>
                            <p className="text-xs text-slate-400 mt-1">Le rapport sera définitivement effacé.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20"
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportManager;
