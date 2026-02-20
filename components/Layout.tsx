
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
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import { HapticFeedback } from '../services/nativeAdapters';
import NotificationCenter from './NotificationCenter';
import OfflineIndicator from './OfflineIndicator';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, logout, updateProfile, addActivity, trackTime, grantBadge, notifications, t } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  if (!user) return null;

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateProfile(user.name, undefined, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = () => {
    if (newName.trim()) {
      updateProfile(newName.trim());
      addActivity('profile', t('settings.success'), `Tu as changé ton nom en "${newName.trim()}"`);
      setIsEditingName(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), shortLabel: 'Home', icon: LayoutDashboard },
    { id: 'quiz', label: t('nav.quiz'), shortLabel: 'Quiz', icon: BrainCircuit },
    { id: 'summary', label: t('nav.summary'), shortLabel: 'Résumé', icon: Sparkles },
    { id: 'library', label: t('nav.library'), shortLabel: 'Biblio', icon: BookOpen },
    { id: 'writing', label: t('nav.writing'), shortLabel: 'Atelier', icon: PenTool },
    { id: 'flashcards', label: t('nav.flashcards'), shortLabel: 'Flash', icon: Layers },
    { id: 'ranking', label: t('nav.ranking'), shortLabel: 'Rank', icon: Trophy },
    { id: 'shop', label: t('nav.shop'), shortLabel: 'Shop', icon: ShoppingBag },
    { id: 'planner', label: t('nav.planner'), shortLabel: 'Planif', icon: Calendar, hideOnMobile: true },
    { id: 'social', label: t('nav.social'), shortLabel: 'Social', icon: Layers, hideOnMobile: true },
    { id: 'feedback', label: 'Commentaire', shortLabel: 'Avis', icon: MessageSquare, onClick: () => setIsFeedbackOpen(true) },
    { id: 'rating', label: 'Note App', shortLabel: 'Note', icon: Star, onClick: () => setIsRatingOpen(true) },
  ];

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background/50 flex flex-col md:flex-row font-sans text-slate-200 relative overflow-hidden">
      <OfflineIndicator />
      {/* Background Aurora Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[60px]"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[50px]"></div>
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-accent/5 rounded-full blur-[40px]"></div>
      </div>

      {/* Mobile Header */}
      {/* Mobile Header (Enhanced) */}
      <header
        className="md:hidden glass border-b border-white/5 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 flex items-center justify-between sticky top-0 z-[100] h-24 bg-[#0F172A]/90 backdrop-blur-xl transition-all"
      >
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="LEVELMAK"
            className="h-16 w-auto object-contain brightness-125 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              HapticFeedback.selection();
              setIsNotifOpen(true);
            }}
            className="p-3 text-slate-300 relative active:scale-95 transition-all bg-white/5 rounded-full hover:bg-white/10"
            aria-label="Notifications"
          >
            <Bell size={24} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full text-[10px] font-black flex items-center justify-center text-white border-2 border-slate-900 shadow-glow animate-pulse">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              HapticFeedback.selection();
              setIsSidebarOpen(!isSidebarOpen);
            }}
            className="p-3 ml-1 text-slate-300 active:scale-90 transition-transform bg-white/5 rounded-full hover:bg-white/10"
            aria-label="Menu"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[150] w-72 glass border-r border-slate-200 dark:border-white/5 transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6 md:pt-6 pt-20">
          <div className="hidden md:flex flex-col items-center mb-10 group">
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-orange-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <img src="/logo.png" alt="LEVELMAK" className="w-56 h-auto object-contain relative z-10" />
            </div>
            <span className="text-[12px] font-black uppercase tracking-[0.2em] bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent mt-2">Elite Portal</span>
          </div>

          <nav className="flex-1 space-y-1.5">
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
                className={`
                  w-full items-center gap-3.5 px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl font-semibold transition-all duration-200 group relative overflow-hidden
                  ${item.hideOnMobile ? 'hidden md:flex' : 'flex'}
                  ${activeTab === item.id
                    ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-white shadow-sm border border-blue-100 dark:border-white/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}
                `}
              >
                <item.icon size={22} className={`transition-transform duration-300 ${activeTab === item.id ? 'text-blue-600 dark:text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]' : 'group-hover:scale-110'}`} />
                <span className="tracking-wide">{item.label}</span>
                {activeTab === item.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div>
                )}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-white/10 space-y-2">
            <button
              onClick={() => {
                HapticFeedback.navigation();
                setIsInfoOpen(true);
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl font-semibold text-blue-400 hover:text-white hover:bg-blue-500/10 transition-all border border-transparent hover:border-blue-500/20"
            >
              <Info size={20} />
              <span className="tracking-wide">{t('layout.important')}</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`
                w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl font-semibold transition-all
                ${activeTab === 'settings'
                  ? 'bg-gradient-to-r from-primary/20 to-secondary/20 text-white shadow-lg border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <Settings className={`transition-transform duration-300 ${activeTab === 'settings' ? 'text-primary-light scale-110' : ''}`} size={20} />
              <span className="tracking-wide">{t('nav.settings')}</span>
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl font-semibold text-danger/80 hover:text-danger hover:bg-danger/10 transition-all"
            >
              <LogOut size={20} />
              <span className="tracking-wide">{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header className="hidden md:flex bg-transparent backdrop-blur-md border-b border-white/5 px-6 lg:px-12 py-6 md:py-8 items-center justify-between sticky top-0 z-30">
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
            <button className="relative p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all group border border-transparent hover:border-white/10">
              <Bell size={28} className="group-hover:rotate-12 transition-transform" />
              <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-[#060915] animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
            </button>

            <div className="flex items-center gap-6 pl-10 border-l border-white/10">
              <div className="text-right flex flex-col justify-center">
                <p className="text-lg font-black text-white tracking-tight leading-none mb-1">{user.username}</p>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-gradient-to-r from-primary to-blue-400 shadow-[0_0_8px_rgba(37,99,235,0.6)]" style={{ width: `${(user.xp / 500) * 100}%` }}></div>
                  </div>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">{user.xp} XP</p>
                </div>
              </div>
              <div className="relative group cursor-pointer" onClick={() => setIsProfileOpen(true)}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-lg ring-2 ring-white/10 group-hover:scale-105 transition-transform overflow-hidden relative">
                  {user.avatar?.image ? (
                    <img src={user.avatar.image} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-white dark:border-[#060915] shadow-lg"></div>

              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className={`flex-1 overflow-y-auto ${activeTab === 'social' ? 'p-0' : 'p-6 md:p-10'} pb-40 md:pb-10 transition-all duration-300`}>
          <div className={`${activeTab === 'social' ? 'h-full' : ''}`}>
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation (WhatsApp Style) */}
        {/* Mobile Bottom Navigation (Floating Glassmorphism Style) */}
        {activeTab !== 'social' && (
          <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50 h-16 bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg flex items-center justify-between px-2">

            {/* Left Group */}
            <div className="flex gap-1 w-[35%] justify-around">
              <button
                onClick={() => {
                  HapticFeedback.selection();
                  setActiveTab('quiz');
                }}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'quiz' ? 'text-blue-400' : 'text-slate-500'}`}
              >
                <BrainCircuit size={24} strokeWidth={activeTab === 'quiz' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Quiz</span>
              </button>
              <button
                onClick={() => {
                  HapticFeedback.selection();
                  setActiveTab('library');
                }}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'library' ? 'text-blue-400' : 'text-slate-500'}`}
              >
                <BookOpen size={24} strokeWidth={activeTab === 'library' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Biblio</span>
              </button>
            </div>

            {/* Centered Floating Home Button */}
            <div className="relative -top-6">
              <button
                onClick={() => {
                  HapticFeedback.success();
                  setActiveTab('dashboard');
                }}
                className={`
                  w-16 h-16 rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(59,130,246,0.6)] border-4 border-[#0F172A] relative z-10 transition-transform active:scale-95
                  ${activeTab === 'dashboard'
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 border-slate-700'}
                `}
              >
                <LayoutDashboard size={32} fill={activeTab === 'dashboard' ? "currentColor" : "none"} />
              </button>
              {/* Glow effect behind */}
              <div className={`absolute inset-0 rounded-full blur-xl -z-10 ${activeTab === 'dashboard' ? 'bg-blue-500/50' : 'bg-transparent'}`}></div>
            </div>

            {/* Right Group */}
            <div className="flex gap-1 w-[35%] justify-around">
              <button
                onClick={() => {
                  HapticFeedback.selection();
                  setActiveTab('summary');
                }}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'summary' ? 'text-blue-400' : 'text-slate-500'}`}
              >
                <Sparkles size={24} strokeWidth={activeTab === 'summary' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Résumé</span>
              </button>
              <button
                onClick={() => {
                  HapticFeedback.selection();
                  setIsProfileOpen(true);
                }}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all text-slate-500`}
              >
                <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-600">
                  {user.avatar?.image ? (
                    <img src={user.avatar.image} alt="Moi" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold">{user.name.charAt(0)}</div>
                  )}
                </div>
                <span className="text-[10px] font-bold">Moi</span>
              </button>
            </div>
          </nav>
        )}
        {/* Profile Modal */}
        <AnimatePresence>
          {isProfileOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsProfileOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg max-h-[90vh] bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
              >
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {/* Profile Header Background */}
                  <div className="h-24 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 relative">
                    <button
                      onClick={() => setIsProfileOpen(false)}
                      className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-all z-10"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="px-6 pb-8 -mt-12 relative">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center mb-4">
                      <div className="relative group/avatar">
                        <div className="w-24 h-24 rounded-[2rem] bg-slate-800 border-4 border-slate-900 shadow-2xl overflow-hidden ring-4 ring-white/5">
                          {user.avatar?.image ? (
                            <img src={user.avatar.image} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white" style={{ backgroundColor: user.avatar?.baseColor || '#3B82F6' }}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Name Section */}
                      <div className="mt-6 flex items-center gap-3">
                        {isEditingName ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="bg-white/5 border border-primary/30 rounded-xl px-4 py-2 text-xl font-bold text-white outline-none focus:border-primary w-48"
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            />
                            <button
                              onClick={handleSaveName}
                              className="p-2 bg-success/20 text-success rounded-xl hover:bg-success/30 transition-all"
                            >
                              <Save size={20} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h2 className="text-3xl font-display font-black text-white tracking-tight">{user.name}</h2>
                            <button
                              onClick={() => setIsEditingName(true)}
                              className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Étudiant Elite</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center group hover:bg-white/10 transition-all">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Star size={14} className="text-secondary" />
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Niveau</p>
                        </div>
                        <p className="text-2xl font-black text-white">{user.avatar?.currentLevel || 1}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center group hover:bg-white/10 transition-all">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Coins size={14} className="text-primary-light" />
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Coins</p>
                        </div>
                        <p className="text-2xl font-black text-white">{user.levelCoins || 0}</p>
                      </div>
                    </div>

                    {/* Badges Placeholder */}
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Mes Badges</h4>
                        <Trophy size={16} className="text-secondary" />
                      </div>
                      <div className="flex gap-3 justify-center opacity-40 hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center"><Zap size={20} /></div>
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center"><Sparkles size={20} /></div>
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center"><Star size={20} /></div>
                      </div>
                    </div>



                    {/* Logout Button */}
                    <button
                      onClick={logout}
                      className="w-full mt-8 py-4 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-danger/20"
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Feedback Modal */}
        <AnimatePresence>
          {isFeedbackOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFeedbackOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-400">
                    <MessageSquare size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-white">Vos Commentaires</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Vous pouvez contribuer à améliorer la qualité de l'application à travers vos commentaires et suggestions.
                  </p>
                </div>

                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Écrivez vos suggestions ici..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50 transition-all resize-none"
                />

                <button
                  onClick={async () => {
                    if (feedbackText.trim() && user) {
                      try {
                        const { submitComment } = await import('../services/adminService');
                        await submitComment({
                          userId: user.id,
                          userName: user.name,
                          userPhone: user.phoneNumber,
                          content: feedbackText.trim(),
                          category: 'general', // Default category
                          rating: userRating || 5
                        });
                        addActivity('profile', 'Suggestion envoyée', 'Merci pour votre contribution !');
                        setFeedbackText('');
                        setIsFeedbackOpen(false);
                      } catch (error) {
                        alert("Erreur lors de l'envoi du commentaire.");
                      }
                    }
                  }}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow"
                >
                  Envoyer mon avis
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Rating Modal */}
        <AnimatePresence>
          {isRatingOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsRatingOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6"
              >
                <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-yellow-500">
                  <Star size={32} />
                </div>
                <h3 className="text-2xl font-black text-white">Notez l'App</h3>
                <p className="text-slate-400 text-sm">Comment évaluez-vous votre expérience sur LEVELMAK ?</p>

                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        HapticFeedback.selection();
                        setUserRating(star);
                      }}
                      className="p-1 transition-transform active:scale-90"
                    >
                      <Star
                        size={36}
                        className={`${userRating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-slate-600'} transition-colors`}
                      />
                    </button>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    onClick={async () => {
                      if (userRating > 0 && user) {
                        try {
                          const { submitRating } = await import('../services/adminService');
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
                            comment: feedbackText,
                            timestamp: new Date().toISOString()
                          });
                          addActivity('badge', 'Note enregistrée', `Vous avez donné ${userRating} étoiles !`);
                          setIsRatingOpen(false);
                        } catch (error) {
                          alert("Erreur lors de l'envoi de la note.");
                        }
                      }
                    }}
                    disabled={userRating === 0}
                    className="w-full py-4 bg-yellow-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-yellow"
                  >
                    Valider ma note
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Important Info Modal */}
        <AnimatePresence>
          {isInfoOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsInfoOpen(false)}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
              >
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
                  <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-400 ring-4 ring-blue-500/10 scale-110">
                      <Info size={40} />
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Tout sur LEVELMAK</h2>
                    <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
                  </div>

                  <div className="space-y-12">
                    {/* Mission Section */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 text-blue-400">
                        <Sparkles size={24} />
                        <h3 className="text-xl font-black uppercase tracking-widest">C'est quoi LEVELMAK ?</h3>
                      </div>
                      <p className="text-slate-200 leading-relaxed text-xl font-medium">
                        LEVELMAK est une plateforme éducative de nouvelle génération développée par <span className="text-blue-400 font-bold underline decoration-blue-500/30">TMAB GROUP</span>. Notre mission est de démocratiser l'accès à une éducation de haute qualité en combinant l'Intelligence Artificielle et des méthodes d'apprentissage gamifiées.
                      </p>
                    </section>

                    {/* Founders Section */}
                    <section className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                      <div className="flex items-center gap-3 text-purple-400">
                        <Users size={24} />
                        <h3 className="text-xl font-black uppercase tracking-widest">L'Histoire & Fondateurs</h3>
                      </div>
                      <p className="text-slate-200 leading-relaxed text-lg">
                        L'application a été fondée par deux jeunes visionnaires : <span className="font-bold text-white text-xl">Thierno Mamadou Alimou Barry</span> & <span className="font-bold text-white text-xl">Ibrahim Barry</span>.
                      </p>
                      <p className="text-slate-300 italic bg-black/30 p-6 rounded-2xl border-l-4 border-purple-500 text-lg leading-relaxed">
                        "Ayant été témoins directs des réalités et des défis de l'enseignement en Afrique, nous avons décidé de créer une solution qui brise les barrières géographiques et financières pour chaque étudiant."
                      </p>
                    </section>

                    {/* How it works Section */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 text-orange-400">
                        <Zap size={24} />
                        <h3 className="text-xl font-black uppercase tracking-widest">Le Cœur du Système</h3>
                      </div>
                      <div className="grid gap-6">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                          <p className="text-lg font-black text-white flex items-center gap-2">💎 Comment gagner des XP & Coins ?</p>
                          <p className="text-base text-slate-300 leading-relaxed">
                            Tes efforts sont récompensés ! Gagne des <span className="text-blue-400 font-bold">XP</span> et des <span className="text-yellow-500 font-bold">LevelCoins</span> en :
                          </p>
                          <ul className="text-sm text-slate-300 space-y-3 list-disc pl-6 font-medium">
                            <li>Réussissant des <span className="text-slate-200">Quiz IA</span> (Le meilleur moyen de monter de niveau).</li>
                            <li>Consultant le <span className="text-slate-200">Vocabulaire du Jour</span> chaque matin.</li>
                            <li>Lisant des livres dans la <span className="text-slate-200">Bibliothèque</span>.</li>
                            <li>Écrivant des histoires dans l'<span className="text-slate-200">Atelier d'Écriture</span>.</li>
                            <li>Maintenant ta <span className="text-slate-200">Série de connexion</span> quotidienne.</li>
                          </ul>
                        </div>

                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                          <p className="text-lg font-black text-white flex items-center gap-2">🧪 Les Fioles Magiques</p>
                          <p className="text-base text-slate-300">Utilise tes LevelCoins dans la boutique pour acheter des fioles stratégiques :</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="text-[13px] text-slate-200 bg-black/30 p-3 rounded-xl border border-white/5 leading-relaxed">
                              <span className="text-purple-400 font-bold">Double XP</span> : Double tes gains pendant 5 minutes.
                            </div>
                            <div className="text-[13px] text-slate-200 bg-black/30 p-3 rounded-xl border border-white/5 leading-relaxed">
                              <span className="text-blue-400 font-bold">Bouclier</span> : Pardonne une erreur lors d'un quiz.
                            </div>
                            <div className="text-[13px] text-slate-200 bg-black/30 p-3 rounded-xl border border-white/5 leading-relaxed">
                              <span className="text-green-400 font-bold">Sauvetage</span> : Passe une question trop difficile.
                            </div>
                            <div className="text-[13px] text-slate-200 bg-black/30 p-3 rounded-xl border border-white/5 leading-relaxed">
                              <span className="text-yellow-400 font-bold">Fortune</span> : Gagne plus de Coins pendant 10 min.
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Button Guide Section */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 text-blue-400">
                        <Menu size={24} />
                        <h3 className="text-xl font-black uppercase tracking-widest">Guide des Boutons</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <p className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2"><LayoutDashboard size={14} className="text-primary" /> Dashboard</p>
                          <p className="text-[12px] text-slate-400 leading-relaxed font-medium">Ta maison : statistiques, progression et vocabulaire du jour.</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2"><BrainCircuit size={14} className="text-secondary" /> Quiz IA</p>
                          <p className="text-[12px] text-slate-400 leading-relaxed font-medium">Transforme tes documents en jeux pour apprendre en t'amusant.</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2"><BookOpen size={14} className="text-accent" /> Bibliothèque</p>
                          <p className="text-[12px] text-slate-400 leading-relaxed font-medium">Accède à des milliers de livres et ressources pédagogiques.</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2"><ShoppingBag size={14} className="text-yellow-500" /> Boutique</p>
                          <p className="text-[12px] text-slate-400 leading-relaxed font-medium">Achète des photos de profil, des badges et des fioles magiques.</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2"><Calendar size={14} className="text-green-500" /> PLANIF IA</p>
                          <p className="text-[12px] text-slate-400 leading-relaxed font-medium">L'IA organise ton emploi du temps pour maximiser ta réussite.</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2"><MessageSquare size={14} className="text-blue-500" /> Commentaire</p>
                          <p className="text-[12px] text-slate-400 leading-relaxed font-medium">Envoie tes suggestions pour aider TMAB GROUP à s'améliorer.</p>
                        </div>
                      </div>
                    </section>

                    {/* Profile & Avatar Section */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 text-green-400">
                        <UserIcon size={24} />
                        <h3 className="text-xl font-black uppercase tracking-widest">Avatar & Identité</h3>
                      </div>
                      <div className="bg-green-500/10 p-6 rounded-3xl border border-green-500/20">
                        <p className="text-slate-100 text-lg font-black mb-3 flex items-center gap-2">📸 Comment changer de photo ?</p>
                        <p className="text-slate-200 text-sm leading-relaxed font-medium">
                          Sur LEVELMAK, ta photo de profil est un symbole de ton succès. Tu ne peux pas simplement télécharger n'importe quelle image : tu dois <span className="text-green-400 font-bold text-base underline decoration-green-400/30">cumuler des XP</span> et utiliser tes <span className="text-yellow-400 font-bold text-base">LevelCoins</span> dans la <span className="text-blue-400 font-bold text-base">Boutique</span> pour débloquer des avatars exclusifs ou des cadres de profil. C'est ainsi que l'on reconnaît les vrais champions !
                        </p>
                      </div>
                    </section>

                    {/* Rules Section */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 text-red-400">
                        <ShieldCheck size={24} />
                        <h3 className="text-xl font-black uppercase tracking-widest">Les Règles d'Or</h3>
                      </div>
                      <ul className="grid gap-4">
                        <li className="flex gap-3 text-slate-300 text-base font-medium">✨ <span className="text-slate-100 font-black">Respect Mutuel</span> : La communauté est basée sur l'entraide et le respect.</li>
                        <li className="flex gap-3 text-slate-300 text-base font-medium">📈 <span className="text-slate-100 font-black">Progression</span> : Gagnez des XP honnêtement en complétant vos exercices.</li>
                        <li className="flex gap-3 text-slate-300 text-base font-medium">🛡️ <span className="text-slate-100 font-black">Propriété</span> : Le contenu généré est destiné à votre usage éducatif personnel.</li>
                      </ul>
                    </section>

                    {/* Quality Policy Section */}
                    <section className="space-y-4 pt-8 border-t border-white/10">
                      <h4 className="font-black text-white uppercase tracking-[0.3em] text-sm text-center opacity-80">La Politique de TMAB GROUP</h4>
                      <p className="text-center text-slate-400 text-sm px-8 leading-relaxed font-medium">
                        Nous nous engageons à protéger vos données et à ne jamais les vendre. L'éducation est un droit, et nous luttons chaque jour pour que LEVELMAK reste l'outil le plus accessible et puissant pour la jeunesse africaine et mondiale.
                      </p>
                    </section>
                  </div>
                </div>

                {/* Footer Button */}
                <div className="p-6 bg-slate-950/50 border-t border-white/5">
                  <button
                    onClick={() => setIsInfoOpen(false)}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    J'ai compris, c'est parti !
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[140]"
          />
        )}
      </AnimatePresence>
      <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div >
  );
};

export default Layout;
