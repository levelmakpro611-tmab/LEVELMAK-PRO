import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    X,
    Check,
    Trash2,
    MessageSquare,
    Trophy,
    Target,
    Clock,
    AlertCircle,
    Info,
    Volume2,
    VolumeX
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { AppNotification } from '../services/notificationService';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
    const { notifications, markNotificationAsRead, clearNotifications, settings, updateSettings, t } = useStore();

    const getIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'achievement': return <Trophy className="text-amber-500" size={18} />;
            case 'mission_available': return <Target className="text-secondary" size={18} />;
            case 'study_reminder': return <Clock className="text-primary" size={18} />;
            case 'streak_risk': return <AlertCircle className="text-red-500" size={18} />;
            case 'exam_approaching': return <Info className="text-blue-500" size={18} />;
            default: return <Bell size={18} />;
        }
    };

    const soundEnabled = settings.soundEnabled && settings.soundSettings.notifications;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[600] bg-slate-950/40 backdrop-blur-[2px]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 bottom-0 z-[700] w-full max-w-sm md:max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/5 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Bell size={20} />
                                </div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t('notifications.title')}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearNotifications}
                                        className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                        title={t('notifications.clearAll')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={() => updateSettings({ 
                                        soundSettings: { ...settings.soundSettings, notifications: !settings.soundSettings.notifications } 
                                    })}
                                    className={`p-2 rounded-lg transition-all ${soundEnabled
                                        ? 'text-blue-500 hover:bg-blue-500/10'
                                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                    title={soundEnabled ? t('notifications.soundsOn') : t('notifications.soundsOff')}
                                >
                                    {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {notifications.length > 0 ? (
                                notifications.map((notif) => (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`group p-4 rounded-2xl border transition-all ${notif.read
                                            ? 'bg-transparent border-slate-100 dark:border-white/5'
                                            : 'bg-primary/5 border-primary/20 shadow-sm'
                                            }`}
                                    >
                                        <div className="flex gap-4">
                                            <div className="shrink-0 mt-1">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${notif.read ? 'bg-slate-100 dark:bg-white/5' : 'bg-white shadow-sm'
                                                    }`}>
                                                    {getIcon(notif.type)}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className={`text-sm font-bold truncate ${notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'
                                                        }`}>
                                                     {notif.title}
                                                 </h4>
                                                 {!notif.read && (
                                                     <button
                                                         onClick={() => markNotificationAsRead(notif.id)}
                                                         className="p-1 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                         title={t('notifications.markRead')}
                                                     >
                                                         <Check size={14} />
                                                     </button>
                                                 )}
                                             </div>
                                             <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                                 {notif.message}
                                             </p>
                                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                                                 <Clock size={10} /> {new Date(notif.timestamp).toLocaleTimeString(settings.language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                             </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                     <div className="w-16 h-16 rounded-[2rem] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-slate-700">
                                         <Bell size={24} />
                                     </div>
                                     <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{t('notifications.empty')}</p>
                                 </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NotificationCenter;
