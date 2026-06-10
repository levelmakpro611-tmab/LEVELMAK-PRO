import React, { useState, useRef } from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  BookOpen,
  PenTool,
  Users,
  Settings,
  LogOut,
  Sparkles,
  ShoppingBag,
  Coins,
  Calendar,
  Bell,
  Mic,
  Menu,
  X,
  Camera,
  Edit2,
  Save,
  Trophy,
  Zap,
  User as UserIcon,
  Star,
  Layers,
  MessageSquare,
  Info,
  HelpCircle,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  Download,
  FlaskRound,
  Globe,
  Map as MapIcon,
  Database,
  Activity,
  Fingerprint,
  Lightbulb,
  Beaker,
  MapPin,
  Search,
  Code,
  ArrowLeft,
  ArrowRight,
  Play,
  Flame,
  Map,
  Heart,
  Share2,
  Plus,
  History,
  RefreshCw,
  BookText,
  FlaskConical,
  Target,
  Clock,
  Headphones,
  GraduationCap,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { useStore } from '../hooks/useStore';
import { HapticFeedback } from '../services/nativeAdapters';
import NotificationCenter from './NotificationCenter';
import { submitComment, submitRating, getSupportEmail } from '../services/adminService';
import OfflineIndicator from './OfflineIndicator';
import { BubbleWrap } from './BubbleWrap';
import { FloatingBubble } from './FloatingBubble';
import { getXpForNextLevel } from '../constants';


interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { 
    user, logout, updateProfile, addActivity, trackTime, grantBadge, 
    notifications, addNotification, t, showBubbleWrap, setShowBubbleWrap, continuousStudyTime, resetContinuousStudyTime 
  } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const hasUnread = unreadCount > 0;
  const [userRating, setUserRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeHelpCategory, setActiveHelpCategory] = useState('account');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  
  // Support state hooks
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [supportEmail, setSupportEmail] = useState('Tmab6544@gmail.com');

  React.useEffect(() => {
    if (isHelpOpen) {
      getSupportEmail().then(email => {
        setSupportEmail(email);
      }).catch(e => console.error("Could not fetch support email", e));
    }
  }, [isHelpOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      Keyboard.addListener('keyboardWillShow', () => setIsKeyboardOpen(true));
      Keyboard.addListener('keyboardWillHide', () => setIsKeyboardOpen(false));
      return () => { Keyboard.removeAllListeners(); };
    } else {
      const handleResize = () => {
        if (window.innerHeight < window.screen.height * 0.75) setIsKeyboardOpen(true);
        else setIsKeyboardOpen(false);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // PWA Detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
  const showInstallButton = (deferredPrompt || (isIOS && !isStandalone));

  // Listen for PWA install prompt
  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('--- PWA Install Prompt Available ---');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the PWA install');
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setIsInstallGuideOpen(true);
    }
  };

  // Optimized Background Time Tracking
  const timeBufferRef = useRef(0);
  React.useEffect(() => {
    if (!user) return;

    // Track time every 1 minute but only update global state every 5 minutes
    const timeInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        timeBufferRef.current += 1;

        if (timeBufferRef.current >= 5) {
          trackTime(timeBufferRef.current);
          timeBufferRef.current = 0;
        }
      }
    }, 60000);

    // Sync remaining time on unmount
    return () => {
      clearInterval(timeInterval);
      if (timeBufferRef.current > 0) {
        trackTime(timeBufferRef.current);
      }
    };
  }, [user?.id]); // Only re-run if user ID changes


  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateProfile(user.name || 'Utilisateur', undefined, { avatar: { ...(user.avatar || {}), image: base64String } });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = () => {
    if (newName.trim()) {
      updateProfile(newName.trim());
      addActivity('profile', t('settings.success'), `${t('settings.nameChange')}"${newName.trim()}"`);
      setIsEditingName(false);
    }
  };

  const navItemsRaw = [
    { id: 'dashboard', label: t('nav.dashboard'), shortLabel: t('nav.short.dashboard'), icon: LayoutDashboard },
    { id: 'quiz', label: t('nav.quiz'), shortLabel: t('nav.short.quiz'), icon: BrainCircuit },
    { id: 'summary', label: t('nav.summary'), shortLabel: t('nav.short.summary'), icon: Sparkles },
    { id: 'library', label: t('nav.library'), shortLabel: t('nav.short.library'), icon: BookOpen, hideOnMobile: true },
    { id: 'writing', label: t('nav.writing'), shortLabel: t('nav.short.writing'), icon: PenTool },
    { id: 'flashcards', label: t('nav.flashcards'), shortLabel: t('nav.short.flashcards'), icon: Layers },
    { id: 'ailab', label: t('nav.ailab'), shortLabel: t('nav.ailabShort'), icon: FlaskRound },
    { id: 'atlas', label: t('nav.atlas'), shortLabel: t('nav.short.atlas'), icon: Globe },
    { id: 'ranking', label: t('nav.ranking'), shortLabel: t('nav.short.ranking'), icon: Trophy },
    { id: 'shop', label: t('nav.shop'), shortLabel: t('nav.short.shop'), icon: ShoppingBag },
    { id: 'planner', label: t('nav.planner'), shortLabel: t('nav.short.planner'), icon: Calendar, hideOnMobile: true },
    { id: 'social', label: t('nav.social'), shortLabel: t('nav.short.social'), icon: Layers, hideOnMobile: true },
    { id: 'feedback', label: t('nav.feedback'), shortLabel: t('nav.short.feedback'), icon: MessageSquare, onClick: () => setIsFeedbackOpen(true) },
    { id: 'rating', label: t('nav.rating'), shortLabel: t('nav.short.rating'), icon: Star, onClick: () => setIsRatingOpen(true) },
  ];

  const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !Capacitor.isNativePlatform();
  const navItems = isLocal
    ? navItemsRaw
    : navItemsRaw.filter(item => !['tutor_hub', 'planner', 'library'].includes(item.id));

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-200 relative overflow-hidden transition-colors duration-500">
      <OfflineIndicator />

      {/* Mobile Header - Re-adjusted for "Married" look */}
      <header className="md:hidden glass border-b border-black/5 dark:border-white/5 px-4 pt-[env(safe-area-inset-top)] pb-3 flex items-center justify-between sticky top-0 z-[100] bg-background/90 backdrop-blur-xl transition-all">
        <div className="flex items-center gap-2 pt-2">
          <img src="/logo.png" alt="LEVELMAK" className="h-14 w-auto object-contain brightness-110 dark:brightness-125 drop-shadow-[0_0_15px_rgba(59,130,246,0.2)] dark:drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
        </div>
        <div className="flex items-center gap-1 pt-2">
          {showInstallButton && (
            <button onClick={handleInstallClick} className="p-3 text-blue-500 dark:text-blue-400 relative active:scale-95 transition-all bg-blue-500/10 dark:bg-blue-400/10 rounded-full hover:bg-blue-500/20 shadow-glow-blue animate-pulse">
              <Download size={22} />
            </button>
          )}
          <button onClick={() => { HapticFeedback.selection(); setIsNotifOpen(true); }} className="p-3 text-slate-600 dark:text-slate-300 relative active:scale-95 transition-all bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
            <Bell size={22} fill={(hasUnread && !isNotifOpen) ? "currentColor" : "none"} className={(hasUnread && !isNotifOpen) ? "animate-pulse" : ""} />
            {hasUnread && (
              <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center text-white border-2 border-white dark:border-slate-900 shadow-glow animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => { HapticFeedback.selection(); setIsSidebarOpen(!isSidebarOpen); }} className="p-3 ml-1 text-slate-600 dark:text-slate-300 active:scale-90 transition-transform bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-[150] w-72 glass border-none transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} no-scrollbar`}>
        <div className="h-full flex flex-col p-6 md:pt-6 pt-20 overflow-y-auto no-scrollbar">
          <div className="hidden md:flex flex-col items-center mb-10 group no-scrollbar">
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-orange-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <img src="/logo.png" alt="LEVELMAK" className="w-56 h-auto object-contain relative z-10" />
            </div>
            <span className="text-[12px] font-black uppercase tracking-[0.2em] bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent mt-2">{t('layout.elitePortal')}</span>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar pb-10">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  HapticFeedback.navigation();
                  if (item.onClick) {
                    item.onClick();
                  } else {
                    setActiveTab(item.id);
                  }
                  setIsSidebarOpen(false);
                }}
                className={`w-full items-center gap-4 px-5 py-2.5 rounded-2xl font-bold transition-all duration-300 group relative ${item.hideOnMobile ? 'hidden md:flex' : 'flex'} ${activeTab === item.id ? 'bg-blue-500/10 text-white shadow-[inset_0_0_20px_rgba(59,130,246,0.1)] border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <item.icon size={22} className={`transition-all duration-300 ${activeTab === item.id ? 'text-blue-500 scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'group-hover:scale-110'}`} />
                <span className="tracking-wide text-[15px]">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="sidebar-active-dot"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                  />
                )}
              </button>
            ))}

            <div className="pt-4 space-y-1.5">
              <button onClick={() => { HapticFeedback.navigation(); setIsInfoOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-4 px-5 py-2.5 rounded-2xl font-bold text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-white hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all">
                <Info size={22} />
                <span className="tracking-wide text-[15px]">{t('layout.important')}</span>
              </button>
              <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 px-5 py-2.5 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-500/10 text-white shadow-[inset_0_0_20px_rgba(59,130,246,0.1)] border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Settings className={`transition-all duration-300 ${activeTab === 'settings' ? 'text-blue-500 scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'group-hover:scale-110'}`} size={22} />
                <span className="tracking-wide text-[15px]">{t('nav.settings')}</span>
              </button>
              <button onClick={logout} className="w-full flex items-center gap-4 px-5 py-2.5 rounded-2xl font-bold text-danger/80 hover:text-danger hover:bg-danger/10 transition-all">
                <LogOut size={22} />
                <span className="tracking-wide text-[15px]">{t('auth.logout')}</span>
              </button>
              
              <button onClick={() => { HapticFeedback.selection(); setIsHelpOpen(true); }} className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HelpCircle size={18} className="animate-pulse" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">{t('layout.helpSupport')}</p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t('layout.helpSubtitle')}</p>
                </div>
                <ChevronRight size={14} className="ml-auto text-slate-600 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="hidden md:flex bg-background/50 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-6 lg:px-12 py-6 md:py-8 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-6 lg:gap-10">
            <div className="flex-1">
              <h1 className="text-xl lg:text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">{t('layout.welcome')} {user.name} 👋</h1>
              <p className="text-[10px] lg:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-70">{t('layout.ready')}</p>
            </div>
            <div className="flex items-center bg-primary/5 px-4 lg:px-6 py-2 md:py-3 rounded-full text-sm lg:text-base font-black border border-primary/10 shadow-xl gap-2 md:gap-3 glass group hover:border-primary/50 transition-colors">
              <span className="text-primary dark:text-primary-light">{user.levelCoins || 0}</span>
              <div className="p-1.5 lg:p-2 bg-purple-500/20 rounded-full text-purple-600 dark:text-purple-400">
                <Coins size={18} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-10">
            {showInstallButton && (
              <button onClick={handleInstallClick} className="flex items-center gap-3 px-6 py-3 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white rounded-2xl font-black transition-all border border-blue-600/20 group/install shadow-glow-blue animate-pulse" title="Installer l'application">
                <Download size={22} className="group-hover/install:scale-110 transition-transform" />
                <span className="text-xs uppercase tracking-widest leading-none">Installer App</span>
              </button>
            )}
            <button onClick={() => { HapticFeedback.selection(); setIsNotifOpen(true); }} className="relative p-3 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all group border border-transparent hover:border-black/5 dark:hover:border-white/10">
              <Bell size={28} fill={(hasUnread && !isNotifOpen) ? "currentColor" : "none"} className={`group-hover:rotate-12 transition-transform ${(hasUnread && !isNotifOpen) ? "animate-pulse" : ""}`} />
              {hasUnread && (
                <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#060915] animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
              )}
            </button>
            <div className="flex items-center gap-5 pl-8 border-l border-black/5 dark:border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-24 h-1.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min((user.xp / getXpForNextLevel(user.avatar?.currentLevel || 1)) * 100, 100)}%` }}></div>
                </div>
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{user.xp} XP</p>
              </div>
              <div className="relative group cursor-pointer ml-2" onClick={() => setIsProfileOpen(true)}>
                <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-105 transition-transform overflow-hidden relative">
                  {user.avatar?.image ? <img src={user.avatar.image} alt={user.name || 'User'} className="w-full h-full object-cover" /> : (user.name || 'U').charAt(0).toUpperCase()}
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#10B981] rounded-full border-2 border-[#060915] shadow-lg"></div>
              </div>
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto ${(activeTab === 'social' || activeTab === 'ailab') ? 'p-0' : 'p-6 md:p-10'} ${(activeTab === 'social' || activeTab === 'ailab') ? 'pb-0' : 'pb-40 md:pb-10'} transition-all duration-300`}>
          <div className={`${(activeTab === 'social' || activeTab === 'ailab') ? 'h-full' : ''}`}>
            {children}
          </div>
        </div>

        {activeTab !== 'social' && !isKeyboardOpen && (
          <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 h-[calc(80px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-background/80 dark:bg-[#050b18]/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5 flex items-center justify-around px-2 m-0 rounded-t-[2.5rem] shadow-[0_-8px_30px_rgba(0,0,0,0.2)] transition-all duration-500">
            {[
              { id: 'quiz', icon: BrainCircuit, label: 'Quiz' },
              { id: 'flashcards', icon: Layers, label: 'Flash' },
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'writing', icon: PenTool, label: 'Atelier' },
              { id: 'summary', icon: Sparkles, label: 'Résumé' }
            ].map(item => {
              const isActive = activeTab === item.id;
              const isDashboard = item.id === 'dashboard';
              const shouldPop = isDashboard;
              const Icon = item.icon;
              return (
                <div key={item.id} className="relative flex flex-col items-center flex-1 h-full justify-center">
                  <button onClick={() => { HapticFeedback.selection(); setActiveTab(item.id); }} className="relative flex flex-col items-center justify-center z-10 w-full h-full">
                    <motion.div initial={false} animate={{ y: shouldPop ? -32 : 0, scale: shouldPop ? 1.25 : (isActive ? 1.1 : 1) }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className={`flex items-center justify-center rounded-full transition-colors duration-300 ${shouldPop ? 'w-14 h-14 shadow-lg shadow-blue-500/30 dark:shadow-[0_8px_25px_rgba(59,130,246,0.5)] border-4 border-background dark:border-[#050b18] bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'w-10 h-10 bg-transparent'} ${isActive && !isDashboard ? 'text-blue-500 dark:text-blue-400' : (isActive ? '' : 'text-slate-500 dark:text-slate-400')}`}>
                      <Icon size={isActive && !isDashboard ? 26 : 24} fill={isActive && (item.id === 'dashboard' || item.id === 'summary') ? 'currentColor' : 'none'} strokeWidth={isActive ? 2.5 : 2} className="transition-colors duration-300" />
                    </motion.div>
                    <motion.span initial={false} animate={{ y: shouldPop ? 16 : 22, opacity: isActive || shouldPop ? 1 : 0.6 }} className={`absolute font-black text-[10px] uppercase tracking-tighter whitespace-nowrap ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-slate-500'}`}>{item.label}</motion.span>
                  </button>
                  {shouldPop && <motion.div layoutId="nav-glow" animate={{ opacity: isActive ? 1 : 0.5 }} className="absolute top-0 w-16 h-16 rounded-full blur-xl bg-blue-500/20 dark:bg-blue-500/30 -z-10 pointer-events-none -translate-y-4" />}
                </div>
              );
            })}
          </nav>
        )}

        {/* Modals */}
        <AnimatePresence>
          {isProfileOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="flex justify-between items-start mb-8">
                    <h3 className="text-2xl font-black text-white">{t('profile.title')}</h3>
                    <button onClick={() => setIsProfileOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400"><X size={20} /></button>
                  </div>
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center text-4xl font-black text-white ring-4 ring-blue-500/10">
                      {user.avatar?.image ? <img src={user.avatar.image} alt={user.name || 'User'} className="w-full h-full object-cover rounded-full" /> : (user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center">
                      <h2 className="text-3xl font-black text-white">{user.name || 'Utilisateur'}</h2>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mt-1">Étudiant Elite</p>
                    </div>
                    <button onClick={logout} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Déconnexion</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isFeedbackOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFeedbackOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl space-y-6">
                <h3 className="text-2xl font-black text-white">Vos Commentaires</h3>
                <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Suggestions, idées, bugs..." className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50 resize-none" />
                <button
                  onClick={async () => {
                    if (!feedbackText.trim() || isSubmittingFeedback) return;
                    setIsSubmittingFeedback(true);
                    try {
                      await submitComment({
                        userId: user.id,
                        userName: user.name,
                        userPhone: user.phoneNumber,
                        content: feedbackText.trim(),
                        category: 'general',
                        rating: 0
                      });
                      setFeedbackText('');
                      setIsFeedbackOpen(false);
                      addNotification('success', 'Merci !', 'Votre commentaire a bien été envoyé.');
                    } catch {
                      addNotification('error', 'Erreur', 'Impossible d\'envoyer le commentaire. Réessayez.');
                    } finally {
                      setIsSubmittingFeedback(false);
                    }
                  }}
                  disabled={!feedbackText.trim() || isSubmittingFeedback}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {isSubmittingFeedback ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin" size={20} />
                      Envoi...
                    </div>
                  ) : 'Envoyer'}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isRatingOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRatingOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl text-center space-y-6">
                <h3 className="text-2xl font-black text-white">Notez l'App</h3>
                <p className="text-slate-400 text-sm">Votre avis compte énormément pour nous !</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setUserRating(s)} className={`p-1 transition-transform hover:scale-110 ${userRating >= s ? 'text-yellow-500' : 'text-slate-600'}`}><Star size={36} fill={userRating >= s ? "currentColor" : "none"} /></button>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    if (userRating === 0 || isSubmittingRating) return;
                    setIsSubmittingRating(true);
                    try {
                      console.log('--- SUBMITTING RATING ---', { userId: user.id, userName: user.name, userRating });
                      await submitRating({
                        userId: user.id,
                        userName: user.name,
                        overall: userRating,
                        features: {
                          quiz: userRating,
                          coach: userRating,
                          flashcards: userRating,
                          library: userRating,
                          interface: userRating,
                          offline: userRating
                        },
                        comment: '',
                        timestamp: new Date().toISOString()
                      });
                      console.log('--- RATING SUBMITTED SUCCESS ---');
                      setUserRating(0);
                      setIsRatingOpen(false);
                      addNotification('success', 'Merci pour votre aide !', `Vous avez noté LevelMak ${userRating}/5 ⭐`);
                    } catch (err) {
                      console.error('--- RATING SUBMITTED ERROR ---', err);
                      addNotification('error', 'Erreur', 'Impossible d\'enregistrer votre note. Réessayez.');
                    } finally {
                      setIsSubmittingRating(false);
                    }
                  }}
                  disabled={userRating === 0 || isSubmittingRating}
                  className="w-full py-4 bg-yellow-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmittingRating ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin" size={20} />
                      Envoi...
                    </div>
                  ) : 'Valider ma note'}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isInfoOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInfoOpen(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
                <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
                  <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-400 ring-4 ring-blue-500/10 scale-110"><Sparkles size={40} /></div>
                    <h2 className="text-4xl font-black text-white tracking-tighter mb-4">L'Espace Elite LEVELMAK</h2>
                    <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-xs">Guide Complet de ton Ascension</p>
                  </div>
                  <div className="space-y-12">
                    <section className="space-y-6">
                      <div className="flex items-center gap-3 text-blue-400"><BrainCircuit size={28} /><h3 className="text-2xl font-black uppercase tracking-widest">C'est quoi LEVELMAK ?</h3></div>
                      <div className="space-y-4">
                        <p className="text-slate-200 leading-relaxed text-lg font-medium">LEVELMAK est une plateforme éducative de nouvelle génération développée par la société technologique <span className="text-blue-400 font-bold">TMAB GROUP</span>. C'est bien plus qu'une simple application : c'est un véritable écosystème d'apprentissage intelligent.</p>
                        <p className="text-slate-300 leading-relaxed text-base">Nous avons conçu LEVELMAK pour qu'elle agisse comme un tuteur personnel pour chaque élève. En utilisant l'Intelligence Artificielle de façon encadrée, LEVELMAK s'adapte au niveau de l'élève, identifie ses lacunes et l'accompagne pas à pas vers la maîtrise de ses cours.</p>
                        <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 mt-4">
                          <p className="text-blue-400 font-bold mb-2">Les avantages majeurs :</p>
                          <ul className="list-disc list-inside text-slate-300 space-y-2 text-sm">
                            <li>Un apprentissage personnalisé et ciblé sur les difficultés de l'élève.</li>
                            <li>Une disponibilité 24h/24 et 7j/7 pour réviser, poser des questions et s'exercer.</li>
                            <li>Des outils innovants : Quiz intelligents, Flashcards, Résumés automatiques, et Atlas interactif.</li>
                            <li>Une plateforme qui valorise l'effort et la progression par la gamification.</li>
                            <li>Des défis multijoueurs (Quiz, Morpion, Bataille de Territoire) pour affronter ses amis et gagner des LevelCoins en s'amusant.</li>
                          </ul>
                        </div>
                      </div>
                    </section>
                    <section className="space-y-6">
                      <div className="flex items-center gap-3 text-red-400"><AlertCircle size={28} /><h3 className="text-2xl font-black uppercase tracking-widest">Notre Mission & Les Risques</h3></div>
                      <div className="space-y-4">
                        <p className="text-slate-200 leading-relaxed text-lg">Pourquoi avons-nous créé LEVELMAK ? La réponse vient d'un constat alarmant sur le terrain. Les administrateurs de TMAB GROUP, témoins directs de l'évolution de l'éducation, ont remarqué que de plus en plus d'élèves se tournaient vers des Intelligences Artificielles génériques (comme ChatGPT) sans aucun encadrement.</p>
                        <p className="text-rose-300 leading-relaxed text-base font-medium">Cette utilisation non guidée présente des risques majeurs et dévastateurs pour l'apprentissage :</p>
                        <ul className="list-none space-y-3 text-slate-300 text-sm">
                          <li className="flex items-start gap-2"><span className="text-red-500 font-black">X</span> <strong>La perte de l'esprit critique :</strong> L'élève demande la réponse directe au lieu d'apprendre à réfléchir et à résoudre le problème par lui-même.</li>
                          <li className="flex items-start gap-2"><span className="text-red-500 font-black">X</span> <strong>La dépendance intellectuelle :</strong> L'incapacité à produire un travail de réflexion personnel sans l'assistance d'une machine.</li>
                          <li className="flex items-start gap-2"><span className="text-red-500 font-black">X</span> <strong>La destruction de la formation :</strong> Un élève qui fait faire ses devoirs par l'IA arrive aux examens ou dans la vie professionnelle sans aucune compétence réelle, voué à l'échec.</li>
                        </ul>
                        <p className="text-slate-200 leading-relaxed text-lg font-bold mt-4 border-l-4 border-blue-500 pl-4 py-2 bg-white/5 rounded-r-xl">C'est ce qui nous a poussés à agir.</p>
                        <p className="text-slate-300 leading-relaxed text-base">Nous avons conçu LEVELMAK pour combler ce vide. Notre plateforme offre un cadre pédagogique ultra-sécurisé où l'IA est bridée pour <strong className="text-white">ne jamais donner la réponse directe</strong>, mais pour agir comme un tuteur socratique qui accompagne, stimule et encadre l'élève pour maximiser son potentiel sans jamais faire le travail à sa place.</p>
                      </div>
                    </section>
                    <section className="space-y-6 pb-6 border-t border-white/10 pt-6">
                      <div className="flex items-center gap-3 text-purple-400"><Users size={28} /><h3 className="text-2xl font-black uppercase tracking-widest">Fondateurs & TMAB GROUP</h3></div>
                      <div className="space-y-4">
                        <p className="text-slate-200 leading-relaxed text-lg">L'application a été fondée et pensée par deux jeunes visionnaires guinéens engagés pour l'avenir de la jeunesse :</p>
                        <div className="flex flex-col gap-2 my-4">
                          <span className="font-black text-white text-2xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Thierno Mamadou Alimou Barry</span>
                          <span className="font-black text-white text-2xl bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">Ibrahim Barry</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-base">À travers la société <strong>TMAB GROUP</strong>, leur vision est de démocratiser l'accès à une éducation d'élite pour tous les élèves, peu importe leur localisation. Ils ont compris très tôt que l'innovation technologique devait servir de levier pour propulser l'éducation, et non pour l'affaiblir.</p>
                        <p className="text-slate-300 leading-relaxed text-base">Avec LEVELMAK, TMAB GROUP réaffirme son engagement profond : aider les élèves, protéger leur capacité d'analyse, et les équiper des meilleures ressources pour affronter les défis du monde de demain. C'est un projet fait par la jeunesse, pour la jeunesse.</p>
                      </div>
                    </section>
                  </div>
                </div>
                <div className="p-6 bg-slate-950/50 border-t border-white/5">
                  <button onClick={() => setIsInfoOpen(false)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest">C'est compris !</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isInstallGuideOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInstallGuideOpen(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl text-center space-y-6">
                <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-2 text-blue-400"><Download size={40} /></div>
                <h3 className="text-2xl font-black text-white">Installer sur iPhone</h3>
                <p className="text-slate-400 text-sm">Ajoute LEVELMAK à ton écran d'accueil.</p>
                <button onClick={() => setIsInstallGuideOpen(false)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest">OK</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isHelpOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6 lg:p-10">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsHelpOpen(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl h-full md:h-[85vh] bg-slate-900 border border-white/10 md:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row">
                <div className="w-full md:w-80 bg-black/20 border-r border-white/5 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-8 md:mb-10">
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">{t('help.title')}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{t('help.subtitle')}</p>
                    </div>
                    <button onClick={() => setIsHelpOpen(false)} className="md:hidden p-2 text-slate-400"><X size={20} /></button>
                  </div>
                  <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 scrollbar-hide">
                    {[
                      { id: 'account', label: t('help.categories.account'), icon: UserIcon },
                      { id: 'ai', label: t('help.categories.ai'), icon: BrainCircuit },
                      { id: 'tools', label: t('help.categories.tools'), icon: Layers },
                      { id: 'discovery', label: t('help.categories.discovery'), icon: Globe },
                      { id: 'progression', label: t('help.categories.progression'), icon: Trophy },
                      { id: 'settings', label: t('help.categories.settings'), icon: Settings },
                      { id: 'support', label: 'Support & FAQ', icon: Mail },
                    ].map(cat => (
                      <button key={cat.id} onClick={() => { setActiveHelpCategory(cat.id); }} className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap md:whitespace-normal ${activeHelpCategory === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                        <cat.icon size={18} />
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar bg-gradient-to-br from-slate-900 to-[#0A0F1D]">
                  <div className="max-w-2xl mx-auto space-y-10">
                    <AnimatePresence mode="wait">
                      <motion.div key={activeHelpCategory} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                        {activeHelpCategory === 'account' && (
                          <>
                            <HelpItem title={t('help.topics.createAccount')} desc={t('help.topics.createAccountDesc')} icon={<UserIcon className="text-blue-400" />} />
                            <HelpItem title={t('help.topics.login')} desc={t('help.topics.loginDesc')} icon={<CheckCircle2 className="text-emerald-400" />} />
                          </>
                        )}
                        {activeHelpCategory === 'ai' && (
                          <>
                            <HelpItem title={t('help.topics.quizIA')} desc={t('help.topics.quizIADesc')} icon={<BrainCircuit className="text-purple-400" />} />
                            <HelpItem title={t('help.topics.summaryIA')} desc={t('help.topics.summaryIADesc')} icon={<Sparkles className="text-yellow-400" />} />
                          </>
                        )}
                        {activeHelpCategory === 'tools' && (
                          <>
                            <HelpItem title={t('help.topics.planner')} desc={t('help.topics.plannerDesc')} icon={<Calendar className="text-orange-400" />} />
                            <HelpItem title={t('help.topics.flashcards')} desc={t('help.topics.flashcardsDesc')} icon={<Layers className="text-indigo-400" />} />
                          </>
                        )}
                        {activeHelpCategory === 'discovery' && (
                          <>
                            <HelpItem title={t('help.topics.atlas')} desc={t('help.topics.atlasDesc')} icon={<Map className="text-green-400" />} />
                          </>
                        )}
                        {activeHelpCategory === 'progression' && (
                          <>
                            <HelpItem title={t('help.topics.ranking')} desc={t('help.topics.rankingDesc')} icon={<Trophy className="text-yellow-500" />} />
                            <HelpItem title={t('help.topics.missions')} desc={t('help.topics.missionsDesc')} icon={<Target className="text-rose-400" />} />
                          </>
                        )}
                        {activeHelpCategory === 'settings' && (
                          <>
                            <HelpItem title={t('help.topics.mySettings')} desc={t('help.topics.settingsDesc')} icon={<Settings className="text-slate-400" />} />
                          </>
                        )}
                        {activeHelpCategory === 'support' && (
                          <div className="space-y-8">
                            <div className="space-y-4">
                              <h4 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                <HelpCircle className="text-blue-400" size={20} />
                                Foire Aux Questions (FAQ)
                              </h4>
                              <div className="space-y-3">
                                {[
                                  {
                                    question: "Comment fonctionne le système d'XP et de niveaux ?",
                                    answer: "Chaque fois que vous complétez un quiz, lisez un cours ou réalisez des objectifs quotidiens, vous gagnez des points d'XP. Ces points vous permettent de monter de niveau et de devenir une Légende Elite."
                                  },
                                  {
                                    question: "Comment obtenir plus de LevelCoins ?",
                                    answer: "Les LevelCoins sont offerts en récompense de vos sessions d'étude, de la réussite de vos quiz et de l'accomplissement des missions quotidiennes. Vous pouvez les dépenser dans la boutique pour débloquer de nouveaux avatars."
                                  },
                                  {
                                    question: "Qu'est-ce que le mode Détente (BubbleWrap) ?",
                                    answer: "Le BubbleWrap est un mini-jeu anti-stress accessible après avoir accumulé au moins 30 minutes de temps d'étude. Chaque session de détente dure 1 minute, après quoi le minuteur d'étude recommence à zéro."
                                  },
                                  {
                                    question: "Mes données personnelles sont-elles sécurisées ?",
                                    answer: "Oui, vos données et votre progression sont cryptées et stockées de manière sécurisée par TMAB GROUP. Vous pouvez également supprimer définitivement votre compte à tout moment depuis vos Paramètres."
                                  },
                                  {
                                    question: "Comment activer le mode sombre ou changer la langue ?",
                                    answer: "Rendez-vous dans les Paramètres (icône d'engrenage), où vous pouvez activer le mode sombre par défaut, changer de langue ou ajuster la taille de la police pour un meilleur confort visuel."
                                  }
                                ].map((faq, i) => (
                                  <div key={i} className="border border-white/5 bg-white/5 rounded-2xl overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        HapticFeedback.selection();
                                        setExpandedFaq(expandedFaq === i ? null : i);
                                      }}
                                      className="w-full flex items-center justify-between p-5 text-left text-white font-bold text-sm hover:bg-white/[0.03] transition-colors"
                                    >
                                      <span>{faq.question}</span>
                                      <motion.div
                                        animate={{ rotate: expandedFaq === i ? 90 : 0 }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        <ChevronRight size={18} className="text-slate-400" />
                                      </motion.div>
                                    </button>
                                    <AnimatePresence initial={false}>
                                      {expandedFaq === i && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                                          className="overflow-hidden"
                                        >
                                          <div className="p-5 pt-0 text-slate-400 text-sm leading-relaxed border-t border-white/5 bg-black/10">
                                            {faq.answer}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-6 pt-6 border-t border-white/5">
                              <h4 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                <Mail className="text-blue-400" size={20} />
                                Contacter le Support
                              </h4>
                              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                Vous rencontrez un problème technique ou avez une question spécifique ? Remplissez ce formulaire pour envoyer un ticket d'assistance à l'adresse <span className="text-blue-400 font-bold">{supportEmail}</span>. Notre équipe vous répondra dans les plus brefs délais.
                              </p>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white uppercase tracking-wider block">Sujet</label>
                                  <input
                                    type="text"
                                    value={supportSubject}
                                    onChange={(e) => setSupportSubject(e.target.value)}
                                    placeholder="Ex: Problème d'achat de LevelCoins..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-500 outline-none focus:border-blue-500/50 transition-colors"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white uppercase tracking-wider block">Votre Message</label>
                                  <textarea
                                    value={supportMessage}
                                    onChange={(e) => setSupportMessage(e.target.value)}
                                    placeholder="Expliquez en détail votre situation..."
                                    className="w-full h-36 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-500 outline-none focus:border-blue-500/50 resize-none transition-colors"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!supportSubject.trim() || !supportMessage.trim() || isSubmittingSupport || !user) return;
                                    setIsSubmittingSupport(true);
                                    try {
                                      await submitComment({
                                        userId: user.id,
                                        userName: user.name,
                                        userPhone: user.phoneNumber,
                                        content: `[SUPPORT TICKET] Sujet: ${supportSubject.trim()}\n\n${supportMessage.trim()}`,
                                        category: 'support',
                                        rating: 0
                                      });
                                      const emailSubject = encodeURIComponent(`[SUPPORT TICKET] ${supportSubject.trim()}`);
                                      const emailBody = encodeURIComponent(`Bonjour,\n\nVoici mon message de support :\n\n${supportMessage.trim()}\n\n---\nUtilisateur: ${user.name}\nTéléphone: ${user.phoneNumber || 'Non renseigné'}`);

                                      setSupportSubject('');
                                      setSupportMessage('');
                                      addNotification('success', 'Ticket Envoyé', `Votre message a bien été envoyé au support (${supportEmail}).`);

                                      // Ouvrir le client mail natif
                                      window.open(`mailto:${supportEmail}?subject=${emailSubject}&body=${emailBody}`, '_system');
                                    } catch (error) {
                                      console.error("Error submitting support comment:", error);
                                      addNotification('error', 'Erreur', "Impossible d'envoyer votre ticket. Réessayez.");
                                    } finally {
                                      setIsSubmittingSupport(false);
                                    }
                                  }}
                                  disabled={!supportSubject.trim() || !supportMessage.trim() || isSubmittingSupport}
                                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {isSubmittingSupport ? (
                                    <>
                                      <RefreshCw className="animate-spin" size={20} />
                                      Envoi en cours...
                                    </>
                                  ) : (
                                    <>
                                      <Mail size={18} />
                                      Envoyer le Ticket
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[140]" />
        )}
      </AnimatePresence>
      <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      
      <AnimatePresence>{showBubbleWrap && <BubbleWrap onClose={() => { setShowBubbleWrap(false); resetContinuousStudyTime(); }} />}</AnimatePresence>

      <FloatingBubble 
        progress={continuousStudyTime}
        isVisible={continuousStudyTime > 0}
        onClick={() => {
          if (continuousStudyTime >= 30) { setShowBubbleWrap(true); } 
          else { addActivity('study', 'Patience...', `Encore ${30 - Math.floor(continuousStudyTime)} minutes.`); }
        }}
      />
    </div>
  );
};

const HelpItem: React.FC<{ title: string; desc: string; icon: React.ReactNode }> = ({ title, desc, icon }) => (
  <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.08] transition-all group">
    <div className="flex items-start gap-5">
      <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <div className="space-y-2">
        <h4 className="text-lg font-black text-white tracking-tight">{title}</h4>
        <div className="text-slate-400 leading-relaxed text-sm font-medium space-y-3">
          {typeof desc === 'string' ? desc.split('\n\n').map((paragraph, idx) => (
             <p key={idx} dangerouslySetInnerHTML={{ __html: paragraph }} />
          )) : desc}
        </div>
      </div>
    </div>
  </div>
);

export default Layout;
