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
  Download
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
import { openrouterService } from '../services/openrouter';
import { XP_PER_LEVEL, AVATAR_LEVELS, LEAGUES, getLeagueFromXp, getXpForNextLevel } from '../constants';
import { MindGarden } from '../components/MindGarden';
import { WorldBrainMap } from '../components/WorldBrainMap';
import { CollaborativeDoodle } from '../components/CollaborativeDoodle';
import { feedbackService } from '../services/feedbackService';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, missions, quizzes, flashcards, decks, dailyVocab, dailyMotivation, rollDice, isOnline, t, settings } = useStore();
  const [showHistory, setShowHistory] = React.useState(false);
  const [showDiceModal, setShowDiceModal] = React.useState(false);
  const [isRolling, setIsRolling] = React.useState(false);
  const [diceResult, setDiceResult] = React.useState<number | null>(null);
  const [reward, setReward] = React.useState<any>(null);
  const [surprise, setSurprise] = React.useState<any>(null);

  if (!user) return null;

  const prevLevelRef = React.useRef(user.avatar.currentLevel);

  React.useEffect(() => {
    if (user.avatar.currentLevel > prevLevelRef.current) {
      feedbackService.fullSuccess();
      prevLevelRef.current = user.avatar.currentLevel;
    }
  }, [user.avatar.currentLevel]);

  const currentLevelInfo = React.useMemo(() =>
    AVATAR_LEVELS.find(l => l.level === user.avatar.currentLevel) || AVATAR_LEVELS[0],
    [user.avatar.currentLevel]
  );

  const xpPercentage = React.useMemo(() => {
    const xpNeeded = getXpForNextLevel(user.avatar.currentLevel || 1);
    return Math.min(100, Math.max(0, (user.xp / xpNeeded) * 100));
  }, [user.xp, user.avatar.currentLevel]);

  const today = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  const canRollDice = React.useMemo(() =>
    !user.lastDiceRoll || user.lastDiceRoll !== today,
    [user.lastDiceRoll, today]
  );

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

  const handleDiceRoll = async () => {
    try {
      setIsRolling(true);
      setDiceResult(null);
      setReward(null);
      setSurprise(null);

      // Delay for animation
      await new Promise(r => setTimeout(r, 1500));

      const result = rollDice();
      setDiceResult(result.result);
      setReward(result.reward);

      // If surprise, fetch from Gemini
      if (result.reward.type === 'surprise') {
        const surpriseData = await openrouterService.getDiceSurprise(settings.language);
        setSurprise(surpriseData);
      }
    } catch (error: any) {
      alert(error.message);
      setShowDiceModal(false);
    } finally {
      setIsRolling(false);
    }
  };

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

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 md:px-0 pb-24 md:pb-0">
      {/* Stats Summary Card */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[
          { label: t('dashboard.stats.xp'), value: user.totalXp, icon: Zap, color: 'text-amber-500', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.15)]', border: 'border-amber-500/10' },
          { label: t('dashboard.stats.quiz'), value: quizzes.length, icon: BookOpenCheck, color: 'text-blue-500', glow: 'shadow-[0_0_15px_rgba(37,99,235,0.15)]', border: 'border-blue-500/10' },
          { label: t('dashboard.stats.time'), value: formatTime(user.stats.hoursLearned), icon: Clock, color: 'text-purple-500', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]', border: 'border-purple-500/10', tab: 'analytics' },
          { label: t('dashboard.stats.badges'), value: user.badges.length, icon: Award, color: 'text-rose-500', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]', border: 'border-rose-500/10' },
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => stat.tab && onNavigate(stat.tab)}
            className={`glass p-3 md:p-6 rounded-xl md:rounded-[2rem] border ${stat.border} flex items-center gap-2 md:gap-5 transition-all duration-300 ${stat.tab ? 'hover:scale-[1.05] cursor-pointer' : 'hover:scale-[1.02]'} ${stat.glow} group relative overflow-hidden`}
          >
            <div className={`p-2 md:p-4 rounded-lg md:rounded-2xl glass flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform relative z-10 border border-white/5`}>
              <stat.icon size={16} className="md:w-7 md:h-7" strokeWidth={2.5} />
            </div>
            <div className="relative z-10">
              <p className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{stat.label}</p>
              <p className="text-sm md:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-12">
          {/* Profile Card Header */}
          <section className="relative overflow-hidden glass p-5 md:p-12 rounded-[1.5rem] md:rounded-[4rem] border border-white/10 shadow-premium group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-[80px] -ml-24 -mb-24"></div>

            <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8 relative z-10">
              <div className="relative">
                <div className="w-20 md:w-32 h-20 md:h-32 rounded-[1.2rem] md:rounded-[3rem] bg-gradient-to-br from-primary to-secondary p-0.5 md:p-1 rotate-2 md:rotate-3 group-hover:rotate-6 transition-transform shadow-2xl overflow-hidden">
                  <div className="w-full h-full rounded-[1.1rem] md:rounded-[2.8rem] overflow-hidden bg-slate-900 border md:border-4 border-slate-900 flex items-center justify-center">
                    {user.avatar?.image ? (
                      <img src={user.avatar.image} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl md:text-5xl font-black text-white">{user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-success text-white text-[7px] md:text-[10px] font-black px-2 md:px-3 py-0.5 md:py-1 rounded-full border-2 md:border-4 border-slate-900 shadow-xl">
                  {t('dashboard.profile.level')} {user.avatar?.currentLevel || 1}
                </div>
              </div>

              <div className="text-center md:text-left space-y-2 md:space-y-4 flex-1 w-full">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      <h2 className="text-3xl md:text-6xl font-display font-black text-slate-900 dark:text-white tracking-tighter whitespace-nowrap">
                        {user.name}<span className="text-primary">.</span>
                      </h2>
                      {(() => {
                        const leagueId = getLeagueFromXp(user.totalXp);
                        const league = LEAGUES.find(l => l.id === leagueId);
                        if (!league) return null;
                        return (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-black/20 backdrop-blur-md shadow-lg group/league cursor-help"
                            style={{ borderColor: `${league.color}33` }}
                            title={league.name}
                          >
                            <span className="text-lg md:text-xl">{league.icon}</span>
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest" style={{ color: league.color }}>{league.name}</span>
                          </motion.div>
                        );
                      })()}
                    </div>
                    {user.streak?.current > 0 && (
                      <div className="inline-flex items-center gap-2 bg-orange-500/10 dark:bg-orange-500/20 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-orange-500/20 shadow-glow-orange animate-bounce">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-lg md:text-2xl">{user.streak.current}</span>
                        <Zap size={20} className="text-orange-500 fill-orange-500" />
                      </div>
                    )}
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 dark:bg-amber-500/20 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-amber-500/20 shadow-sm self-center md:self-auto group/balance animate-fade-in">
                      <div className="flex flex-col items-center md:items-start -space-y-0.5 md:-space-y-1">
                        <span className="text-[7px] md:text-[8px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">{t('shop.balance')}</span>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <span className="text-base md:text-3xl font-display font-black text-slate-900 dark:text-white">{user.levelCoins || 0}</span>
                          <Coins className="text-amber-500 group-hover/balance:rotate-12 transition-transform" size={14} md:size={24} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[8px] font-black uppercase tracking-widest border border-blue-500/10">
                      <Sparkles size={10} /> {t('dashboard.profile.studentPro')}
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-colors ${isOnline
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/10'
                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/10'
                      }`}>
                      {isOnline ? (<><Wifi size={10} /> {t('dashboard.online')}</>) : (<><WifiOff size={10} /> {t('dashboard.offline')}</>)}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10">
                      {t('dashboard.profile.eliteMember')}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] md:text-base text-slate-500 dark:text-slate-400 font-medium max-w-lg leading-relaxed mx-auto md:mx-0">
                  {t('dashboard.profile.nextLevel')} <span className="text-slate-900 dark:text-white font-bold">{Math.round(xpPercentage)}%</span> {t('dashboard.profile.ofNextLevel')}
                </p>

                <div className="space-y-1.5 md:space-y-2">
                  <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-3 md:h-5 p-0.5 md:p-1 border border-slate-200 dark:border-white/5 shadow-inner relative overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out shadow-sm relative"
                      style={{ width: `${xpPercentage}%` }}
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-2 bg-white blur-[2px] opacity-40"></div>
                    </div>
                  </div>
                  <div className="flex justify-between px-0.5">
                    <span className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-tighter">{user.xp} XP</span>
                    <span className="text-[7px] md:text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                      {Math.round(getXpForNextLevel(user.avatar?.currentLevel || 1) - user.xp)} {t('dashboard.profile.remaining')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Lucky Dice Widget */}
          {canRollDice && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative group overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border-2 border-amber-500/30 p-6 md:p-8 cursor-pointer hover:scale-[1.02] transition-all"
              onClick={() => setShowDiceModal(true)}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(251,191,36,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
              <div className="flex items-center gap-4 md:gap-6 relative z-10">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0 animate-bounce">
                  <Dices size={32} className="md:w-12 md:h-12" />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">🎲 {t('dashboard.dice.chance')}</p>
                  <h4 className="text-xl md:text-3xl font-display font-black text-slate-900 dark:text-white leading-tight">
                    {t('dashboard.dice.title')}
                  </h4>
                  <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold">{t('dashboard.dice.subtitle')}</p>
                </div>
              </div>
            </motion.div>
          )}

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
          {(dueQuizzes.length > 0 || dueDecks.length > 0) && (
            <section className="animate-fade-in space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <BrainCircuit className="text-primary animate-pulse" /> {t('dashboard.srs.title') || 'À Réviser'}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  {dueQuizzes.length + dueDecks.length} {t('dashboard.srs.items') || 'éléments dus'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 px-2 gap-4">
              <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Sparkles className="text-blue-500 animate-pulse" /> {t('dashboard.vocab.title')}
              </h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('dashboard.vocab.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {dailyVocab.loading ? (
                // Squelettes de chargement
                [1, 2].map((i) => (
                  <div key={i} className="glass p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 animate-pulse">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/5 mb-6"></div>
                    <div className="h-8 bg-slate-200 dark:bg-white/5 rounded-lg w-3/4 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-12 bg-slate-200 dark:bg-white/5 rounded-xl w-full"></div>
                      <div className="h-16 bg-slate-200 dark:bg-white/5 rounded-xl w-full"></div>
                    </div>
                  </div>
                ))
              ) : dailyVocab.words && dailyVocab.words.length > 0 ? (
                dailyVocab.words.map((item, idx) => (
                  <div key={idx} className="glass p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 hover:border-blue-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-4 md:mb-6">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                        <BookMarked size={20} className="md:w-6 md:h-6" />
                      </div>
                    </div>

                    <h4 className="text-xl md:text-2xl font-display font-black text-slate-900 dark:text-white mb-3 tracking-tight group-hover:text-blue-600 transition-colors">
                      {item.word}
                    </h4>

                    <div className="space-y-4">
                      <div className="p-3 md:p-4 bg-slate-50 dark:bg-white/5 rounded-xl md:rounded-2xl border border-slate-100 dark:border-white/5">
                        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                          "{item.explanation}"
                        </p>
                      </div>

                      <div>
                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">{t('dashboard.vocab.example')}</p>
                        <p className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed bg-blue-500/5 p-3 md:p-4 rounded-xl md:rounded-2xl border-l-4 border-blue-500">
                          {item.usage}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-8 text-center glass rounded-3xl border border-white/10">
                  <p className="text-slate-400 font-bold">Aucun mot disponible pour le moment.</p>
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
          <WorldBrainMap />

          {/* Collaborative Doodle */}
          <CollaborativeDoodle />
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Mind Garden */}
          <MindGarden />

          {/* Mission Widgets */}
          <div className="glass p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-premium">
            <h3 className="text-lg md:text-xl font-display font-bold text-slate-900 dark:text-white mb-6 md:mb-8 flex items-center gap-3">
              <TrendingUp size={20} className="text-amber-500" />
              {t('dashboard.missions.title')}
            </h3>
            <div className="space-y-4">
              {missions.filter(m => !m.completed).map(mission => (
                <div key={mission.id} className="p-4 md:p-5 rounded-2xl md:rounded-3xl border transition-all bg-black/5 dark:bg-white/5 border-transparent">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-bold text-sm leading-tight text-slate-900 dark:text-white">
                      {mission.title}
                    </p>
                    <span className="shrink-0 text-[8px] font-black uppercase tracking-tighter bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                      +{mission.rewardXp}
                    </span>
                  </div>
                  <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-green-500 transition-all w-0" />
                  </div>
                </div>
              ))}
              {missions.filter(m => !m.completed).length === 0 && (
                <div className="p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                  <p className="text-slate-500 font-bold text-sm">{t('dashboard.missions.allCompleted')}</p>
                </div>
              )}
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

      {/* Dice Modal */}
      <AnimatePresence>
        {
          showDiceModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl"
              onClick={() => !isRolling && setShowDiceModal(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative bg-slate-900 border-2 border-amber-500/30 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 max-w-lg w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowDiceModal(false)}
                  className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-red-500/20 text-white hover:text-red-500 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>

                <div className="text-center space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-4xl font-display font-black text-white">🎲 {t('dashboard.dice.modalTitle')}</h2>
                    <p className="text-slate-400 font-bold text-xs md:text-sm">{t('dashboard.dice.modalSubtitle')}</p>
                  </div>
                  

                  {/* Dice Animation */}
                  {!diceResult && (
                    <div className="py-12">
                      {!isRolling ? (
                        <button
                          onClick={handleDiceRoll}
                          className="w-32 h-32 md:w-40 md:h-40 mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-glow hover:scale-110 transition-all"
                        >
                          <Dices size={64} className="md:w-20 md:h-20" />
                        </button>
                      ) : (
                        <motion.div
                          animate={{ rotateX: [0, 360], rotateY: [0, 360], rotateZ: [0, 360] }}
                          transition={{ duration: 1.5, repeat: 0 }}
                          className="w-24 h-24 md:w-32 md:h-32 mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center text-white shadow-glow"
                        >
                          <Dices size={48} className="md:w-16 md:h-16" />
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Result Display */}
                  {diceResult && reward && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-6"
                    >
                      <div className="text-8xl md:text-9xl font-black text-amber-500">{diceResult}</div>

                      {reward.type === 'item' && (
                        <div className="space-y-4">
                          <div className="w-24 h-24 md:w-32 md:h-32 mx-auto bg-purple-500/20 rounded-3xl flex items-center justify-center border-2 border-purple-500/40">
                            <Gift size={48} className="md:w-16 md:h-16 text-purple-500" />
                          </div>
                          <h3 className="text-2xl md:text-3xl font-black text-white">🎁 {t('dashboard.dice.itemWon')}</h3>
                          <p className="text-slate-400 font-bold">{t('dashboard.dice.checkInventory')}</p>
                        </div>
                      )}

                      {reward.type === 'joker' && (
                        <div className="space-y-4">
                          <div className="w-24 h-24 md:w-32 md:h-32 mx-auto bg-green-500/20 rounded-3xl flex items-center justify-center border-2 border-green-500/40">
                            <Zap size={48} className="md:w-16 md:h-16 text-green-500" />
                          </div>
                          <h3 className="text-2xl md:text-3xl font-black text-white">🃏 {t('dashboard.dice.jokerWon')}</h3>
                          <p className="text-slate-400 font-bold">{t('dashboard.dice.jokerMsg')}</p>
                        </div>
                      )}

                      {reward.type === 'surprise' && surprise && (
                        <div className="space-y-4">
                          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-blue-500/20 rounded-2xl flex items-center justify-center border-2 border-blue-500/40">
                            <Lightbulb size={32} className="md:w-10 md:h-10 text-blue-500" />
                          </div>
                          <h3 className="text-xl md:text-2xl font-black text-white">{surprise.title}</h3>
                          <div className="bg-white/5 rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10 max-h-[40vh] overflow-y-auto custom-scrollbar">
                            <p className="text-xs md:text-sm text-white leading-relaxed font-medium">{surprise.content}</p>
                          </div>
                          <p className="text-slate-500 text-[10px] md:text-xs font-bold">— {surprise.author}</p>
                        </div>
                      )}

                      {reward.type === 'surprise' && !surprise && (
                        <div className="flex items-center justify-center gap-3">
                          <Loader2 size={24} className="animate-spin text-blue-500" />
                          <p className="text-white font-bold">{t('dashboard.dice.coachPreparing')}</p>
                        </div>
                      )}

                      {reward.type === 'super' && (
                        <div className="space-y-4">
                          <div className="text-6xl">🎊</div>
                          <h3 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-red-500">{t('dashboard.dice.jackpot')}</h3>
                          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                              <Gift className="mx-auto mb-2 text-purple-500" size={32} />
                              <p className="text-white font-bold text-sm">{t('dashboard.dice.accessory')}</p>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                              <Zap className="mx-auto mb-2 text-green-500" size={32} />
                              <p className="text-white font-bold text-sm">{t('dashboard.dice.joker')}</p>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                              <Sparkles className="mx-auto mb-2 text-amber-500" size={32} />
                              <p className="text-white font-bold text-sm">+200 XP</p>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                              <Award className="mx-auto mb-2 text-orange-500" size={32} />
                              <p className="text-white font-bold text-sm">+100 Coins</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )
        }
      </AnimatePresence >

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
