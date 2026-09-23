import React from 'react';
import {
  TrendingUp,
  Clock,
  Award,
  Zap,
  ChevronRight,
  BookOpenCheck,
  BrainCircuit,
  Sparkles,
  Quote,
  History,
  BookMarked,
  LineChart as ChartIcon,
  Dices,
  Gift,
  Lightbulb,
  X,
  Loader2,
  Coins,
  Star,
  CheckCircle2,
  Wifi,
  WifiOff,
  Download,
  Layers,
  Play,
  GraduationCap,
  Target,
  Flame,
  Crown
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../hooks/useStore';
import { useFlashcardStore } from '../services/flashcardStore';
import { aiService } from '../services/aiService';
import { getXpForNextLevel, AVATAR_LEVELS, LEAGUES, getLeagueFromXp } from '../constants';
import { feedbackService } from '../services/feedbackService';

// Lazy load heavy components
const MindGarden = React.lazy(() => import('../components/MindGarden').then(m => ({ default: m.MindGarden })));
const WorldBrainMap = React.lazy(() => import('../components/WorldBrainMap').then(m => ({ default: m.WorldBrainMap })));
const CollaborativeDoodle = React.lazy(() => import('../components/CollaborativeDoodle').then(m => ({ default: m.CollaborativeDoodle })));

const WidgetLoader = ({ label }: { label: string }) => (
  <div className="glass p-12 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center space-y-4">
    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">{label}...</p>
  </div>
);

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, missions, quizzes, flashcards, decks, dailyVocab, dailyMotivation, rollDice, isOnline, t, settings, updateProfile } = useStore();
  const [showHistory, setShowHistory] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState<string>('');
  const [percentLeft, setPercentLeft] = React.useState<number>(100);
  const isPremiumActive = !!(user && user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > Date.now());

  React.useEffect(() => {
    if (!isPremiumActive) return;

    const updateTimer = () => {
      const expiry = new Date(user.premium_until).getTime();
      const now = Date.now();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Abonnement expiré');
        setPercentLeft(0);
        return;
      }

      // Calculate time components with DAYS
      const totalSecs = Math.floor(diff / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      // Formatting: show days if >= 1 day, else show hours
      let formatted = '';
      if (days > 0) {
        formatted = `${days}j ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
      } else {
        formatted = `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
      }
      setTimeLeft(formatted);

      // Calculate total duration dynamically without hardcoded capping
      let totalDurationMs = 30 * 24 * 3600 * 1000; // Default fallback

      if (user.stats?.premium_started_at) {
        totalDurationMs = Math.max(diff, expiry - new Date(user.stats.premium_started_at).getTime());
      } else if (user.created_at) {
        totalDurationMs = Math.max(diff, expiry - new Date(user.created_at).getTime());
      } else {
        totalDurationMs = Math.max(diff, 365 * 24 * 3600 * 1000);
      }

      const pct = Math.max(5, Math.min(100, (diff / totalDurationMs) * 100));
      setPercentLeft(pct);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [user?.is_premium, user?.premium_until, user?.id]);

  // ✅ All hooks must be declared unconditionally before any early return
  const prevLevelRef = React.useRef(user?.avatar?.currentLevel || 1);

  React.useEffect(() => {
    if ((user?.avatar?.currentLevel || 1) > prevLevelRef.current) {
      feedbackService.fullSuccess();
      prevLevelRef.current = user?.avatar?.currentLevel || 1;
    }
  }, [user?.avatar?.currentLevel]);

  const currentLevelInfo = React.useMemo(() =>
    AVATAR_LEVELS.find(l => l.level === (user?.avatar?.currentLevel || 1)) || AVATAR_LEVELS[0],
    [user?.avatar?.currentLevel]
  );

  const handleToggleGoal = React.useCallback((goalId: string) => {
    if (!user) return;
    const currentAnalytics = user.analytics || {
      studyTimeBySubject: {},
      studyTimeByDay: [],
      quizPerformance: [],
      weeklyGoals: { target: 120, achieved: 0 },
      examPredictions: []
    };
    const updatedGoals = (currentAnalytics.customGoals || []).map(g =>
      g.id === goalId ? { ...g, completed: !g.completed } : g
    );
    updateProfile(user.name, user.phoneNumber, {
      analytics: {
        ...currentAnalytics,
        customGoals: updatedGoals
      }
    });
  }, [user, updateProfile]);

  const xpPercentage = React.useMemo(() => {
    const xpNeeded = getXpForNextLevel(user?.avatar?.currentLevel || 1);
    return Math.min(100, Math.max(0, ((user?.xp || 0) / xpNeeded) * 100));
  }, [user?.xp, user?.avatar?.currentLevel]);

  const today = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const srsCards = useFlashcardStore(state => state.cards);
  const localCardsToReview = React.useMemo(() => {
    const now = Date.now();
    return srsCards.filter(c => c.nextReviewDate <= now);
  }, [srsCards]);

  const dueQuizzes = React.useMemo(() =>
    quizzes.filter(q => q.nextReviewDate && new Date(q.nextReviewDate) <= new Date()),
    [quizzes]
  );

  const dueFlashcards = React.useMemo(() =>
    flashcards.filter(f => f.nextReviewDate && new Date(f.nextReviewDate) <= new Date()),
    [flashcards]
  );

  const dueDecks = React.useMemo(() => {
    const deckIds = new Set(dueFlashcards.map(f => f.deckId));
    return decks.filter(d => deckIds.has(d.id));
  }, [dueFlashcards, decks]);

  const formatTime = React.useCallback((hours: number) => {
    if (!hours || hours === 0) return `0 ${t('dashboard.time.min')}`;
    const totalMinutes = Math.floor(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const hUnit = t('dashboard.time.hoursShort');
    const mUnit = t('dashboard.time.minShort');

    if (h > 0) {
      return m > 0 ? `${h}${hUnit} ${m}${mUnit}` : `${h}${hUnit}`;
    }
    return `${m} ${mUnit}`;
  }, [t]);

  if (!user) {
    console.warn('[Dashboard] User is null, showing inner loader');
    return <WidgetLoader label="Chargement de votre profil" />;
  }

  return (
    <div className="space-y-6 md:space-y-10 max-w-7xl mx-auto px-1 sm:px-4 md:px-0 pb-24 md:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6 md:space-y-10">
          {/* Profile Card Header (Top of Dashboard) */}
          <section className="relative overflow-hidden glass p-4 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border border-white/60 dark:border-white/10 shadow-xl dark:shadow-2xl bg-white/65 dark:bg-slate-900/80 backdrop-blur-xl group transition-all duration-300">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-[110px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[110px] pointer-events-none"></div>

            <div className="flex flex-col items-center justify-center text-center space-y-6 relative z-10">
              {/* Hero Avatar & Level Badge */}
              <div className="relative group/avatar">
                <div className="w-28 md:w-36 h-28 md:h-36 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-purple-500 to-indigo-500 shadow-[0_0_35px_rgba(245,158,11,0.35)] group-hover/avatar:scale-105 transition-transform duration-500">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-950 border-4 border-white dark:border-slate-950 flex items-center justify-center">
                    {user.avatar?.image ? (
                      <img src={user.avatar.image} alt={user.name || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white">{(user.name || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                  <span className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] md:text-xs px-3.5 py-1 rounded-full shadow-lg border-2 border-white dark:border-slate-950 flex items-center gap-1 uppercase tracking-widest">
                    ⭐ {t('dashboard.profile.level')} {user.avatar?.currentLevel || 1}
                  </span>
                </div>
              </div>

              {/* User Name & 3D Metallic League Badge */}
              <div className="space-y-2.5 flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {user.name}<span className="text-amber-500 dark:text-amber-400">.</span>
                </h2>

                {(() => {
                  const leagueId = getLeagueFromXp(user.totalXp);
                  const league = LEAGUES.find(l => l.id === leagueId) || LEAGUES[0];
                  
                  let badgeStyle = "border-amber-700/50 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 text-amber-300 shadow-[0_0_20px_rgba(205,127,50,0.25)]";
                  if (league.id === 'silver') {
                    badgeStyle = "border-slate-300/50 bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80 text-slate-100 shadow-[0_0_20px_rgba(192,192,192,0.35)]";
                  } else if (league.id === 'gold') {
                    badgeStyle = "border-yellow-500/60 bg-gradient-to-r from-yellow-950/70 via-amber-800/50 to-yellow-950/70 text-yellow-300 shadow-[0_0_25px_rgba(255,215,0,0.4)]";
                  } else if (league.id === 'diamond') {
                    badgeStyle = "border-cyan-400/60 bg-gradient-to-r from-cyan-950/70 via-blue-900/50 to-cyan-950/70 text-cyan-200 shadow-[0_0_25px_rgba(56,189,248,0.45)]";
                  } else if (league.id === 'master') {
                    badgeStyle = "border-rose-500/60 bg-gradient-to-r from-rose-950/70 via-red-900/50 to-rose-950/70 text-rose-200 shadow-[0_0_25px_rgba(239,68,68,0.45)]";
                  }

                  return (
                    <motion.div
                      key={league.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`inline-flex items-center gap-2 px-5 py-2 rounded-2xl border ${badgeStyle} font-black uppercase text-xs tracking-[0.2em] transition-all`}
                    >
                      <span className="text-lg">{league.icon}</span>
                      <span>{league.name}</span>
                    </motion.div>
                  );
                })()}
              </div>

              {/* Side-by-Side Stat Cards (Streak & LevelCoins) */}
              <div className="grid grid-cols-2 gap-3 md:gap-5 w-full max-w-full sm:max-w-md">
                {/* Streak Card */}
                <div className="bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-red-500/15 dark:from-orange-500/20 dark:via-orange-500/10 dark:to-red-500/20 border border-orange-500/30 p-3.5 md:p-5 rounded-2xl md:rounded-3xl flex items-center justify-center gap-3 shadow-sm dark:shadow-[0_0_20px_rgba(249,115,22,0.15)] group/streak">
                  <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-orange-500/20 text-orange-500 dark:text-orange-400 flex items-center justify-center border border-orange-500/40 shrink-0 group-hover/streak:scale-110 transition-transform">
                    <Flame className="w-5 h-5 md:w-6 md:h-6 fill-orange-500 text-orange-500 dark:text-orange-400 animate-pulse" />
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] md:text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Série</p>
                    <p className="text-sm md:text-xl font-display font-black text-slate-900 dark:text-white">{user.streak?.current || 0} Jour{(user.streak?.current || 0) > 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* LevelCoins Card */}
                <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-yellow-500/15 dark:from-amber-500/20 dark:via-amber-500/10 dark:to-yellow-500/20 border border-amber-500/30 p-3.5 md:p-5 rounded-2xl md:rounded-3xl flex items-center justify-center gap-3 shadow-sm dark:shadow-[0_0_20px_rgba(245,158,11,0.15)] group/coins">
                  <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-amber-500/40 shrink-0 group-hover/coins:rotate-12 transition-transform">
                    <Coins className="w-5 h-5 md:w-6 md:h-6 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] md:text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{t('shop.balance')}</p>
                    <p className="text-sm md:text-xl font-display font-black text-slate-900 dark:text-white">{user.levelCoins || 0}</p>
                  </div>
                </div>
              </div>

              {/* Status Pill Tags (Centered & Balanced) */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3.5">
                {isPremiumActive ? (
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 text-amber-300 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest border border-amber-500/40 shadow-sm shadow-amber-950/30">
                    <Crown size={13} className="text-amber-400 fill-amber-400" /> Étudiant Premium
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-white/10">
                    <GraduationCap size={13} className="text-slate-400" /> Étudiant Gratuit
                  </div>
                )}

                <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest border ${isOnline
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30'
                  }`}>
                  {isOnline ? (<><Wifi size={13} /> {t('dashboard.online')}</>) : (<><WifiOff size={13} /> {t('dashboard.offline')}</>)}
                </div>
              </div>

              {/* Energy Progress Bar */}
              <div className="w-full max-w-lg space-y-2 pt-2">
                <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 font-bold text-center leading-relaxed">
                  Niveau {user.avatar?.currentLevel || 1} • <span className="text-amber-600 dark:text-amber-400 font-black">{Math.round(xpPercentage)}%</span> vers le Niveau {(user.avatar?.currentLevel || 1) + 1}
                </p>

                <div className="w-full bg-slate-200/80 dark:bg-slate-950/80 rounded-full h-4 md:h-5 p-1 border border-slate-300/60 dark:border-white/10 shadow-inner relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(139,92,246,0.4)] relative"
                    style={{ width: `${xpPercentage}%` }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white blur-[1px] opacity-75 animate-pulse"></div>
                  </div>
                </div>

                <div className="flex justify-between text-[9px] md:text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                  <span>{user.xp || 0} / {getXpForNextLevel(user.avatar?.currentLevel || 1)} XP</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {Math.max(0, Math.round(getXpForNextLevel(user.avatar?.currentLevel || 1) - (user.xp || 0)))} XP restants
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Summary Card (Directly Below Profile Card) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: t('dashboard.stats.xp'), value: user.totalXp || 0, icon: Zap, color: 'text-amber-500', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.15)]', border: 'border-amber-500/10' },
              { label: t('dashboard.stats.quiz'), value: quizzes.length, icon: BookOpenCheck, color: 'text-blue-500', glow: 'shadow-[0_0_15px_rgba(37,99,235,0.15)]', border: 'border-blue-500/10' },
              { label: t('dashboard.stats.time'), value: formatTime(user.stats?.hoursLearned || 0), icon: Clock, color: 'text-purple-500', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]', border: 'border-purple-500/10', tab: 'analytics' },
              { label: t('dashboard.stats.badges'), value: (user.badges || []).length, icon: Award, color: 'text-rose-500', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]', border: 'border-rose-500/10' },
            ].map((stat) => (
              <div
                key={stat.label}
                onClick={() => stat.tab && onNavigate(stat.tab)}
                className={`glass p-3 md:p-5 rounded-xl md:rounded-[2rem] border ${stat.border} flex items-center gap-2 md:gap-4 transition-all duration-300 ${stat.tab ? 'hover:scale-[1.05] cursor-pointer' : 'hover:scale-[1.02]'} ${stat.glow} group relative overflow-hidden`}
              >
                <div className={`p-2 md:p-3.5 rounded-lg md:rounded-2xl glass flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform relative z-10 border border-white/5`}>
                  <stat.icon size={16} className="md:w-6 md:h-6" strokeWidth={2.5} />
                </div>
                <div className="relative z-10">
                  <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{stat.label}</p>
                  <p className="text-sm md:text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* AI Spirit Card */}



          {/* AI Spirit Card */}
          <div className="relative group overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 border border-white/5 p-6 md:p-8">
            <div className="flex items-start gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Quote size={24} className="md:w-8 md:h-8" />
              </div>
              <div className="space-y-2">
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-primary-light">{t('dashboard.motivation.title')}</p>
                <h4 className="text-base md:text-2xl font-display font-bold text-slate-900 dark:text-white leading-tight italic">
                  {dailyMotivation.loading ? t('dashboard.motivation.loading') : `"${dailyMotivation.quote}"`}
                </h4>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">— {dailyMotivation.loading ? t('dashboard.motivation.author') : dailyMotivation.author}</p>
              </div>
            </div>
          </div>

          {/* Spaced Repetition (SRS) Section */}
          {(dueQuizzes.length > 0 || dueDecks.length > 0 || localCardsToReview.length > 0) && (
            <section className="animate-fade-in space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <BrainCircuit className="text-primary animate-pulse" /> {t('dashboard.srs.title') || 'À Réviser'}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  {dueQuizzes.length + dueDecks.length + (localCardsToReview.length > 0 ? 1 : 0)} {t('dashboard.srs.items') || 'éléments dus'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localCardsToReview.length > 0 && (
                   <div className="glass p-5 rounded-3xl border border-purple-500/30 bg-purple-500/10 group hover:border-purple-500 transition-all flex items-center justify-between shadow-glow-purple">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
                        <Layers size={24} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-purple-400">Erreurs passées</p>
                        <h4 className="font-bold text-white text-lg leading-tight">Flashcards</h4>
                        <p className="text-[10px] text-purple-300 font-bold mt-1">{localCardsToReview.length} en attente</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('flashcard_mode')}
                      className="p-3 bg-purple-600 text-white rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-110 active:scale-95 transition-all"
                    >
                      <Play size={20} className="ml-0.5" />
                    </button>
                  </div>
                )}
                {dueQuizzes.map(quiz => (
                  <div key={quiz.id} className="glass p-5 rounded-3xl border border-primary/20 bg-primary/5 group hover:border-primary transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                        <Zap size={24} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-primary/70">{quiz.subject}</p>
                        <h4 className="font-bold text-white text-lg leading-tight">{quiz.title}</h4>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('quiz')}
                      className="p-3 bg-primary text-white rounded-xl shadow-glow hover:scale-110 active:scale-95 transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                ))}

                {dueDecks.map(deck => (
                  <div key={deck.id} className="glass p-5 rounded-3xl border border-secondary/20 bg-secondary/5 group hover:border-secondary transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary border border-secondary/20">
                        <Star size={24} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-secondary/70">{deck.subject}</p>
                        <h4 className="font-bold text-white text-lg leading-tight">{deck.title}</h4>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">
                          {dueFlashcards.filter(f => f.deckId === deck.id).length} {t('dashboard.srs.cardsDue') || 'cartes à revoir'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('flashcards')}
                      className="p-3 bg-secondary text-white rounded-xl shadow-glow hover:scale-110 active:scale-95 transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Vocabulaire du Jour Section */}
          <section className="animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 px-2 gap-2">
              <h3 className="text-lg md:text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <Sparkles className="text-blue-500 animate-pulse w-5 h-5" /> {t('dashboard.vocab.title')}
              </h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{t('dashboard.vocab.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {dailyVocab.loading ? (
                // Squelettes de chargement
                [1, 2].map((i) => (
                  <div key={i} className="glass p-4 rounded-2xl border border-slate-200 dark:border-white/10 animate-pulse">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/5 mb-3"></div>
                    <div className="h-6 bg-slate-200 dark:bg-white/5 rounded-lg w-3/4 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-10 bg-slate-200 dark:bg-white/5 rounded-xl w-full"></div>
                      <div className="h-12 bg-slate-200 dark:bg-white/5 rounded-xl w-full"></div>
                    </div>
                  </div>
                ))
              ) : dailyVocab.words && dailyVocab.words.length > 0 ? (
                dailyVocab.words.map((item) => (
                  <div key={item.word} className="glass p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 hover:border-blue-500/30 transition-all group flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                          <BookMarked size={16} />
                        </div>
                        <h4 className="text-base md:text-lg font-display font-black text-slate-900 dark:text-white tracking-tight group-hover:text-blue-500 transition-colors">
                          {item.word}
                        </h4>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 mb-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                          "{item.explanation}"
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-500/5 rounded-xl border-l-2 border-blue-500">
                      <p className="text-[8px] font-black uppercase tracking-widest text-blue-500 mb-1">{t('dashboard.vocab.example')}</p>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {item.usage}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-6 text-center glass rounded-2xl border border-white/10">
                  <p className="text-slate-400 font-bold text-xs">{t('dashboard.vocab.empty')}</p>
                </div>
              )}
            </div>
          </section>

          {/* Activity Section */}
          <section>
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <History className="text-blue-500" /> {t('dashboard.activity.title')}
              </h3>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary dark:hover:text-primary-light transition-colors"
              >
                {showHistory ? t('dashboard.activity.reduce') : t('dashboard.activity.viewAll')}
              </button>
            </div>
            <div className="space-y-3 md:space-y-4">
              {(user.activities && user.activities.length > 0) ? (showHistory ? user.activities : user.activities.slice(0, 3)).map(activity => (
                <div key={activity.id} className="glass p-4 rounded-2xl md:rounded-3xl border border-black/5 dark:border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-4 md:gap-5">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/5 dark:bg-primary/10 text-primary flex items-center justify-center border border-primary/10 dark:border-primary/20">
                      {activity.type === 'quiz' ? <BrainCircuit size={20} className="md:w-7 md:h-7" /> :
                        activity.type === 'badge' ? <Award size={20} className="md:w-7 md:h-7" /> :
                          activity.type === 'post' ? <Sparkles size={20} className="md:w-7 md:h-7" /> :
                            <Zap size={20} className="md:w-7 md:h-7" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm md:text-lg tracking-tight line-clamp-1">{activity.title}</p>
                      <p className="text-[9px] md:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="bg-black/5 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-10 text-center">
                  <p className="text-slate-500 font-bold text-sm">{t('dashboard.activity.empty')}</p>
                </div>
              )}
            </div>
          </section>

          {/* World Brain Map */}
          <div id="world-map" className="scroll-mt-24">
            <React.Suspense fallback={<WidgetLoader label="Initialisation du Réseau Mondial" />}>
              <WorldBrainMap onNavigate={onNavigate} />
            </React.Suspense>
          </div>

          {/* Collaborative Doodle */}
          <React.Suspense fallback={<WidgetLoader label="Atelier Collaboratif" />}>
            <CollaborativeDoodle />
          </React.Suspense>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Premium Status / Countdown Widget */}
          {isPremiumActive && (
            <div className="glass p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-slate-100/60 to-indigo-500/10 dark:from-blue-950/10 dark:via-slate-900/40 dark:to-indigo-950/10 shadow-premium relative overflow-hidden ring-1 ring-blue-500/10">
              {/* Pulsing glow background */}
              <div className="absolute -right-12 -top-12 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl animate-pulse" />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-lg md:text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  Levelmak Pro
                </h3>
                <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full">
                  Elite
                </span>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="bg-white/80 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Temps restant</p>
                  <p className="text-3xl font-mono font-black text-blue-600 dark:text-blue-400 tracking-tight">{timeLeft || 'Calcul en cours...'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
                    <span>Abonnement Actif</span>
                    <span className="text-blue-600 dark:text-blue-300 font-bold">{Math.round(percentLeft)}% restants</span>
                  </div>
                  <div className="h-2.5 bg-slate-200/80 dark:bg-black/40 rounded-full overflow-hidden p-0.5 border border-slate-300/60 dark:border-white/5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                      style={{ width: `${percentLeft}%` }}
                    />
                  </div>
                </div>

                <p className="text-[9px] text-slate-500 font-bold text-center leading-normal">
                  Votre accès Premium repassera automatiquement au mode gratuit à l'échéance.
                </p>
              </div>
            </div>
          )}

          {/* Mind Garden */}
          <React.Suspense fallback={<WidgetLoader label="Culture de l'Esprit" />}>
            <MindGarden />
          </React.Suspense>

          {/* Goals Checklist Widget */}
          <div className="glass p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200/80 dark:border-white/10 shadow-premium">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg md:text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Target size={20} className="text-secondary" />
                {settings.language === 'fr' ? 'Mes Objectifs' : 'My Goals'}
              </h3>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary-light transition-colors animate-pulse"
              >
                {settings.language === 'fr' ? 'Ajuster' : 'Adjust'}
              </button>
            </div>
            
            <div className="space-y-4">
              {(() => {
                const analytics = user.analytics || {
                  weeklyGoals: { target: 120, achieved: 0 },
                  customGoals: []
                };
                const goalsList = (analytics.customGoals && analytics.customGoals.length > 0)
                  ? analytics.customGoals
                  : [
                      { id: 'default_1', text: 'Faire 3 quiz cette semaine', completed: false },
                      { id: 'default_2', text: 'Étudier 2 heures au total', completed: false },
                      { id: 'default_3', text: 'Lire un livre de la bibliothèque', completed: false }
                    ];
                const totalGoals = goalsList.length;
                const completedGoals = goalsList.filter(g => g.completed).length;
                const goalsPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

                return (
                  <>
                    {/* Goals completion progress */}
                    <div className="space-y-2 pb-4 border-b border-slate-200/80 dark:border-white/5">
                      <div className="flex justify-between items-end text-xs">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">{settings.language === 'fr' ? 'Progression' : 'Progress'}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{completedGoals} / {totalGoals} {settings.language === 'fr' ? 'objectifs' : 'goals'}</span>
                      </div>
                      <div className="h-2 bg-slate-200/80 dark:bg-black/20 rounded-full overflow-hidden p-0.5 border border-slate-300/60 dark:border-white/5">
                        <div
                          className="h-full rounded-full bg-secondary shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-all duration-500"
                          style={{ width: `${goalsPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Checklist of custom goals */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                      {goalsList.map((goal) => (
                        <button
                          key={goal.id}
                          onClick={() => handleToggleGoal(goal.id)}
                          className={`w-full p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                            goal.completed
                              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 line-through'
                              : 'bg-slate-100/90 dark:bg-black/10 border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-black/25'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            goal.completed
                              ? 'bg-green-500 border-green-500 text-slate-950'
                              : 'border-slate-400 dark:border-white/30 text-transparent'
                          }`}>
                            {goal.completed && <CheckCircle2 size={10} className="text-white" />}
                          </div>
                          <span className="text-[11px] font-bold text-left leading-tight truncate">{goal.text}</span>
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>



          {/* Ranking Widget */}
          <div className="glass p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 overflow-hidden relative group">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-4">{t('dashboard.ranking.title')}</p>
            <div className="flex items-baseline justify-between mb-6">
              <span className="text-5xl md:text-6xl font-display font-black tracking-tighter text-gradient-primary">#{user.rank}</span>
              <span className="text-green-500 text-[10px] font-black bg-green-500/10 px-3 py-1 rounded-full flex items-center">
                <TrendingUp size={12} className="mr-1" /> +3
              </span>
            </div>
            <button
              onClick={() => onNavigate('ranking')}
              className="w-full py-3 md:py-4 bg-white/5 hover:bg-white text-slate-400 hover:text-slate-900 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
            >
              {t('dashboard.ranking.button')}
            </button>
          </div>
        </div>
      </div >



      {/* Footer Attribution */}
      < div className="pt-8 pb-12 flex flex-col items-center justify-center opacity-40 group hover:opacity-100 transition-opacity duration-500" >
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-500 to-transparent mb-4"></div>
        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500 mb-4">
          {t('dashboard.footer.property')} <span className="text-blue-600">TMAB GROUP</span>
        </p>
        <div className="relative group/logo">
          <div className="absolute -inset-6 bg-blue-600/5 rounded-full blur-2xl opacity-0 group-hover/logo:opacity-100 transition-opacity duration-700"></div>
          <div 
            className="glass-light p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 group-hover/logo:border-blue-500/30 transition-all duration-500 shadow-inner relative z-10"
          >
            <img
              src="/tmab_logo.png"
              alt="TMAB GROUP"
              className="w-16 md:w-24 h-auto object-contain brightness-110 contrast-110 drop-shadow-[0_0_12px_rgba(59,130,246,0.2)]"
            />
          </div>
        </div>
      </div >
    </div >
  );
};

export default Dashboard;
