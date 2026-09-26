
// Force redeploy - build: 2026-04-07 14:35
import React, { useState, useEffect, Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AppProvider, useStore } from './hooks/useStore';


// Direct imports for core navigation tabs (instant zero-flicker switching)
import Dashboard from './pages/Dashboard';
import QuizGenerator from './pages/QuizGenerator';
import CreativeWriting from './pages/CreativeWriting';
import Flashcards from './pages/Flashcards';
import AISummary from './pages/AISummary';
import Settings from './pages/Settings';

// Lazy load secondary/heavy pages
const Auth = lazy(() => import('./pages/Auth'));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const Library = lazy(() => import('./pages/Library'));
const QuizPlayer = lazy(() => import('./pages/QuizPlayer'));
const Community = lazy(() => import('./pages/Community'));
const Shop = lazy(() => import('./pages/Shop'));
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'));
const FlashcardPlayer = lazy(() => import('./pages/FlashcardPlayer'));
const FlashcardMode = lazy(() => import('./pages/FlashcardMode').then(m => ({ default: m.FlashcardMode })));
const Ranking = lazy(() => import('./pages/Ranking'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AtlasLibrary = lazy(() => import('./components/AtlasLibrary'));
import LevelBot from './components/LevelBot';
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const BookReader = lazy(() => import('./components/BookReader'));
const AILab = lazy(() => import('./components/AILab').then(m => ({ default: m.AILab })));
const WorldBrainMap = lazy(() => import('./components/WorldBrainMap').then(m => ({ default: m.WorldBrainMap })));
const TutorRegistration = lazy(() => import('./pages/TutorRegistration'));
const TutorHub = lazy(() => import('./pages/TutorHub'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));

import AppShell from './components/AppShell';
import { PremiumAlertModal } from './components/PremiumAlertModal';
import BlockedAccountModal from './components/BlockedAccountModal';
import { Quiz, FlashcardDeck, Flashcard, Book as BookType } from './types';
import { Loader2, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { aiService } from './services/aiService';
import { initializeNativeFeatures, isNativePlatform, hideSplashScreen } from './services/nativeAdapters';
import { App as CapacitorApp } from '@capacitor/app';
import { initCrashReporter, reportReactCrash } from './services/crashReportService';

// ERROR BOUNDARY COMPONENT
class ErrorBoundary extends React.Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("APP CRASH DETECTED:", error, errorInfo);
    // 🚨 Envoie automatiquement un rapport de crash par email
    reportReactCrash(error, errorInfo.componentStack || '');
  }

  render() {
    if ((this as any).state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-[#050b18] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 text-red-500">
            <AlertTriangle size={40} />
          </div>
          <h1 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Oups ! Une erreur est survenue</h1>
          <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">
            L'application a rencontré un problème technique. Pas d'inquiétude, vos données sont en sécurité.
          </p>
          <div className="bg-black/20 p-4 rounded-xl mb-8 w-full max-w-sm overflow-auto max-h-32 text-left">
            <code className="text-[10px] text-red-400 font-mono">
              {(this as any).state.error?.message || "Erreur inconnue"}
            </code>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-glow"
          >
            <RefreshCw size={18} />
            Redémarrer l'App
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const PageLoader = ({ message = "Synchronisation...", fullScreen = true }: { message?: string, fullScreen?: boolean }) => (
  <div className={`${fullScreen ? 'fixed inset-0 z-[9999]' : 'w-full h-full min-h-[400px]'} flex flex-col items-center justify-center space-y-6 bg-[#050b18] select-none`}>
    <div className="relative">
      <motion.img 
        src="/logo.png" 
        alt="Levelmak" 
        className="h-24 w-auto object-contain mb-8 drop-shadow-glow"
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          y: [0, -15, 0]
        }}
        transition={{ 
          opacity: { duration: 0.8 },
          scale: { duration: 0.8 },
          y: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
        }}
        onError={(e) => {
          // Fallback if image fails to load in APK
          console.warn("Logo failed to load, using fallback text");
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) {
            const fallback = document.createElement('div');
            fallback.className = "text-4xl font-black text-blue-500 animate-pulse mb-8";
            fallback.innerText = "LEVELMAK";
            parent.appendChild(fallback);
          }
        }}
      />
    </div>
    <div className="text-center space-y-2">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/90 drop-shadow-glow">{message}</p>
      <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden mx-auto">
        <motion.div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          animate={{ x: [-128, 128] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        />
      </div>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { user, loading, settings, t, updateProfile } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const shouldReduceMotion = useReducedMotion();
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        setActiveTab('pricing');
      }
    }
  }, []);

  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentDeck, setCurrentDeck] = useState<{ deck: FlashcardDeck, cards: Flashcard[] } | null>(null);
  const [currentBook, setCurrentBook] = useState<BookType | null>(null);
  const [sessionChosenPlan, setSessionChosenPlan] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') return true;
    return sessionStorage.getItem('levelmak_session_chosen_plan') === 'true';
  });
  const [globalReceiptData, setGlobalReceiptData] = useState<{
    transactionId: string;
    planName: string;
    amount: number;
    purchasedAt: string;
    startsAt: string;
    expiresAt: string;
    userName?: string;
    userPhone?: string;
  } | null>(null);

  // Custom premium warning modal state
  const [premiumAlert, setPremiumAlert] = useState<{
    title: string;
    message: string;
    actionText?: string;
    onAction?: () => void;
  } | null>(null);

  // Global custom event listener to show luxury premium alerts & admin notifications from anywhere in the app
  useEffect(() => {
    const handleAlert = (e: any) => {
      const { title, message, actionText, onAction } = e.detail;
      setPremiumAlert({
        title,
        message,
        actionText,
        onAction
      });
    };
    const handleAdminNotif = (e: any) => {
      const { title, message } = e.detail;
      setPremiumAlert({
        title: title || 'Notification Administrateur',
        message: message || '',
        actionText: 'Compris'
      });
    };
    const handleNavigateTab = (e: any) => {
      if (e.detail?.tab) {
        handleSetActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('show_premium_alert', handleAlert);
    window.addEventListener('show_admin_notif_modal', handleAdminNotif);
    window.addEventListener('navigate_tab', handleNavigateTab);
    return () => {
      window.removeEventListener('show_premium_alert', handleAlert);
      window.removeEventListener('show_admin_notif_modal', handleAdminNotif);
      window.removeEventListener('navigate_tab', handleNavigateTab);
    };
  }, []);

  // Strict premium check: user must have is_premium=true AND a valid non-expired premium_until date
  const isPremiumActive = !!(user && user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > Date.now());

  const handleSetActiveTab = (tab: string) => {
    const isMobile = isNativePlatform();
    
    if (isMobile && tab === 'pricing') {
      setPremiumAlert({
        title: "Espace Premium 🌟",
        message: "Cette partie n'est pas accessible depuis l'application mobile. Il vous suffira d'aller sur notre page web pour plus d'explications.",
        actionText: "Copier l'adresse de notre site",
        onAction: () => {
          navigator.clipboard.writeText('https://levelmak.com');
        }
      });
      return;
    }

    const freeTabs = ['dashboard', 'quiz', 'flashcards', 'settings', 'pricing', 'flashcard_mode'];
    if (!isPremiumActive && !freeTabs.includes(tab)) {
      if (isMobile) {
        setPremiumAlert({
          title: "Espace Premium 🌟",
          message: "Cette partie n'est pas accessible depuis l'application mobile. Il vous suffira d'aller sur notre page web pour plus d'explications.",
          actionText: "Copier l'adresse de notre site",
          onAction: () => {
            navigator.clipboard.writeText('https://levelmak.com');
          }
        });
      } else {
        setPremiumAlert({
          title: "Espace Privilège Requis 🌟",
          message: "Cet onglet contient des outils exclusifs pour booster vos notes. Abonnez-vous à LEVELMAK PRO pour y accéder sans aucune limite !",
          actionText: "Découvrir les Offres",
          onAction: () => {
            setActiveTab('pricing');
          }
        });
      }
    } else {
      setActiveTab(tab);
    }
  };

  // Reset chosen plan flag on logout
  useEffect(() => {
    if (!user) {
      setSessionChosenPlan(false);
    }
  }, [user]);

  // Expiration check logic for premium subscriptions (polls every 15 seconds)
  useEffect(() => {
    if (!user || !user.is_premium || !user.premium_until) return;

    const checkExpiry = () => {
      const expiryTime = new Date(user.premium_until!).getTime();
      const currentTime = new Date().getTime();

      if (currentTime >= expiryTime) {
        console.log('Subscription expired. Reverting to free tier.');
        
        // Clear local demo premium variables
        localStorage.removeItem(`levelmak_demo_premium_${user.id}`);
        localStorage.removeItem(`levelmak_demo_premium_until_${user.id}`);
        localStorage.removeItem(`levelmak_demo_premium_plan_id_${user.id}`);

        updateProfile(user.name, user.phoneNumber, {
          is_premium: false,
          premium_until: null
        });

        setPremiumAlert({
          title: "Abonnement Terminé ⏳",
          message: "Votre abonnement Premium est arrivé à expiration. Votre compte a été configuré sur la formule gratuite.\n\nRenouvelez dès maintenant pour ne pas perdre l'accès à vos fonctionnalités exclusives.",
          actionText: "Renouveler mon forfait",
          onAction: () => {
            setActiveTab('pricing');
          }
        });
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 15000);
    return () => clearInterval(interval);
  }, [user?.is_premium, user?.premium_until, updateProfile, user?.name, user?.phoneNumber]);

  // Apply theme, font size, and language to body/document
  useEffect(() => {
    // 1. Theme
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light');
    }

    // 2. Font Size (Hardened against spaces and unexpected string formats)
    const rawSize = (settings.fontSize || 'base').split(' ')[0].replace(/font-size-/g, '');
    const cleanSize = ['xs', 'sm', 'base', 'lg', 'xl'].includes(rawSize) ? rawSize : 'base';
    const fontSizeClasses = ['font-size-xs', 'font-size-sm', 'font-size-base', 'font-size-lg', 'font-size-xl'];
    document.documentElement.classList.remove(...fontSizeClasses);
    document.documentElement.classList.add(`font-size-${cleanSize}`);

    // 3. Language & RTL Direction (Arabic support)
    const currentLang = settings.language || 'fr';
    document.documentElement.setAttribute('lang', currentLang);
    document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  }, [settings.theme, settings.fontSize, settings.language]);

  const [showForceEntry, setShowForceEntry] = useState(false);

  // Initialize native features on app start
  // Global Safety Timeout to prevent permanent black screen if initialization hangs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("Safety timeout: Force clearing loading state or showing emergency button");
        setShowForceEntry(true);
      }
    }, 8000); // 8 seconds max for initial load
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    try {
      initializeNativeFeatures();

      // Listen to app foreground/resume (WhatsApp-like instant resume)
      const appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          console.log('⚡ App returned to foreground (Instant Resume)');
          hideSplashScreen();
          // ✅ FIX Bug 3: Force viewport recalculation to fix split-screen / grey bottom
          // on Android when returning from the notification panel or system UI.
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            // Also scroll to top to restore the correct layout position
            window.scrollTo(0, 0);
          }, 100);
        }
      });
      
      const handleNav = (e: any) => {
        if (e.detail) handleSetActiveTab(e.detail);
      };

      const handleStartQuiz = (e: any) => {
        if (e.detail) {
          setCurrentQuiz(e.detail);
          handleSetActiveTab('quiz');
        }
      };

      window.addEventListener('nav_change', handleNav);
      window.addEventListener('start_quiz', handleStartQuiz);

      return () => {
        window.removeEventListener('nav_change', handleNav);
        window.removeEventListener('start_quiz', handleStartQuiz);
        appStateListener.then(sub => sub.remove()).catch(() => {});
      };
    } catch (e) {
      console.error("Native init error:", e);
    }
  }, []);

  // Back button handling
  useEffect(() => {
    try {
      const listener = CapacitorApp.addListener('backButton', () => {
        if (currentBook) setCurrentBook(null);
        else if (currentQuiz) setCurrentQuiz(null);
        else if (currentDeck) setCurrentDeck(null);
        else if (activeTab !== 'dashboard') handleSetActiveTab('dashboard');
        else CapacitorApp.exitApp();
      });

      return () => {
        listener.then(sub => sub.remove()).catch(() => {});
      };
    } catch (e) {
      console.error("BackButton listener error:", e);
    }
  }, [currentBook, currentQuiz, currentDeck, activeTab]);

  // Show loading screen during initial authentication/session recovery
  if (loading) {
    return (
      <>
        <PageLoader message="Initialisation du savoir..." />
        {showForceEntry && (
          <div className="fixed bottom-10 left-0 w-full z-[10000] flex justify-center px-6">
            <button 
              onClick={() => {
                console.log('User forced entry');
                alert("Le chargement prend du temps. Vérifie ta connexion ou redémarre l'application.");
                window.location.reload();
              }}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-glow-blue"
            >
              Problème de connexion ? Cliquez ici
            </button>
          </div>
        )}
      </>
    );
  }

  // Security Guard: Check if account status is blocked or suspended
  if (user && (user.status === 'blocked' || user.status === 'suspended')) {
    return <BlockedAccountModal status={user.status} />;
  }

  // Define Admin Check explicitly - Hardened
  const isAdmin = Boolean(user && user.role === 'admin');

  if (isAdmin) {
    return (
      <Suspense fallback={<PageLoader message="Initialisation Admin..." fullScreen={true} />}>
        <AdminDashboard />
      </Suspense>
    );
  }

  if (user?.role === 'teacher') {
    return (
      <Suspense fallback={<PageLoader message="Accès Enseignant..." fullScreen={true} />}>
        <TeacherDashboard />
      </Suspense>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleSetActiveTab} />;
      case 'quiz':
        return <QuizGenerator onGenerated={(q) => setCurrentQuiz(q)} />;
      case 'library':
        return (
          <Library
            onNavigate={handleSetActiveTab}
            onQuizGenerated={(quiz) => { setCurrentQuiz(quiz); handleSetActiveTab('quiz'); }}
            onFlashcardsGenerated={(deck, cards) => { setCurrentDeck({ deck, cards }); handleSetActiveTab('flashcards'); }}
            onReadBook={(book) => { setCurrentQuiz(null); setCurrentDeck(null); setCurrentBook(book); }}
          />
        );
      case 'writing': return <CreativeWriting />;
      case 'social': return <Community onNavigate={handleSetActiveTab} />;
      case 'shop': return <Shop />;
      case 'planner': return <StudyPlanner />;
      case 'flashcards': return <Flashcards onStartSession={(deck, cards) => setCurrentDeck({ deck, cards })} />;
      case 'summary':
        return (
          <AISummary
            onGenerateQuiz={async (content, title) => {
              try {
                const quiz = await aiService.generateQuiz(content, title, 'Intermédiaire');
                setCurrentQuiz(quiz);
                handleSetActiveTab('quiz');
              } catch (error) { alert(t('common.quizError')); }
            }}
            onGenerateFlashcards={async (content, title) => {
              try {
                const cards = await aiService.generateFlashcards(content, title);
                setCurrentDeck({
                  deck: {
                    id: `deck_${Date.now()}`,
                    title: `Flashcards: ${title}`,
                    description: `Généré à partir du résumé`,
                    category: 'Synthèse',
                    totalCards: cards.length,
                    lastStudied: new Date().toISOString()
                  },
                  cards
                });
                handleSetActiveTab('flashcards');
              } catch (error) { alert(t('common.flashcardError')); }
            }}
          />
        );
      case 'ailab': return <AILab />;
      case 'ranking': return <Ranking />;
      case 'analytics': return <Analytics />;
      case 'settings': return <Settings onNavigate={handleSetActiveTab} />;
      case 'pricing': return <Pricing onChoosePremium={() => handleSetActiveTab('dashboard')} onChooseFree={() => handleSetActiveTab('dashboard')} />;
      case 'atlas': return <AtlasLibrary onNavigate={handleSetActiveTab} />;
      case 'map': return <WorldBrainMap onCloseMap={() => handleSetActiveTab('atlas')} onNavigate={handleSetActiveTab} />;
      case 'flashcard_mode': return <FlashcardMode onClose={() => handleSetActiveTab('dashboard')} />;
      case 'tutor_registration': return <TutorRegistration onComplete={() => handleSetActiveTab('settings')} />;
      case 'tutor_hub': return <TutorHub />;
      default: return <Dashboard onNavigate={handleSetActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans text-slate-900 dark:text-slate-200 relative z-0 overflow-hidden transition-colors duration-500">
      {/* Global Background Wallpaper/Avatar */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-background transition-all duration-1000">
        {user?.wallpaper || user?.avatar?.image ? (
          <div className="absolute inset-0">
            <img 
              src={user.wallpaper || user.avatar?.image} 
              alt="Ambient Background" 
              className={`w-full h-full object-cover transition-opacity duration-1000 ${
                user.wallpaper 
                  ? 'opacity-70 dark:opacity-50 blur-[4px] scale-105' 
                  : 'opacity-75 dark:opacity-55 blur-[6px] scale-105'
              }`}
            />
            <div className="absolute inset-0 bg-white/20 dark:bg-[#050b18]/40" />
          </div>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[60px] opacity-20 dark:opacity-100"></div>
            <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[50px] opacity-20 dark:opacity-100"></div>
          </>
        )}
      </div>

      {currentBook ? (
        <Suspense fallback={<PageLoader fullScreen={false} />}>
          <BookReader
            key={`reader-${currentBook.id}`}
            book={currentBook}
            onClose={() => setCurrentBook(null)}
          />
        </Suspense>
      ) : currentQuiz ? (
        <Suspense fallback={<PageLoader fullScreen={false} />}>
          <QuizPlayer quiz={currentQuiz} onClose={() => setCurrentQuiz(null)} />
        </Suspense>
      ) : currentDeck ? (
        <Suspense fallback={<PageLoader fullScreen={false} />}>
          <FlashcardPlayer deck={currentDeck.deck} cards={currentDeck.cards} onClose={() => setCurrentDeck(null)} />
        </Suspense>
      ) : !user ? (
        <Suspense fallback={<PageLoader message="Chargement de l'accès..." fullScreen={false} />}>
          <Auth />
        </Suspense>
      ) : user && !isPremiumActive && !sessionChosenPlan && !isNativePlatform() ? (
        <Suspense fallback={<PageLoader message="Chargement des forfaits..." fullScreen={true} />}>
          <Pricing 
            onChooseFree={() => {
              sessionStorage.setItem('levelmak_session_chosen_plan', 'true');
              setSessionChosenPlan(true);
            }} 
            onChoosePremium={() => {
              sessionStorage.setItem('levelmak_session_chosen_plan', 'true');
              setSessionChosenPlan(true);
            }}
            onPaymentSuccess={(data: any) => setGlobalReceiptData({ ...data, userName: user?.name, userPhone: user?.phoneNumber })}
            isFullScreen={true}
          />
        </Suspense>
      ) : (
        <AppShell activeTab={activeTab} setActiveTab={handleSetActiveTab}>
          <div className="h-full w-full">
            <Suspense fallback={<div className="min-h-[300px]" />}>
              {renderContent()}
            </Suspense>
          </div>

          <LevelBot />
        </AppShell>
      )}
      <PremiumAlertModal
        isOpen={premiumAlert !== null}
        title={premiumAlert?.title || ''}
        message={premiumAlert?.message || ''}
        actionText={premiumAlert?.actionText}
        onAction={premiumAlert?.onAction}
        onClose={() => setPremiumAlert(null)}
      />

      {/* ===== GLOBAL RECEIPT MODAL ===== */}
      <AnimatePresence>
        {globalReceiptData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99999] bg-black"
          >
            {/* Inner card with rounded blue border — like the photo */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="absolute inset-3 sm:inset-6 rounded-[2.5rem] border-[3px] border-blue-500 bg-[#09101e] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.4),inset_0_0_40px_rgba(59,130,246,0.05)]"
            >
              <div className="flex-1 flex flex-col items-center justify-between px-5 py-5 sm:py-7">

                {/* Green check */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-900/50 border-2 border-emerald-500/60 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0">
                  <Check className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" strokeWidth={3} />
                </div>

                {/* Title */}
                <div className="text-center shrink-0">
                  <h2 className="text-[20px] sm:text-[24px] font-black text-white uppercase tracking-wide leading-tight">Reçu d'Abonnement</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-0.5">LEVELMAK PRO • ORDONNANCE ÉLITE</p>
                </div>

                {/* Dashed separator */}
                <div className="w-full border-t-2 border-dashed border-slate-700 shrink-0" />

                {/* Congrats box */}
                <div className="w-full p-2.5 sm:p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-center shrink-0">
                  <p className="text-emerald-300 text-[11px] sm:text-[12px] font-bold leading-snug">
                    Félicitations ! Votre abonnement <span className="text-white font-black">LEVELMAK PRO</span> est maintenant actif et prêt à l'emploi.
                  </p>
                </div>

                {/* Billing Info */}
                <div className="w-full shrink-0">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center mb-1.5">Informations de Facturation</p>
                  <div className="w-full bg-[#0d1425] border border-slate-800 rounded-xl overflow-hidden">
                    {[
                      { label: 'Étudiant :', value: globalReceiptData.userName || 'Étudiant', cls: 'text-white' },
                      { label: 'Téléphone :', value: globalReceiptData.userPhone || 'N/A', cls: 'text-white' },
                      { label: 'Forfait :', value: `PRO ${globalReceiptData.planName}`, cls: 'text-blue-400 font-bold' },
                      { label: 'Montant payé :', value: `${globalReceiptData.amount.toLocaleString()} FG`, cls: 'text-white' },
                      { label: "Date d'achat :", value: globalReceiptData.purchasedAt, cls: 'text-white' },
                      { label: 'Référence :', value: globalReceiptData.transactionId, cls: 'text-white font-mono text-[9px] sm:text-[10px]' },
                    ].map((row, i, arr) => (
                      <div key={row.label} className={`flex justify-between items-center px-3 sm:px-4 py-1.5 sm:py-2 ${i < arr.length - 1 ? 'border-b border-slate-800/70' : ''}`}>
                        <span className="text-slate-400 text-[10px] sm:text-[11px]">{row.label}</span>
                        <span className={`${row.cls} text-[10px] sm:text-[11px] text-right ml-3`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Period of Validity */}
                <div className="w-full bg-[#0d1425] border border-slate-800 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 shrink-0">
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Période de Validité</p>
                  <p className="text-[11px] text-white font-bold">Du : <span className="underline underline-offset-2">{globalReceiptData.startsAt}</span></p>
                  <p className="text-[11px] text-white font-bold mb-1.5">Au : <span className="underline underline-offset-2">{globalReceiptData.expiresAt}</span></p>
                  <p className="text-[10px] text-slate-500 leading-snug">À cette échéance, votre accès repassera automatiquement au mode gratuit.</p>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => {
                    setGlobalReceiptData(null);
                    handleSetActiveTab('dashboard');
                  }}
                  className="w-full py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-2xl font-black uppercase tracking-widest text-[12px] sm:text-[13px] transition-all shadow-lg shadow-blue-900/40 shrink-0"
                >
                  Commencer à Réviser
                </button>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;