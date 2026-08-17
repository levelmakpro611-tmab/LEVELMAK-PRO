import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Trash2, CheckCheck, RefreshCw, Search, MessageSquare, 
    GraduationCap, Users, Star, AlertCircle, ExternalLink, HelpCircle
} from 'lucide-react';
import { adminNotificationService, AdminNotification, AdminNotifType } from '../../services/adminNotificationService';

interface NotificationsManagerProps {
    onNavigate: (notif: any) => void;
}

const NotifIcon: React.FC<{ type: AdminNotification['type'] }> = ({ type }) => {
    switch (type) {
        case 'new_comment': return <MessageSquare size={20} className="text-blue-400" />;
        case 'new_teacher': return <GraduationCap size={20} className="text-purple-400" />;
        case 'new_user': return <Users size={20} className="text-green-400" />;
        case 'new_rating': return <Star size={20} className="text-yellow-400" />;
        case 'system': return <HelpCircle size={20} className="text-orange-400" />;
        default: return <AlertCircle size={20} className="text-slate-400" />;
    }
};

const getBadgeColor = (type: AdminNotification['type']) => {
    switch (type) {
        case 'new_comment': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'new_teacher': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        case 'new_user': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'new_rating': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'system': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
};

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return `Il y a ${Math.floor(diff / 86400)} j`;
}

const NotificationsManager: React.FC<NotificationsManagerProps> = ({ onNavigate }) => {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | AdminNotifType>('all');

    useEffect(() => {
        const unsub = adminNotificationService.subscribe(setNotifications);
        return unsub;
    }, []);

    const handleRefresh = useCallback(async () => {
        setLoading(true);
        await adminNotificationService.loadInitialNotifications();
        setLoading(false);
    }, []);

    const handleMarkAllRead = () => {
        adminNotificationService.markAllAsRead();
    };

    const handleClearAll = () => {
        if (window.confirm("Voulez-vous supprimer toutes les notifications de l'administration ?")) {
            adminNotificationService.clearAllNotifications();
        }
    };

    const handleItemClick = (notif: AdminNotification) => {
        adminNotificationService.markAsRead(notif.id);
        onNavigate(notif);
    };

    const filteredNotifications = useMemo(() => {
        return notifications.filter(notif => {
            const matchesType = filter === 'all' || notif.type === filter;
            const matchesSearch = notif.title.toLowerCase().includes(search.toLowerCase()) || 
                                 notif.message.toLowerCase().includes(search.toLowerCase());
            return matchesType && matchesSearch;
        });
    }, [notifications, filter, search]);

    const unreadCount = useMemo(() => {
        return notifications.filter(n => !n.read).length;
    }, [notifications]);

    return (
        <div className="space-y-6 flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {/* Header controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center print:hidden bg-white dark:bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher une notification..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar justify-start lg:justify-center">
                    {([
                        { id: 'all', label: 'Tout' },
                        { id: 'new_comment', label: 'Commentaires' },
                        { id: 'new_teacher', label: 'Profs' },
                        { id: 'new_user', label: 'Inscriptions' },
                        { id: 'new_rating', label: 'Notes' },
                        { id: 'system', label: 'Système' }
                    ] as const).map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all border whitespace-nowrap ${filter === tab.id
                                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Global actions */}
                <div className="flex justify-end gap-2 shrink-0">
                    <button
                        onClick={handleRefresh}
                        className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-white/5 transition-all flex items-center justify-center"
                        title="Actualiser"
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider"
                        >
                            <CheckCheck size={16} />
                            <span>Tout lire</span>
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-500 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider"
                        >
                            <Trash2 size={16} />
                            <span>Vider</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Notification Stream */}
            <div className="flex-1 bg-white dark:bg-black/40 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col shadow-sm dark:shadow-inner p-6">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-white/5">
                    <h3 className="text-slate-900 dark:text-white font-extrabold flex items-center gap-3">
                        <Bell size={20} className="text-blue-500 dark:text-blue-400" />
                        Centre de Notifications
                        {unreadCount > 0 && (
                            <span className="text-xs px-2.5 py-0.5 bg-red-500 text-white rounded-full font-black uppercase tracking-wider shadow-lg animate-pulse">
                                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </h3>
                    <span className="text-xs text-slate-500 font-bold">{filteredNotifications.length} / {notifications.length} événements</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {filteredNotifications.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60 py-24 gap-4">
                            <Bell size={64} className="text-slate-400 dark:text-slate-700 animate-bounce duration-1000" />
                            <div className="text-center">
                                <p className="font-bold text-lg text-slate-700 dark:text-slate-400">Aucune notification trouvée</p>
                                <p className="text-xs mt-1 text-slate-500">Les nouvelles alertes système ou utilisateur s'afficheront ici.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence initial={false}>
                                {filteredNotifications.map((notif) => (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={`group relative flex items-start gap-4 p-5 rounded-2xl border transition-all hover:border-slate-300 dark:hover:border-white/15 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 ${!notif.read ? 'border-blue-500/30' : 'border-slate-200 dark:border-transparent opacity-75'}`}
                                    >
                                        {/* Status badge left */}
                                        {!notif.read && (
                                            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 rounded-l-2xl shadow-glow" />
                                        )}

                                        {/* Icon */}
                                        <div className={`p-3 rounded-xl border shrink-0 ${getBadgeColor(notif.type)}`}>
                                            <NotifIcon type={notif.type} />
                                        </div>

                                        {/* Body */}
                                        <div className="flex-1 min-w-0 self-center">
                                            <div className="flex justify-between items-start gap-4">
                                                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                                    {notif.title}
                                                </h4>
                                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold border shrink-0 ${getBadgeColor(notif.type)}`}>
                                                    {notif.type === 'new_comment' && 'Commentaire'}
                                                    {notif.type === 'new_teacher' && 'Professeur'}
                                                    {notif.type === 'new_user' && 'Inscription'}
                                                    {notif.type === 'new_rating' && 'Évaluation'}
                                                    {notif.type === 'system' && 'Système'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-800 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">{notif.message}</p>
                                            <span className="inline-block text-[10px] text-slate-500 dark:text-slate-500 font-extrabold uppercase tracking-widest mt-2">{timeAgo(notif.timestamp)}</span>
                                        </div>

                                        {/* Actions right */}
                                        <div className="flex flex-col md:flex-row items-center gap-2 self-center shrink-0">
                                            {!notif.read && (
                                                <button
                                                    onClick={() => adminNotificationService.markAsRead(notif.id)}
                                                    className="p-2 bg-slate-200/80 dark:bg-white/5 hover:bg-blue-500/20 border border-transparent hover:border-blue-500/30 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all"
                                                    title="Marquer comme lu"
                                                >
                                                    <CheckCheck size={16} />
                                                </button>
                                            )}
                                            {notif.actionTab && (
                                                <button
                                                    onClick={() => handleItemClick(notif)}
                                                    className="p-2 bg-slate-200/80 dark:bg-white/5 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/30 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl transition-all"
                                                    title="Inspecter l'élément"
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => adminNotificationService.deleteNotification(notif.id)}
                                                className="p-2 bg-slate-200/80 dark:bg-white/5 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-500 rounded-xl transition-all"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsManager;

