import React, { useState, useEffect } from 'react';
import {
    Shield, BarChart3, Users, Activity, MessageSquare, Star, Download, LogOut,
    Home, TrendingUp, UserCheck, Settings, Menu, X, Bell, Magnet, Trophy, ShoppingBag, Printer, RefreshCw, Trash2, LifeBuoy, Crown, Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import Skeleton from '../components/Skeleton';
import {
    getGlobalStats,
    getUserAnalytics,
    getAllComments,
    getSupportTickets,
    getAllRatings,
    getAverageRatings,
    logAdminAction,
    getDemographicStats,
    exportUserData,
    resetAllRatings
} from '../services/adminService';
import { getPendingApplications, getTotalTeachersCount } from '../services/tutorService';
import {
    AdminStats,
    AdminUserAnalytics,
    UserComment,
    PlatformRating,
    AdminLog
} from '../types';
import { adminNotificationService } from '../services/adminNotificationService';
import AdminNotifPanel from '../components/admin/AdminNotifPanel';

const StatisticsPanel = React.lazy(() => import('../components/admin/StatisticsPanel'));
const UserManagement = React.lazy(() => import('../components/admin/UserManagement'));
const SubscriptionManager = React.lazy(() => import('../components/admin/SubscriptionManager'));
const CommentManagement = React.lazy(() => import('../components/admin/CommentManagement'));
const ExportTools = React.lazy(() => import('../components/admin/ExportTools'));
const DemographicTable = React.lazy(() => import('../components/admin/DemographicTable'));
const ActivityMonitor = React.lazy(() => import('../components/admin/ActivityMonitor'));
const RetentionChart = React.lazy(() => import('../components/admin/RetentionChart'));
const GamificationPanel = React.lazy(() => import('../components/admin/GamificationPanel'));
const SecurityPanel = React.lazy(() => import('../components/admin/SecurityPanel'));
const ShopManager = React.lazy(() => import('../components/admin/ShopManager'));
const TeacherModeration = React.lazy(() => import('../components/admin/TeacherModeration'));
const NotificationsManager = React.lazy(() => import('../components/admin/NotificationsManager'));
const SupportManager = React.lazy(() => import('../components/admin/SupportManager'));
const StudentBehaviorDataset = React.lazy(() => import('../components/admin/StudentBehaviorDataset'));

type Tab = 'overview' | 'stats' | 'users' | 'subscriptions' | 'comments' | 'support' | 'ratings' | 'export' | 'monitor' | 'retention' | 'gamification' | 'security' | 'shop' | 'teachers' | 'notifications' | 'behavior';

const AdminDashboard: React.FC = () => {
    const { user, logout, changePassword, updateProfile } = useStore();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUserAnalytics[]>([]);
    const [comments, setComments] = useState<UserComment[]>([]);
    const [supportTickets, setSupportTickets] = useState<UserComment[]>([]);
    const [ratings, setRatings] = useState<PlatformRating[]>([]);
    const [teacherApps, setTeacherApps] = useState<any[]>([]);
    const [totalTeachers, setTotalTeachers] = useState(0);
    const [averageRatings, setAverageRatings] = useState<any>(null);
    const [demographicStats, setDemographicStats] = useState<any>(null);
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [adminNotifCount, setAdminNotifCount] = useState(0);
    const [loadingStates, setLoadingStates] = useState<Record<Tab, boolean>>({
        overview: false, stats: false, users: false, subscriptions: false, comments: false, support: false, ratings: false,
        export: false, monitor: false, retention: false, gamification: false, security: false, shop: false, teachers: false, notifications: false, behavior: false
    });
    const [highlightItemId, setHighlightItemId] = useState<string | null>(null);

    // Profile & Password settings modal state
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileName, setProfileName] = useState(user?.name || '');
    const [profilePhone, setProfilePhone] = useState(user?.phoneNumber || '');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    const openProfileModal = () => {
        setProfileName(user?.name || '');
        setProfilePhone(user?.phoneNumber || '');
        setOldPassword('');
        setNewPassword('');
        setProfileError('');
        setProfileSuccess('');
        setIsProfileModalOpen(true);
        setIsSettingsOpen(false);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileError('');
        setProfileSuccess('');

        try {
            // 1. Update Name/Phone in Profiles table
            if (profileName.trim() !== (user?.name || '') || profilePhone.trim() !== (user?.phoneNumber || '')) {
                await updateProfile(profileName, profilePhone);
                setProfileSuccess('Profil mis à jour avec succès !');
            }

            // 2. Change password if requested
            if (newPassword) {
                if (oldPassword.length < 6 || newPassword.length < 6) {
                    throw new Error('Les mots de passe doivent comporter au moins 6 caractères.');
                }
                await changePassword(oldPassword, newPassword);
                setProfileSuccess(prev => prev ? prev + ' et mot de passe mis à jour !' : 'Mot de passe mis à jour avec succès !');
                setOldPassword('');
                setNewPassword('');
            }
        } catch (error: any) {
            console.error('Error updating admin profile:', error);
            setProfileError(error.message || 'Une erreur est survenue lors de la mise à jour.');
        } finally {
            setProfileLoading(false);
        }
    };

    const DEFAULT_STATS: AdminStats = {
        totalUsers: 0, activeUsers: 0, newUsersToday: 0, newUsersWeek: 0, newUsersMonth: 0, newUsersYear: 0,
        quizzesGenerated: 0, quizzesToday: 0, flashcardsCreated: 0, flashcardsToday: 0,
        storiesWritten: 0, storiesToday: 0, booksRead: 0, booksToday: 0,
        totalLearningHours: 0, averageEngagementRate: 0
    };

    useEffect(() => {
        // Start admin realtime notification listener
        adminNotificationService.startListening();
        adminNotificationService.loadInitialNotifications();

        // Subscribe to unread count changes
        const unsub = adminNotificationService.subscribe(notifs => {
            setAdminNotifCount(notifs.filter(n => !n.read).length);
        });

        // Load cached data...
        const cachedOverview = localStorage.getItem('admin_cache_overview');
        if (cachedOverview) {
            try {
                const { stats, comments, ratings, teacherApps, totalTeachers: cachedTotalTeachers, averageRatings } = JSON.parse(cachedOverview);
                if (stats && stats.totalUsers > 1) setStats(stats);
                if (comments) setComments(comments);
                if (ratings) setRatings(ratings);
                if (teacherApps) setTeacherApps(teacherApps);
                if (cachedTotalTeachers !== undefined) setTotalTeachers(cachedTotalTeachers);
                if (averageRatings) setAverageRatings(averageRatings);
                setLoading(false);
            } catch (e) { console.error("Error parsing admin cache", e); }
        }

        loadTab('overview');
        if (user) {
            logAdminAction(user.id, user.name, 'login', { timestamp: new Date().toISOString() });
        }

        return () => {
            unsub();
            adminNotificationService.stopListening();
        };
    }, []);

    useEffect(() => {
        loadTab(activeTab);
    }, [activeTab, period]);

    const handleRefresh = async () => {
        // Clear local cache for stats
        localStorage.removeItem('admin_cache_overview');
        await loadTab(activeTab);
    };

    // Close sidebar on mobile when a tab is selected
    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    };

    const handleNotificationClick = (notif: any) => {
        setHighlightItemId(null); // Reset first

        if (notif.type === 'system') {
            setActiveTab('support');
            if (notif.metadata?.commentId) setHighlightItemId(notif.metadata.commentId);
        } else if (notif.type === 'new_comment') {
            setActiveTab('comments');
            if (notif.metadata?.commentId) setHighlightItemId(notif.metadata.commentId);
        } else if (notif.type === 'new_rating') {
            setActiveTab('ratings');
            if (notif.metadata?.ratingId) setHighlightItemId(notif.metadata.ratingId);
        } else if (notif.type === 'new_teacher') {
            setActiveTab('teachers');
            if (notif.metadata?.teacherId) setHighlightItemId(notif.metadata.teacherId);
        } else if (notif.type === 'new_user') {
            setActiveTab('users');
            if (notif.metadata?.userId) setHighlightItemId(notif.metadata.userId);
        }
        setIsNotifOpen(false);
    };

    const loadTab = async (tab: Tab) => {
        if (loadingStates[tab]) return;
        setLoadingStates(prev => ({ ...prev, [tab]: true }));
        try {
            switch (tab) {
                case 'overview':
                    const [sData, cData, supData, rData, avgR, tData, teachersCountResult] = await Promise.allSettled([
                        getGlobalStats(period), 
                        getAllComments(50), 
                        getSupportTickets(50),
                        getAllRatings(50), 
                        getAverageRatings(),
                        getPendingApplications(),
                        getTotalTeachersCount()
                    ]);
                    
                    if (sData.status === 'rejected') console.error('getGlobalStats rejected:', sData.reason);
                    if (cData.status === 'rejected') console.error('getAllComments rejected:', cData.reason);
                    if (supData.status === 'rejected') console.error('getSupportTickets rejected:', supData.reason);
                    if (rData.status === 'rejected') console.error('getAllRatings rejected:', rData.reason);
                    if (avgR.status === 'rejected') console.error('getAverageRatings rejected:', avgR.reason);
                    if (tData.status === 'rejected') console.error('getPendingApplications rejected:', tData.reason);
                    if (teachersCountResult.status === 'rejected') console.error('getTotalTeachersCount rejected:', teachersCountResult.reason);

                    const newStats = sData.status === 'fulfilled' ? sData.value : null;
                    const newComments = cData.status === 'fulfilled' ? cData.value : [];
                    const newSupport = supData.status === 'fulfilled' ? supData.value : [];
                    const newRatings = rData.status === 'fulfilled' ? rData.value : [];
                    const newTeacherApps = tData.status === 'fulfilled' ? tData.value : [];
                    const newAvgR = avgR.status === 'fulfilled' ? avgR.value : null;
                    const newTotalTeachers = teachersCountResult.status === 'fulfilled' ? teachersCountResult.value : 0;

                    if (newStats) setStats(newStats);
                    else if (!stats) setStats(DEFAULT_STATS); // Prevent infinite skeleton state

                    setComments(newComments);
                    setSupportTickets(newSupport);
                    setRatings(newRatings);
                    setTeacherApps(newTeacherApps);
                    setTotalTeachers(newTotalTeachers);
                    setAverageRatings(newAvgR || { overall: 0, totalRatings: 0, features: {} });
                    localStorage.setItem('admin_cache_overview', JSON.stringify({
                        stats: newStats || DEFAULT_STATS,
                        comments: newComments,
                        supportTickets: newSupport,
                        ratings: newRatings,
                        teacherApps: newTeacherApps,
                        totalTeachers: newTotalTeachers,
                        averageRatings: newAvgR || { overall: 0, totalRatings: 0, features: {} },
                        timestamp: Date.now()
                    }));
                    break;
                case 'users':
                case 'subscriptions':
                    try {
                        const result = await getUserAnalytics(500);
                        setUsers(result);
                    } catch (e) {
                        console.error('getUserAnalytics failed:', e);
                        setUsers([]);
                    }
                    break;
                case 'comments':
                    try {
                        const result = await getAllComments(100);
                        setComments(result);
                    } catch (e) {
                        console.error('getAllComments failed:', e);
                        setComments([]);
                    }
                    break;
                case 'support':
                    try {
                        const result = await getSupportTickets(100);
                        setSupportTickets(result);
                    } catch (e) {
                        console.error('getSupportTickets failed:', e);
                        setSupportTickets([]);
                    }
                    break;
                case 'ratings':
                    try {
                        const [ratingsData, avgRatingsData] = await Promise.all([getAllRatings(50), getAverageRatings()]);
                        setRatings(ratingsData);
                        setAverageRatings(avgRatingsData);
                    } catch (e) {
                        console.error('ratings/averageRatings load failed:', e);
                        setRatings([]);
                    }
                    break;
                case 'stats':
                    if (!demographicStats) {
                        const [statsResult, demogResult] = await Promise.allSettled([getGlobalStats(period), getDemographicStats()]);
                        if (statsResult.status === 'fulfilled') setStats(statsResult.value);
                        if (demogResult.status === 'fulfilled') setDemographicStats(demogResult.value);
                    } else {
                        const statsData = await getGlobalStats(period);
                        setStats(statsData);
                    }
                    break;
                case 'export':
                    try {
                        const [uData, cData, dData] = await Promise.all([
                            exportUserData(),
                            getAllComments(100),
                            getDemographicStats()
                        ]);
                        setUsers(uData);
                        setComments(cData);
                        setDemographicStats(dData);
                    } catch (err) {
                        console.error("Error loading export data", err);
                    }
                    break;
                case 'monitor':
                case 'retention':
                case 'gamification':
                case 'security':
                    // Add a small delay for demo/visual consistency if needed, 
                    // but usually we just wait for the component to be ready via Suspense
                    await new Promise(resolve => setTimeout(resolve, 800));
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tab} data:`, error);
        } finally {
            setLoadingStates(prev => ({ ...prev, [tab]: false }));
            setLoading(false); // No longer blocks the whole UI, but keeps compatibility
        }
    };

    const handleLogout = () => {
        if (user) logAdminAction(user.id, user.name, 'logout', { timestamp: new Date().toISOString() });
        logout();
    };

    const markAllAsRead = () => {
        adminNotificationService.markAllAsRead();
    };

    const handleResetRatings = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer TOUTES les évaluations de la plateforme ? Cette action est irréversible et ramènera la note à zéro.")) return;
        setLoading(true);
        try {
            await resetAllRatings();
            localStorage.removeItem('admin_cache_overview');
            await loadTab('ratings');
            alert("Toutes les évaluations ont été réinitialisées à zéro.");
        } catch (error: any) {
            console.error("Error resetting ratings:", error);
            alert("Erreur lors de la réinitialisation : " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Initial loading is now handled inside the content area with skeletons
    // to allow the sidebar and header to be interactive immediately.

    const navItems = [
        { id: 'overview' as Tab, icon: Home, label: "Vue d'ensemble", badge: null },
        { id: 'notifications' as Tab, icon: Bell, label: 'Notifications', badge: adminNotifCount },
        { id: 'monitor' as Tab, icon: Activity, label: 'Spy Mode', badge: null },
        { id: 'retention' as Tab, icon: Magnet, label: 'Rétention', badge: null },
        { id: 'gamification' as Tab, icon: Trophy, label: 'Gamification', badge: null },
        { id: 'security' as Tab, icon: Shield, label: 'Sécurité', badge: null },
        { id: 'stats' as Tab, icon: TrendingUp, label: 'Statistiques', badge: null },
        { id: 'users' as Tab, icon: Users, label: 'Utilisateurs', badge: users.length },
        { id: 'subscriptions' as Tab, icon: Crown, label: 'Abonnements & Premium', badge: users.filter(u => u.isPremium || u.subscriptionTier !== 'free').length },
        { id: 'comments' as Tab, icon: MessageSquare, label: 'Commentaires Élèves', badge: comments.filter(c => c.status === 'pending').length },
        { id: 'support' as Tab, icon: LifeBuoy, label: 'Messages & Support', badge: supportTickets.filter(c => c.status === 'pending').length },
        { id: 'ratings' as Tab, icon: Star, label: 'Évaluations', badge: null },
        { id: 'export' as Tab, icon: Download, label: 'Exports', badge: null },
        { id: 'shop' as Tab, icon: ShoppingBag, label: 'Boutique', badge: null },
        { id: 'teachers' as Tab, icon: Shield, label: 'Enseignants', badge: null },
        { id: 'behavior' as Tab, icon: Brain, label: 'Comportement Élèves & IA', badge: null },
    ];

    const activeNav = navItems.find(item => item.id === activeTab);

    return (
        <div className="min-h-screen bg-background flex relative overflow-hidden transition-colors">
            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[50px]"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[50px]"></div>
            </div>

            {/* Overlay backdrop for mobile sidebar */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — overlay on mobile, permanent on desktop */}
            <aside className={`
                fixed lg:relative z-40 top-0 left-0 h-full
                w-72 flex flex-col
                bg-background dark:bg-slate-950/95 lg:bg-white/5 backdrop-blur-xl
                border-r border-black/5 dark:border-white/10
                transition-transform duration-300
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                lg:w-64 xl:w-72 print:hidden
            `}>
                {/* Logo */}
                <div className="p-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                        <img 
                            src="/logo.png" 
                            alt="Levelmak Logo" 
                            className="w-10 h-10 object-contain shrink-0" 
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fb = document.getElementById('sidebar-logo-fallback');
                                if (fb) fb.style.display = 'flex';
                            }}
                        />
                        <div id="sidebar-logo-fallback" style={{ display: 'none' }} className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl items-center justify-center shadow-lg shadow-blue-500/50 shrink-0">
                            <Shield className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="text-base font-black text-slate-900 dark:text-white transition-colors">LEVELMAK</h1>
                            <p className="text-[10px] text-blue-500 dark:text-blue-400 font-bold transition-colors">Admin Panel</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
                    >
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-sm ${activeTab === item.id
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
                            <span className="flex-1 text-left font-bold">{item.label}</span>
                            {item.badge !== null && item.badge > 0 && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* User Profile */}
                <div className="p-3 border-t border-black/5 dark:border-white/10 transition-colors">
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 space-y-3 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
                                <UserCheck className="text-white" size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-slate-900 dark:text-white font-bold text-sm truncate transition-colors">{user?.name}</p>
                                <p className="text-[10px] text-slate-500">Administrateur</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut size={12} />
                            Déconnexion
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden bg-background transition-colors">
                {/* Top Bar */}
                <div className="sticky top-0 z-20 bg-background/80 dark:bg-slate-950/80 lg:bg-white/5 backdrop-blur-xl border-b border-black/5 dark:border-white/10 shrink-0 transition-colors print:hidden" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
                    <div className="px-4 md:px-6 py-3 flex items-center gap-3">
                        {/* Hamburger for mobile */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all lg:hidden shrink-0"
                        >
                            <Menu size={20} className="text-slate-300" />
                        </button>

                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white truncate transition-colors">
                                {activeNav?.label}
                            </h2>
                            <p className="text-xs text-slate-400 truncate hidden sm:block">
                                {activeTab === 'overview' && 'Tableau de bord principal'}
                                {activeTab === 'stats' && 'Analyses détaillées de la plateforme'}
                                {activeTab === 'users' && 'Gestion complète des utilisateurs'}
                                {activeTab === 'comments' && 'Modération des commentaires'}
                                {activeTab === 'ratings' && 'Évaluations de la plateforme'}
                                {activeTab === 'export' && 'Téléchargement des rapports'}
                                {activeTab === 'monitor' && 'Surveillance temps réel des activités'}
                                {activeTab === 'retention' && 'Analyse des cohortes et de la fidélisation'}
                                {activeTab === 'gamification' && 'Gestion des récompenses, badges et classements'}
                                {activeTab === 'security' && 'Modération et sécurité des utilisateurs'}
                                {activeTab === 'shop' && 'Gestion de la boutique'}
                            </p>
                        </div>

                            <button 
                                onClick={handleRefresh}
                                disabled={loadingStates[activeTab]}
                                className={`p-2 rounded-xl transition-all bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 ${loadingStates[activeTab] ? 'animate-spin' : ''}`}
                                title="Actualiser les données"
                            >
                                <RefreshCw size={18} className="text-slate-500 dark:text-slate-400" />
                            </button>
                            <button 
                                onClick={() => setIsPrintModalOpen(true)}
                                className="p-2 rounded-xl transition-all bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                                title="Imprimer un rapport"
                            >
                                <Printer size={18} className="text-slate-500 dark:text-slate-400" />
                            </button>
                            {activeTab === 'ratings' && (
                                <button 
                                    onClick={handleResetRatings}
                                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-500 hover:text-rose-600 transition-colors border border-rose-500/20"
                                    title="Réinitialiser toutes les évaluations"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                            <button 
                                onClick={() => { setIsNotifOpen(!isNotifOpen); setIsSettingsOpen(false); }}
                                className={`p-2 rounded-xl transition-all relative ${isNotifOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}
                            >
                                <Bell size={18} className={isNotifOpen ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                                {adminNotifCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse shadow-lg">{adminNotifCount > 9 ? '' : ''}</span>
                                )}
                            </button>
                            <button 
                                onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsNotifOpen(false); }}
                                className={`p-2 rounded-xl transition-all ${isSettingsOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}
                            >
                                <Settings size={18} className={isSettingsOpen ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                            </button>

                            {/* Notification Panel — New real-time system */}
                            <AdminNotifPanel
                                isOpen={isNotifOpen}
                                onClose={() => setIsNotifOpen(false)}
                                onNavigate={(notif) => handleNotificationClick(notif)}
                            />


                            {/* Settings Panel */}
                            <AnimatePresence>
                                {isSettingsOpen && (
                                    <div 
                                        className="absolute top-14 right-0 w-64 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                        style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}
                                    >
                                        <div className="p-4 border-b border-white/10 bg-white/5">
                                            <h3 className="text-sm font-black text-white">Réglages Administration</h3>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-xs">
                                                        {user?.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-black text-white truncate">{user?.name}</p>
                                                        <p className="text-[9px] text-slate-500 font-bold truncate">{user?.phoneNumber}</p>
                                                    </div>
                                                </div>
                                                <div className="py-2 border-t border-white/5">
                                                    <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest">Rôle: FULL ADMIN</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <button 
                                                    onClick={openProfileModal}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[11px] font-bold"
                                                >
                                                    <Settings size={14} /> Modifier Profil
                                                </button>
                                                <button 
                                                    onClick={() => { setActiveTab('security'); setIsSettingsOpen(false); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[11px] font-bold"
                                                >
                                                    <Shield size={14} /> Sécurité Table
                                                </button>
                                            </div>
                                            <div className="pt-2 border-t border-white/10">
                                                <button 
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-black text-[10px] uppercase tracking-widest"
                                                >
                                                    <LogOut size={14} />
                                                    Déconnexion
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Print Header (Only visible when printing) */}
                    <div className="hidden print:flex w-full mb-8 border-b border-slate-200 dark:border-slate-800 pb-6 px-8 pt-8 items-center gap-6">
                        <img src="/tmab_logo.png" alt="TMAB" className="w-24 h-24 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                {activeTab === 'users' && "Rapport : Liste des Utilisateurs"}
                                {activeTab === 'comments' && "Rapport : Commentaires Utilisateurs"}
                                {activeTab === 'monitor' && "Rapport : Moniteur d'Activité (Spy Mode)"}
                                {activeTab === 'stats' && "Rapport : Statistiques & Démographie"}
                                {activeTab !== 'users' && activeTab !== 'comments' && activeTab !== 'monitor' && activeTab !== 'stats' && "Rapport Administratif"}
                            </h1>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">TMAB GROUP - Excellence Éducative</p>
                            <p className="text-sm text-slate-500 mt-2">Généré par Levelmak Pro | Date : {new Date().toLocaleString('fr-FR')}</p>
                        </div>
                    </div>

                    {/* Global Print Modal */}
                    <AnimatePresence>
                        {isPrintModalOpen && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 w-full max-w-md shadow-2xl"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                                                <Printer size={24} />
                                            </div>
                                            Imprimer
                                        </h3>
                                        <button onClick={() => setIsPrintModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed">
                                        Sélectionnez la section que vous souhaitez afficher et imprimer :
                                    </p>
                                    <div className="space-y-3">
                                        {[
                                            { id: 'stats', label: 'Statistiques & Démographie', icon: TrendingUp },
                                            { id: 'users', label: 'Liste des Utilisateurs', icon: Users },
                                            { id: 'monitor', label: 'Moniteur d\'Activité', icon: Activity },
                                            { id: 'comments', label: 'Commentaires Utilisateurs', icon: MessageSquare },
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setIsPrintModalOpen(false);
                                                    setActiveTab(item.id as Tab);
                                                    // Add a small delay for the component to render and data to load before opening print dialog
                                                    setTimeout(() => {
                                                        window.print();
                                                    }, 800);
                                                }}
                                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all font-bold group"
                                            >
                                                <div className="p-2 bg-black/20 rounded-lg text-slate-400 group-hover:text-blue-400 transition-colors">
                                                    <item.icon size={20} />
                                                </div>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Modal de Modification de Profil */}
                    <AnimatePresence>
                        {isProfileModalOpen && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)}>
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-slate-900 border border-white/10 rounded-[2rem] p-6 md:p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                                            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                                                <Settings size={24} />
                                            </div>
                                            Modifier Profil & Sécurité
                                        </h3>
                                        <button 
                                            onClick={() => setIsProfileModalOpen(false)} 
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                                        >
                                            <X size={20}/>
                                        </button>
                                    </div>

                                    <form onSubmit={handleUpdateProfile} className="space-y-5">
                                        {/* Alerts */}
                                        {profileError && (
                                            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold">
                                                {profileError}
                                            </div>
                                        )}
                                        {profileSuccess && (
                                            <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold">
                                                {profileSuccess}
                                            </div>
                                        )}

                                        {/* Profile info */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Informations de Profil</h4>
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400 font-bold">Nom Complet</label>
                                                <input
                                                    type="text"
                                                    value={profileName}
                                                    onChange={(e) => setProfileName(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none text-sm font-medium"
                                                    placeholder="Nom complet"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400 font-bold">Téléphone / Identifiant</label>
                                                <input
                                                    type="text"
                                                    value={profilePhone}
                                                    onChange={(e) => setProfilePhone(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none text-sm font-medium"
                                                    placeholder="Identifiant de connexion"
                                                />
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-white/10 my-4" />

                                        {/* Password change */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Changer de mot de passe (Optionnel)</h4>
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400 font-bold">Ancien mot de passe</label>
                                                <input
                                                    type="password"
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none text-sm font-medium"
                                                    placeholder="Entrez votre ancien mot de passe"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400 font-bold">Nouveau mot de passe</label>
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none text-sm font-medium"
                                                    placeholder="Entrez le nouveau mot de passe"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsProfileModalOpen(false)}
                                                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase text-xs transition-all active:scale-95"
                                                disabled={profileLoading}
                                            >
                                                Fermer
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={profileLoading}
                                                className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 hover:scale-102 transition-all shadow-glow disabled:opacity-50"
                                            >
                                                {profileLoading ? 'Mise à jour...' : 'Sauvegarder'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <React.Suspense fallback={
                        <div className="space-y-4 animate-pulse p-4">
                            <div className="h-32 bg-black/5 dark:bg-white/5 rounded-2xl"></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-black/5 dark:bg-white/5 rounded-xl"></div>)}
                            </div>
                            <div className="h-48 bg-black/5 dark:bg-white/5 rounded-2xl"></div>
                        </div>
                    }>
                        {loadingStates[activeTab] ? (
                            <div className="space-y-6">
                                <Skeleton className="h-32 w-full" />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
                                </div>
                                <Skeleton className="h-64 w-full" />
                            </div>
                        ) : (
                            <>
                                {activeTab === 'overview' && (
                                    stats ? (
                                        <OverviewTab 
                                            stats={stats} 
                                            users={users} 
                                            comments={comments} 
                                            averageRatings={averageRatings} 
                                            onNavigate={setActiveTab}
                                            teacherApps={teacherApps}
                                            totalTeachers={totalTeachers}
                                        />
                                    ) : (
                                        <div className="space-y-6">
                                            <Skeleton className="h-32 w-full" />
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
                                            </div>
                                            <Skeleton className="h-64 w-full" />
                                        </div>
                                    )
                                )}
                                {activeTab === 'notifications' && <NotificationsManager onNavigate={handleNotificationClick} />}
                                {activeTab === 'stats' && (
                                    <div className="space-y-6">
                                        <StatisticsPanel stats={stats} period={period} onPeriodChange={setPeriod} />
                                        <DemographicTable stats={demographicStats} />
                                    </div>
                                )}
                                {activeTab === 'users' && <UserManagement users={users} onRefresh={() => loadTab('users')} />}
                                {activeTab === 'subscriptions' && <SubscriptionManager users={users} onRefresh={() => loadTab('subscriptions')} />}
                                {activeTab === 'comments' && <CommentManagement comments={comments} onRefresh={() => loadTab('comments')} highlightId={highlightItemId} />}
                                {activeTab === 'support' && <SupportManager comments={supportTickets} onRefresh={() => loadTab('support')} />}
                                {activeTab === 'ratings' && <RatingsTab ratings={ratings} averageRatings={averageRatings} totalUsers={stats?.totalUsers || 0} highlightId={highlightItemId} />}
                                {activeTab === 'export' && stats && <ExportTools stats={stats} users={users} comments={comments} period={period} demographicStats={demographicStats} />}
                                {activeTab === 'shop' && <ShopManager />}
                                {activeTab === 'monitor' && <ActivityMonitor />}
                                {activeTab === 'retention' && <RetentionChart />}
                                {activeTab === 'gamification' && <GamificationPanel />}
                                {activeTab === 'security' && <SecurityPanel />}
                                {activeTab === 'teachers' && <TeacherModeration />}
                                {activeTab === 'behavior' && <StudentBehaviorDataset />}
                            </>
                        )}
                    </React.Suspense>
                </div>
            </main>
        </div>
    );
};

// Overview Tab
interface OverviewTabProps {
    stats: AdminStats;
    users: AdminUserAnalytics[];
    comments: UserComment[];
    averageRatings: any;
    teacherApps: any[];
    totalTeachers: number;
    onNavigate: (tab: Tab) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ stats, users, comments, averageRatings, teacherApps, totalTeachers, onNavigate }) => (
    <div className="space-y-4 md:space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            <StatCard onClick={() => onNavigate('users')} title="Utilisateurs" value={stats.totalUsers} subtitle={`${stats.activeUsers} actifs`} icon={<Users size={20} />} color="from-blue-500 to-cyan-500" trend="+12%" />
            <StatCard onClick={() => onNavigate('monitor')} title="Quiz Générés" value={stats.quizzesGenerated} subtitle={`${stats.quizzesToday} aujourd'hui`} icon={<Activity size={20} />} color="from-purple-500 to-pink-500" trend="+8%" />
            <StatCard onClick={() => onNavigate('stats')} title="Flashcards" value={stats.flashcardsCreated} subtitle={`${stats.flashcardsToday} aujourd'hui`} icon={<BarChart3 size={20} />} color="from-orange-500 to-red-500" trend="+15%" />
            <StatCard onClick={() => onNavigate('retention')} title="Engagement" value={`${stats.averageEngagementRate.toFixed(1)}%`} subtitle="Taux d'activité" icon={<TrendingUp size={20} />} color="from-green-500 to-emerald-500" trend="+5%" />
            <StatCard onClick={() => onNavigate('teachers')} title="Enseignants" value={totalTeachers} subtitle={`${teacherApps.length} en attente`} icon={<Shield size={20} />} color="from-yellow-500 to-amber-500" trend="Nouveau" />
        </div>

        {/* Activity Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-4 md:p-6 transition-colors shadow-sm">
                <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2 transition-colors">
                    <Activity size={18} className="text-blue-500 dark:text-blue-400" /> Activité Récente
                </h3>
                <div className="space-y-2">
                    {[
                        { label: "Nouveaux utilisateurs (Auj.)", value: stats.newUsersToday, color: 'bg-blue-500' },
                        { label: 'Nouveaux utilisateurs (Sem.)', value: stats.newUsersWeek, color: 'bg-purple-500' },
                        { label: 'Nouveaux utilisateurs (Mois)', value: stats.newUsersMonth, color: 'bg-pink-500' },
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-white/5 rounded-lg px-2 transition-all" onClick={() => onNavigate('users')}>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`}></div>
                                <span className="text-xs md:text-sm text-slate-600 dark:text-slate-300 transition-colors">{item.label}</span>
                            </div>
                            <span className="text-slate-900 dark:text-white font-bold text-sm transition-colors">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-4 md:p-6 transition-colors shadow-sm">
                <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2 transition-colors">
                    <MessageSquare size={18} className="text-purple-500 dark:text-purple-400" /> Commentaires
                </h3>
                <div className="space-y-2">
                    {[
                        { label: 'En attente', value: comments.filter(c => c.status === 'pending').length, color: 'bg-orange-500' },
                        { label: 'Approuvés', value: comments.filter(c => c.status === 'approved').length, color: 'bg-green-500' },
                        { label: 'Rejetés', value: comments.filter(c => c.status === 'rejected').length, color: 'bg-red-500' },
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-white/5 rounded-lg px-2 transition-all" onClick={() => onNavigate('comments')}>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`}></div>
                                <span className="text-xs md:text-sm text-slate-600 dark:text-slate-300 transition-colors">{item.label}</span>
                            </div>
                            <span className="text-slate-900 dark:text-white font-bold text-sm transition-colors">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-4 md:p-6 transition-colors shadow-sm">
                <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2 transition-colors">
                    <Shield size={18} className="text-yellow-500" /> Enseignants
                </h3>
                <div className="space-y-2">
                    {[
                        { label: 'Candidatures en attente', value: teacherApps.length, color: 'bg-yellow-500' },
                        { label: 'Enseignants Validés', value: Math.max(0, totalTeachers - teacherApps.length), color: 'bg-green-500' },
                        { label: 'Total Enseignants', value: totalTeachers, color: 'bg-blue-500' },
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-white/5 rounded-lg px-2 transition-all" onClick={() => onNavigate('teachers')}>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`}></div>
                                <span className="text-xs md:text-sm text-slate-600 dark:text-slate-300 transition-colors">{item.label}</span>
                            </div>
                            <span className="text-slate-900 dark:text-white font-bold text-sm transition-colors">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Platform Rating */}
        <div 
            onClick={() => onNavigate('ratings')}
            className="cursor-pointer hover:scale-[1.02] active:scale-95 transition-all bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-600/20 dark:to-purple-600/20 backdrop-blur-xl rounded-2xl border border-blue-500/10 dark:border-blue-500/20 p-6 text-center shadow-sm"
        >
            <Star size={36} className="text-yellow-400 mx-auto mb-3" />
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1 transition-colors">
                {(averageRatings?.overall || 0).toFixed(1)} / 5.0
            </h3>
            <p className="text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors">Note Globale de la Plateforme</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 transition-colors">Basé sur {averageRatings?.totalRatings || 0} évaluations</p>
        </div>
    </div>
);

// Stat Card
interface StatCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    trend: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, trend, onClick }) => (
    <div 
        onClick={onClick}
        className="group bg-background-card backdrop-blur-xl rounded-xl md:rounded-2xl border border-black/5 dark:border-white/10 p-3 md:p-5 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all hover:scale-105 cursor-pointer shadow-sm active:scale-95"
    >
        <div className="flex items-start justify-between mb-2 md:mb-3">
            <div className={`p-2 rounded-lg md:rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
                <div className="text-white">{icon}</div>
            </div>
            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full transition-colors">
                {trend}
            </span>
        </div>
        <h3 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-0.5 transition-colors">{value}</h3>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider transition-colors">{title}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 hidden sm:block transition-colors">{subtitle}</p>
    </div>
);

// Ratings Tab
interface RatingsTabProps {
    ratings: PlatformRating[];
    averageRatings: any;
    totalUsers: number;
    highlightId?: string | null;
}

const RatingsTab: React.FC<RatingsTabProps> = ({ ratings, averageRatings, totalUsers, highlightId }) => {
    useEffect(() => {
        if (highlightId) {
            const el = document.getElementById(`rating-${highlightId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightId]);

    return (
    <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 dark:from-yellow-600/20 dark:to-orange-600/20 backdrop-blur-xl rounded-2xl border border-yellow-500/10 dark:border-yellow-500/20 p-6 text-center transition-colors shadow-sm">
                <Star size={48} className="text-yellow-400 mx-auto mb-3" />
                <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-2 transition-colors">{(averageRatings?.overall || 0).toFixed(1)}</h3>
                <div className="flex items-center justify-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={20} className={star <= Math.round(averageRatings?.overall || 0) ? "text-yellow-400 fill-yellow-400" : "text-slate-300 dark:text-slate-700"} />
                    ))}
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-bold transition-colors">Note Globale</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 transition-colors">{ratings.length} évaluations totales</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-600/20 dark:to-purple-600/20 backdrop-blur-xl rounded-2xl border border-blue-500/10 dark:border-blue-500/20 p-6 flex flex-col justify-center transition-colors shadow-sm">
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Users size={24} className="text-blue-500" />
                            <h4 className="text-3xl font-black text-slate-900 dark:text-white">{ratings.length > 0 ? (ratings.length / (totalUsers || 1) * 100).toFixed(1) : 0}%</h4>
                        </div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Taux de Participation</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{ratings.length}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Évaluations</p>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{averageRatings?.totalRatings || 0}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Total Stats</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden transition-colors shadow-sm">
            <div className="p-4 md:p-6 border-b border-black/5 dark:border-white/10 transition-colors">
                <h3 className="text-base font-black text-slate-900 dark:text-white transition-colors">Évaluations Récentes</h3>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5 max-h-80 overflow-y-auto">
                {ratings.slice(0, 10).map((rating) => (
                    <div 
                        key={rating.id} 
                        id={`rating-${rating.id}`}
                        className={`p-4 md:p-6 transition-all duration-1000 ${highlightId === rating.id ? 'bg-yellow-500/10 dark:bg-yellow-400/10 border-l-4 border-yellow-500' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-100'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm transition-colors">{rating.userName}</p>
                                <p className="text-[10px] text-slate-500">{new Date(rating.timestamp).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-xl font-black text-yellow-500">{rating.overall}</span>
                                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                            </div>
                        </div>
                        {rating.comment && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-black/5 dark:bg-white/5 p-3 rounded-lg transition-colors">{rating.comment}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    </div>
    );
};

export default AdminDashboard;
