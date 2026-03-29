import React, { useState, useEffect } from 'react';
import {
    Shield, BarChart3, Users, Activity, MessageSquare, Star, Download, LogOut,
    Home, TrendingUp, UserCheck, Settings, Menu, X, Bell, Magnet, Trophy, ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import {
    getGlobalStats,
    getUserAnalytics,
    getAllComments,
    getAllShopItems,
    deleteShopItem,
    updateShopItem,
    addShopItem,
    getAllRatings,
    getAverageRatings,
    logAdminAction,
    getDemographicStats
} from '../services/adminService';
import {
    AdminStats,
    AdminUserAnalytics,
    UserComment,
    PlatformRating,
    AdminLog
} from '../types';

const StatisticsPanel = React.lazy(() => import('../components/admin/StatisticsPanel'));
const UserManagement = React.lazy(() => import('../components/admin/UserManagement'));
const CommentManagement = React.lazy(() => import('../components/admin/CommentManagement'));
const ExportTools = React.lazy(() => import('../components/admin/ExportTools'));
const DemographicTable = React.lazy(() => import('../components/admin/DemographicTable'));
const ActivityMonitor = React.lazy(() => import('../components/admin/ActivityMonitor'));
const RetentionChart = React.lazy(() => import('../components/admin/RetentionChart'));
const GamificationPanel = React.lazy(() => import('../components/admin/GamificationPanel'));
const SecurityPanel = React.lazy(() => import('../components/admin/SecurityPanel'));
const ShopManager = React.lazy(() => import('../components/admin/ShopManager'));

type Tab = 'overview' | 'stats' | 'users' | 'comments' | 'ratings' | 'export' | 'monitor' | 'retention' | 'gamification' | 'security' | 'shop';

const AdminDashboard: React.FC = () => {
    const { user, logout } = useStore();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUserAnalytics[]>([]);
    const [comments, setComments] = useState<UserComment[]>([]);
    const [ratings, setRatings] = useState<PlatformRating[]>([]);
    const [averageRatings, setAverageRatings] = useState<any>(null);
    const [demographicStats, setDemographicStats] = useState<any>(null);
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
    const [loading, setLoading] = useState(true);
    // On mobile: sidebar hidden by default. On desktop: open.
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [seenIds, setSeenIds] = useState<string[]>([]);
    const [loadingStates, setLoadingStates] = useState<Record<Tab, boolean>>({
        overview: false, stats: false, users: false, comments: false, ratings: false,
        export: false, monitor: false, retention: false, gamification: false, security: false, shop: false
    });

    useEffect(() => {
        // Load seen IDs from local storage
        const savedSeen = localStorage.getItem('admin_seen_ids');
        if (savedSeen) {
            try {
                setSeenIds(JSON.parse(savedSeen));
            } catch (e) { console.error("Error parsing admin_seen_ids", e); }
        }

        // Load cached data...
        const cachedOverview = localStorage.getItem('admin_cache_overview');
        if (cachedOverview) {
            try {
                const { stats, comments, ratings, averageRatings } = JSON.parse(cachedOverview);
                if (stats) setStats(stats);
                if (comments) setComments(comments);
                if (ratings) setRatings(ratings);
                if (averageRatings) setAverageRatings(averageRatings);
                setLoading(false); // Skip loading screen if cache exists
            } catch (e) { console.error("Error parsing admin cache", e); }
        }

        loadTab('overview');
        if (user) {
            logAdminAction(user.id, user.name, 'login', { timestamp: new Date().toISOString() });
        }
    }, []);

    useEffect(() => {
        loadTab(activeTab);
    }, [activeTab, period]);

    // Close sidebar on mobile when a tab is selected
    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    };

    const loadTab = async (tab: Tab) => {
        if (loadingStates[tab]) return;
        setLoadingStates(prev => ({ ...prev, [tab]: true }));
        try {
            switch (tab) {
                case 'overview':
                    const [sData, cData, rData, avgR] = await Promise.allSettled([
                        getGlobalStats(period), getAllComments(50), getAllRatings(50), getAverageRatings()
                    ]);
                    
                    const newStats = sData.status === 'fulfilled' ? sData.value : null;
                    const newComments = cData.status === 'fulfilled' ? cData.value : [];
                    const newRatings = rData.status === 'fulfilled' ? rData.value : [];
                    const newAvgR = avgR.status === 'fulfilled' ? avgR.value : null;

                    if (newStats) setStats(newStats);
                    setComments(newComments);
                    setRatings(newRatings);
                    setAverageRatings(newAvgR);

                    // Sync to cache
                    localStorage.setItem('admin_cache_overview', JSON.stringify({
                        stats: newStats,
                        comments: newComments,
                        ratings: newRatings,
                        averageRatings: newAvgR,
                        timestamp: Date.now()
                    }));
                    break;
                case 'users':
                    try { setUsers(await getUserAnalytics(100)); } catch { setUsers([]); }
                    break;
                case 'comments':
                    try { setComments(await getAllComments(50)); } catch { setComments([]); }
                    break;
                case 'ratings':
                    try {
                        const [ratingsData, avgRatingsData] = await Promise.all([getAllRatings(50), getAverageRatings()]);
                        setRatings(ratingsData); setAverageRatings(avgRatingsData);
                    } catch { setRatings([]); }
                    break;
                case 'stats':
                    const [statsResult, demogResult] = await Promise.allSettled([getGlobalStats(period), getDemographicStats()]);
                    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
                    if (demogResult.status === 'fulfilled') setDemographicStats(demogResult.value);
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tab} data:`, error);
        } finally {
            setLoadingStates(prev => ({ ...prev, [tab]: false }));
            setLoading(false);
        }
    };

    const handleLogout = () => {
        if (user) logAdminAction(user.id, user.name, 'logout', { timestamp: new Date().toISOString() });
        logout();
    };

    // Combine and sort notifications for the bell
    const adminNotifications = [
        ...comments.map(c => ({ 
            id: c.id, 
            type: 'comment', 
            title: 'Nouveau commentaire', 
            user: c.userName, 
            content: c.content, 
            date: c.timestamp,
            active: c.status === 'pending'
        })),
        ...ratings.map(r => ({ 
            id: r.id, 
            type: 'rating', 
            title: 'Nouvelle évaluation', 
            user: r.userName, 
            content: `${r.overall} ⭐ ${r.comment ? '- ' + r.comment : ''}`, 
            date: r.timestamp,
            active: true
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const unreadCount = adminNotifications.filter(n => !seenIds.includes(n.id)).length;

    const markAllAsRead = () => {
        const allIds = adminNotifications.map(n => n.id);
        const newSeen = Array.from(new Set([...seenIds, ...allIds]));
        setSeenIds(newSeen);
        localStorage.setItem('admin_seen_ids', JSON.stringify(newSeen));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center transition-colors">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                        <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={32} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-lg transition-colors">Chargement du contrôle central...</p>
                </div>
            </div>
        );
    }

    const navItems = [
        { id: 'overview' as Tab, icon: Home, label: "Vue d'ensemble", badge: null },
        { id: 'monitor' as Tab, icon: Activity, label: 'Spy Mode', badge: null },
        { id: 'retention' as Tab, icon: Magnet, label: 'Rétention', badge: null },
        { id: 'gamification' as Tab, icon: Trophy, label: 'Gamification', badge: null },
        { id: 'security' as Tab, icon: Shield, label: 'Sécurité', badge: null },
        { id: 'stats' as Tab, icon: TrendingUp, label: 'Statistiques', badge: null },
        { id: 'users' as Tab, icon: Users, label: 'Utilisateurs', badge: users.length },
        { id: 'comments' as Tab, icon: MessageSquare, label: 'Commentaires', badge: comments.filter(c => c.status === 'pending').length },
        { id: 'ratings' as Tab, icon: Star, label: 'Évaluations', badge: null },
        { id: 'export' as Tab, icon: Download, label: 'Exports', badge: null },
        { id: 'shop' as Tab, icon: ShoppingBag, label: 'Boutique', badge: null },
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
                lg:w-64 xl:w-72
            `}>
                {/* Logo */}
                <div className="p-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50 shrink-0">
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
                <div className="sticky top-0 z-20 bg-background/80 dark:bg-slate-950/80 lg:bg-white/5 backdrop-blur-xl border-b border-black/5 dark:border-white/10 shrink-0 transition-colors" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
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

                        <div className="flex items-center gap-2 shrink-0 relative">
                            <button 
                                onClick={() => { setIsNotifOpen(!isNotifOpen); setIsSettingsOpen(false); }}
                                className={`p-2 rounded-xl transition-all relative ${isNotifOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}
                            >
                                <Bell size={18} className={isNotifOpen ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse shadow-lg"></span>
                                )}
                            </button>
                            <button 
                                onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsNotifOpen(false); }}
                                className={`p-2 rounded-xl transition-all ${isSettingsOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}
                            >
                                <Settings size={18} className={isSettingsOpen ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                            </button>

                            {/* Notification Panel */}
                            <AnimatePresence>
                                {isNotifOpen && (
                                    <div 
                                        className="absolute top-14 right-0 w-80 max-h-[450px] bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
                                        style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}
                                    >
                                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                                            <h3 className="text-sm font-black text-white">Notifications</h3>
                                            <button 
                                                onClick={markAllAsRead} 
                                                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold transition-colors"
                                            >
                                                Tout marquer comme lu
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                            {adminNotifications.length === 0 ? (
                                                <div className="py-20 text-center flex flex-col items-center gap-4">
                                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-slate-600">
                                                        <Bell size={24} />
                                                    </div>
                                                    <p className="text-slate-500 text-xs italic font-medium">Aucune notification pour le moment.</p>
                                                </div>
                                            ) : (
                                                adminNotifications.slice(0, 20).map(n => (
                                                    <div 
                                                        key={n.id} 
                                                        onClick={() => {
                                                            handleTabChange(n.type === 'comment' ? 'comments' : 'ratings' as Tab);
                                                            setIsNotifOpen(false);
                                                            if (!seenIds.includes(n.id)) {
                                                                const newSeen = [...seenIds, n.id];
                                                                setSeenIds(newSeen);
                                                                localStorage.setItem('admin_seen_ids', JSON.stringify(newSeen));
                                                            }
                                                        }}
                                                        className={`p-3 rounded-xl cursor-pointer transition-all border border-transparent ${seenIds.includes(n.id) 
                                                            ? 'opacity-60 hover:opacity-100 hover:bg-white/5' 
                                                            : 'bg-blue-600/10 border-blue-500/20 hover:bg-blue-600/20 shadow-lg mb-1'}`}
                                                    >
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className={`w-2 h-2 rounded-full ${seenIds.includes(n.id) ? 'bg-slate-600' : 'bg-blue-500 pulse'}`}></div>
                                                            {n.type === 'comment' ? <MessageSquare size={12} className="text-blue-400" /> : <Star size={12} className="text-yellow-400" />}
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{n.title}</span>
                                                            <span className="ml-auto text-[9px] text-slate-500 font-bold">{new Date(n.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-[11px] font-black text-white line-clamp-1 mb-0.5">{n.user}</p>
                                                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{n.content}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </AnimatePresence>

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
                                                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[11px] font-bold">
                                                    <Settings size={14} /> Modifier Profil
                                                </button>
                                                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[11px] font-bold">
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
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <React.Suspense fallback={
                        <div className="flex items-center justify-center p-20">
                            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    }>
                        {loadingStates[activeTab] ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-32 bg-black/5 dark:bg-white/5 rounded-2xl"></div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-black/5 dark:bg-white/5 rounded-xl"></div>)}
                                </div>
                                <div className="h-48 bg-black/5 dark:bg-white/5 rounded-2xl"></div>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'overview' && stats && <OverviewTab stats={stats} users={users} comments={comments} averageRatings={averageRatings} />}
                                {activeTab === 'stats' && (
                                    <div className="space-y-6">
                                        <StatisticsPanel stats={stats} period={period} onPeriodChange={setPeriod} />
                                        <DemographicTable stats={demographicStats} />
                                    </div>
                                )}
                                {activeTab === 'users' && <UserManagement users={users} onRefresh={() => loadTab('users')} />}
                                {activeTab === 'comments' && <CommentManagement comments={comments} onRefresh={() => loadTab('comments')} />}
                                {activeTab === 'ratings' && <RatingsTab ratings={ratings} averageRatings={averageRatings} />}
                                {activeTab === 'export' && stats && <ExportTools stats={stats} users={users} comments={comments} period={period} demographicStats={demographicStats} />}
                                {activeTab === 'shop' && <ShopManager />}
                                {activeTab === 'monitor' && <ActivityMonitor />}
                                {activeTab === 'retention' && <RetentionChart />}
                                {activeTab === 'gamification' && <GamificationPanel />}
                                {activeTab === 'security' && <SecurityPanel />}
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
}

const OverviewTab: React.FC<OverviewTabProps> = ({ stats, users, comments, averageRatings }) => (
    <div className="space-y-4 md:space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard title="Utilisateurs" value={stats.totalUsers} subtitle={`${stats.activeUsers} actifs`} icon={<Users size={20} />} color="from-blue-500 to-cyan-500" trend="+12%" />
            <StatCard title="Quiz Générés" value={stats.quizzesGenerated} subtitle={`${stats.quizzesToday} aujourd'hui`} icon={<Activity size={20} />} color="from-purple-500 to-pink-500" trend="+8%" />
            <StatCard title="Flashcards" value={stats.flashcardsCreated} subtitle={`${stats.flashcardsToday} aujourd'hui`} icon={<BarChart3 size={20} />} color="from-orange-500 to-red-500" trend="+15%" />
            <StatCard title="Engagement" value={`${stats.averageEngagementRate.toFixed(1)}%`} subtitle="Taux d'activité" icon={<TrendingUp size={20} />} color="from-green-500 to-emerald-500" trend="+5%" />
        </div>

        {/* Activity Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div key={idx} className="flex items-center justify-between py-1.5">
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
                        <div key={idx} className="flex items-center justify-between py-1.5">
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
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-600/20 dark:to-purple-600/20 backdrop-blur-xl rounded-2xl border border-blue-500/10 dark:border-blue-500/20 p-6 text-center shadow-sm transition-colors">
            <Star size={36} className="text-yellow-400 mx-auto mb-3" />
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1 transition-colors">
                {averageRatings?.overall.toFixed(1) || '0.0'} / 5.0
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
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, trend }) => (
    <div className="group bg-background-card backdrop-blur-xl rounded-xl md:rounded-2xl border border-black/5 dark:border-white/10 p-3 md:p-5 hover:border-black/10 dark:hover:border-white/20 transition-all hover:scale-105 cursor-pointer shadow-sm">
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
}

const RatingsTab: React.FC<RatingsTabProps> = ({ ratings, averageRatings }) => (
    <div className="space-y-4 md:space-y-6">
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 dark:from-yellow-600/20 dark:to-orange-600/20 backdrop-blur-xl rounded-2xl border border-yellow-500/10 dark:border-yellow-500/20 p-6 text-center transition-colors shadow-sm">
            <Star size={48} className="text-yellow-400 mx-auto mb-3" />
            <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-2 transition-colors">{averageRatings?.overall.toFixed(1) || '0.0'}</h3>
            <div className="flex items-center justify-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={20} className="text-yellow-400 fill-yellow-400" />
                ))}
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-bold transition-colors">Note Globale</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 transition-colors">{ratings.length} évaluations totales</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {averageRatings && Object.entries(averageRatings.features).map(([feature, rating]: [string, any]) => (
                <div key={feature} className="bg-background-card backdrop-blur-xl rounded-xl border border-black/5 dark:border-white/10 p-4 text-center transition-colors shadow-sm">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
                        {feature === 'quiz' && '📝 Quiz'}
                        {feature === 'coach' && '🤖 Coach IA'}
                        {feature === 'flashcards' && '🎴 Flashcards'}
                        {feature === 'library' && '📚 Bibliothèque'}
                        {feature === 'interface' && '💎 Interface'}
                        {feature === 'offline' && '📡 Hors Ligne'}
                    </p>
                    <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white transition-colors">{rating.toFixed(1)}</p>
                </div>
            ))}
        </div>

        <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden transition-colors shadow-sm">
            <div className="p-4 md:p-6 border-b border-black/5 dark:border-white/10 transition-colors">
                <h3 className="text-base font-black text-slate-900 dark:text-white transition-colors">Évaluations Récentes</h3>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5 max-h-80 overflow-y-auto">
                {ratings.slice(0, 10).map((rating) => (
                    <div key={rating.id} className="p-4 md:p-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
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

export default AdminDashboard;
