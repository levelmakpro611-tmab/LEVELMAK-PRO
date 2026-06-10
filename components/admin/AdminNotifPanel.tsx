import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, X, MessageSquare, GraduationCap, Users, Star, RefreshCw, CheckCheck, AlertCircle, Trash2
} from 'lucide-react';
import { adminNotificationService, AdminNotification } from '../../services/adminNotificationService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: (tab: string) => void;
}

const NotifIcon: React.FC<{ type: AdminNotification['type'] }> = ({ type }) => {
    switch (type) {
        case 'new_comment': return <MessageSquare size={18} className="text-blue-400" />;
        case 'new_teacher': return <GraduationCap size={18} className="text-purple-400" />;
        case 'new_user': return <Users size={18} className="text-green-400" />;
        case 'new_rating': return <Star size={18} className="text-yellow-400" />;
        default: return <AlertCircle size={18} className="text-slate-400" />;
    }
};

const bgForType: Record<AdminNotification['type'], string> = {
    new_comment: 'bg-blue-500/10 border-blue-500/20',
    new_teacher: 'bg-purple-500/10 border-purple-500/20',
    new_user: 'bg-green-500/10 border-green-500/20',
    new_rating: 'bg-yellow-500/10 border-yellow-500/20',
    system: 'bg-slate-500/10 border-slate-500/20',
};

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return `Il y a ${Math.floor(diff / 86400)} j`;
}

const AdminNotifPanel: React.FC<Props> = ({ isOpen, onClose, onNavigate }) => {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsub = adminNotificationService.subscribe(setNotifications);
        return unsub;
    }, []);

    const handleRefresh = useCallback(async () => {
        setLoading(true);
        await adminNotificationService.loadInitialNotifications();
        setLoading(false);
    }, []);

    const handleClick = useCallback((notif: AdminNotification) => {
        adminNotificationService.markAsRead(notif.id);
        if (onNavigate) {
            onNavigate(notif as any); // Pass the full notification for deep linking
            onClose();
        }
    }, [onNavigate, onClose]);

    const unread = notifications.filter(n => !n.read).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[400] flex items-start justify-end">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 40, scale: 0.97 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 40, scale: 0.97 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                        className="relative w-full max-w-sm h-full md:h-auto md:mt-20 md:mr-6 bg-background dark:bg-[#0D1526] border border-black/10 dark:border-white/10 md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
                        style={{ maxHeight: '85vh' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-black/10 dark:border-white/5 bg-background dark:bg-transparent">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/15 rounded-xl">
                                    <Bell size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-base">Notifications Admin</h3>
                                    {unread > 0 && (
                                        <p className="text-xs text-blue-400 font-bold">{unread} non lue{unread > 1 ? 's' : ''}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleRefresh}
                                    className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                    title="Actualiser"
                                >
                                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                </button>
                                {unread > 0 && (
                                    <button
                                        onClick={() => adminNotificationService.markAllAsRead()}
                                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                        title="Tout marquer comme lu"
                                    >
                                        <CheckCheck size={16} />
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm("Voulez-vous supprimer toutes les notifications ?")) {
                                                adminNotificationService.clearAllNotifications();
                                            }
                                        }}
                                        className="p-2 hover:bg-rose-500/10 rounded-xl text-rose-500 hover:text-rose-600 transition-colors"
                                        title="Tout supprimer"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-background dark:bg-transparent">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400 dark:text-slate-500">
                                    <Bell size={40} strokeWidth={1.5} />
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Aucun message détecté</p>
                                    <button
                                        onClick={handleRefresh}
                                        className="text-xs text-blue-400 font-bold hover:underline"
                                    >
                                        Actualiser
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {notifications.map(notif => (
                                        <motion.button
                                            key={notif.id}
                                            layoutId={notif.id}
                                            onClick={() => handleClick(notif)}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                adminNotificationService.deleteNotification(notif.id);
                                            }}
                                            className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-all hover:brightness-110 ${bgForType[notif.type]} ${!notif.read ? 'opacity-100' : 'opacity-60 bg-transparent'}`}
                                        >
                                            <div className="mt-0.5 shrink-0">
                                                <NotifIcon type={notif.type} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-slate-900 dark:text-white text-sm truncate">{notif.title}</p>
                                                    {!notif.read && (
                                                        <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                                                <p className="text-[10px] text-slate-600 mt-1 font-bold uppercase tracking-wider">{timeAgo(notif.timestamp)}</p>
                                            </div>
                                            <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        adminNotificationService.deleteNotification(notif.id);
                                                    }}
                                                    className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                {notif.actionTab && (
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                                                        Voir →
                                                    </div>
                                                )}
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AdminNotifPanel;
