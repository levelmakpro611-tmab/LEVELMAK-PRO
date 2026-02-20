import React, { useState } from 'react';
import { MessageSquare, CheckCircle, XCircle, Trash2, MessageSquareOff, Filter, Reply, Send } from 'lucide-react';
import { UserComment } from '../../types';
import { updateCommentStatus, deleteComment } from '../../services/adminService';

interface CommentManagementProps {
    comments: UserComment[];
    onRefresh: () => void;
}

const CommentManagement: React.FC<CommentManagementProps> = ({ comments, onRefresh }) => {
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [filterCategory, setFilterCategory] = useState<'all' | UserComment['category']>('all');
    const [responseModal, setResponseModal] = useState<UserComment | null>(null);
    const [responseText, setResponseText] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Filter comments
    const filteredComments = comments.filter(comment => {
        const matchesStatus = filterStatus === 'all' || comment.status === filterStatus;
        const matchesCategory = filterCategory === 'all' || comment.category === filterCategory;
        return matchesStatus && matchesCategory;
    });

    const handleApprove = async (commentId: string) => {
        try {
            await updateCommentStatus(commentId, 'approved', responseText);
            setResponseText('');
            setResponseModal(null);
            onRefresh();
        } catch (error) {
            console.error('Error approving comment:', error);
            alert('Erreur lors de l\'approbation');
        }
    };

    const handleReject = async (commentId: string) => {
        try {
            await updateCommentStatus(commentId, 'rejected');
            onRefresh();
        } catch (error) {
            console.error('Error rejecting comment:', error);
            alert('Erreur lors du rejet');
        }
    };

    const handleDelete = async (commentId: string) => {
        try {
            await deleteComment(commentId);
            setDeleteConfirm(null);
            onRefresh();
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Erreur lors de la suppression');
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10">
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <span className="text-xs text-slate-400 font-bold uppercase flex items-center gap-2">
                        <Filter size={14} className="text-blue-400" /> Statut
                    </span>
                    <div className="flex gap-1 bg-black/20 p-1 rounded-xl">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${filterStatus === status
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {status === 'all' && 'Tous'}
                                {status === 'pending' && 'En attente'}
                                {status === 'approved' && 'Approuvés'}
                                {status === 'rejected' && 'Rejetés'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <span className="text-xs text-slate-400 font-bold uppercase flex items-center gap-2">
                        <Filter size={14} className="text-purple-400" /> Catégorie
                    </span>
                    <div className="flex gap-1 bg-black/20 p-1 rounded-xl overflow-x-auto">
                        {(['all', 'quiz', 'flashcards', 'library', 'coach', 'general'] as const).map((category) => (
                            <button
                                key={category}
                                onClick={() => setFilterCategory(category)}
                                className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${filterCategory === category
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Comments Table */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-black/20 border-b border-white/10">
                                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-400">Utilisateur</th>
                                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-400">Catégorie</th>
                                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-400">Note</th>
                                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-400">Commentaire</th>
                                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-400">Statut</th>
                                <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-400">Date</th>
                                <th className="px-6 py-4 text-right text-xs font-black uppercase text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredComments.map((comment) => (
                                <tr key={comment.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{comment.userName}</p>
                                            <p className="text-xs text-slate-500">{comment.userPhone || 'N/A'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md text-xs font-bold uppercase border border-purple-500/20">
                                            {comment.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-yellow-400 font-bold">{comment.rating} ⭐</span>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <p className="text-sm text-slate-300 line-clamp-2 bg-black/20 p-2 rounded-lg">{comment.content}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${comment.status === 'pending'
                                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                    : comment.status === 'approved'
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}
                                        >
                                            {comment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        {new Date(comment.timestamp).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {comment.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => setResponseModal(comment)}
                                                        className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-all border border-green-500/20"
                                                        title="Approuver & Répondre"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(comment.id)}
                                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/20"
                                                        title="Rejeter"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => setDeleteConfirm(comment.id)}
                                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/20"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            {comment.adminResponse && (
                                                <button
                                                    onClick={() => setResponseModal(comment)}
                                                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all border border-blue-500/20"
                                                    title="Voir réponse"
                                                >
                                                    <Reply size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredComments.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquareOff className="text-slate-500" size={32} />
                        </div>
                        <p className="text-slate-500 font-bold">Aucun commentaire trouvé</p>
                    </div>
                )}
            </div>

            {/* Response Modal */}
            {responseModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setResponseModal(null)}>
                    <div className="bg-slate-900 rounded-2xl border border-white/10 p-8 max-w-2xl w-full space-y-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <Reply className="text-blue-400" />
                            Répondre au Commentaire
                        </h3>

                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                        {responseModal.userName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-white font-bold">{responseModal.userName}</span>
                                </div>
                                <span className="text-yellow-400 font-bold text-sm">{responseModal.rating} ⭐</span>
                            </div>
                            <p className="text-slate-300 ml-10">{responseModal.content}</p>
                        </div>

                        {responseModal.adminResponse ? (
                            <div className="bg-blue-600/10 rounded-xl p-6 border border-blue-500/20">
                                <p className="text-xs text-blue-400 font-bold uppercase mb-2">Réponse de l'administrateur</p>
                                <p className="text-white">{responseModal.adminResponse}</p>
                                <p className="text-xs text-slate-500 mt-4 text-right">
                                    {responseModal.adminResponseDate && new Date(responseModal.adminResponseDate).toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <textarea
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    placeholder="Écrivez votre réponse officielle ici..."
                                    className="w-full h-32 px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all resize-none"
                                />

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            setResponseModal(null);
                                            setResponseText('');
                                        }}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={() => handleApprove(responseModal.id)}
                                        disabled={!responseText.trim()}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                                    >
                                        <Send size={18} />
                                        Approuver & Envoyer
                                    </button>
                                </div>
                            </div>
                        )}

                        {responseModal.adminResponse && (
                            <button
                                onClick={() => setResponseModal(null)}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                            >
                                Fermer
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-2xl border border-white/10 p-8 max-w-md w-full space-y-6 shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="text-red-500" size={32} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-white mb-2">Supprimer le commentaire ?</h3>
                            <p className="text-slate-400">
                                Cette action est irréversible. Le commentaire sera définitivement effacé de la base de données.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/20"
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

export default CommentManagement;
