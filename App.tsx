
// Force redeploy - build: 2026-04-07 14:35
import React, { useState, useEffect, Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useStore } from './hooks/useStore';


// Lazy load heavy pages
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const QuizGenerator = lazy(() => import('./pages/QuizGenerator'));
const QuizPlayer = lazy(() => import('./pages/QuizPlayer'));
const CreativeWriting = lazy(() => import('./pages/CreativeWriting'));
const Community = lazy(() => import('./pages/Community'));
const Shop = lazy(() => import('./pages/Shop'));
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'));
const Settings = lazy(() => import('./pages/Settings'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const FlashcardPlayer = lazy(() => import('./pages/FlashcardPlayer'));
const FlashcardMode = lazy(() => import('./pages/FlashcardMode').then(m => ({ default: m.FlashcardMode })));
const Ranking = lazy(() => import('./pages/Ranking'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AISummary = lazy(() => import('./pages/AISummary'));
const Library = lazy(() => import('./pages/Library'));
const AtlasLibrary = lazy(() => import('./components/AtlasLibrary'));
import LevelBot from './components/LevelBot';
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const BookReader = lazy(() => import('./components/BookReader'));
const AILab = lazy(() => import('./components/AILab').then(m => ({ default: m.AILab })));
const WorldBrainMap = lazy(() => import('./components/WorldBrainMap').then(m => ({ default: m.WorldBrainMap })));
const ActiveVisual = lazy(() => import('./pages/ActiveVisual').then(m => ({ default: m.ActiveVisual })));
const AudioLab = lazy(() => import('./pages/AudioLab'));
const TutorRegistration = lazy(() => import('./pages/TutorRegistration'));
const TutorHub = lazy(() => import('./pages/TutorHub'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));

import AppShell from './components/AppShell';
import { Quiz, FlashcardDeck, Flashcard, Book as BookType } from './types';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { aiService } from './services/aiService';
import { initializeNativeFeatures } from './services/nativeAdapters';
import { App as CapacitorApp } from '@capacitor/app';

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
  const { user, loading, settings, t } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentDeck, setCurrentDeck] = useState<{ deck: FlashcardDeck, cards: Flashcard[] } | null>(null);
  const [currentBook, setCurrentBook] = useState<BookType | null>(null);

  // Apply theme and font size to body
  useEffect(() => {
    // Theme
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light');
    }

    // Font Size
    const fontSizeClasses = ['font-size-xs', 'font-size-sm', 'font-size-base', 'font-size-lg', 'font-size-xl'];
    document.documentElement.classList.remove(...fontSizeClasses);
    document.documentElement.classList.add(`font-size-${settings.fontSize}`);
  }, [settings.theme, settings.fontSize]);

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
      
      const handleNav = (e: any) => {
        if (e.detail) setActiveTab(e.detail);
      };
      window.addEventListener('nav_change', handleNav);
      return () => window.removeEventListener('nav_change', handleNav);
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
        else if (activeTab !== 'dashboard') setActiveTab('dashboard');
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

  // Define Admin Check explicitly - Hardened
  const isAdmin = Boolean(
    user && (
      (user.phoneNumber && (user.phoneNumber === 'levelmak611' || user.phoneNumber === '611')) ||
      (user.email && (user.email === 'admin@levelmak.com' || user.email === '611@levelmak.app')) ||
      (user.name && user.name.toLowerCase().includes('administrateur principal'))
    )
  );

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
        return <Dashboard onNavigate={setActiveTab} />;
      case 'quiz':
        return <QuizGenerator onGenerated={(q) => setCurrentQuiz(q)} />;
      case 'library':
        return (
          <Library
            onNavigate={setActiveTab}
            onQuizGenerated={(quiz) => { setCurrentQuiz(quiz); setActiveTab('quiz'); }}
            onFlashcardsGenerated={(deck, cards) => { setCurrentDeck({ deck, cards }); setActiveTab('flashcards'); }}
            onReadBook={(book) => { setCurrentQuiz(null); setCurrentDeck(null); setCurrentBook(book); }}
          />
        );
      case 'writing': return <CreativeWriting />;
      case 'social': return <Community onNavigate={setActiveTab} />;
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
                setActiveTab('quiz');
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
                setActiveTab('flashcards');
              } catch (error) { alert(t('common.flashcardError')); }
            }}
          />
        );
      case 'ailab': return <AILab />;
      case 'ranking': return <Ranking />;
      case 'analytics': return <Analytics />;
      case 'settings': return <Settings onNavigate={setActiveTab} />;
      case 'atlas': return <AtlasLibrary onNavigate={setActiveTab} />;
      case 'map': return <WorldBrainMap onCloseMap={() => setActiveTab('atlas')} onNavigate={setActiveTab} />;
      case 'flashcard_mode': return <FlashcardMode onClose={() => setActiveTab('dashboard')} />;
      case 'active_visual': return <ActiveVisual />;
      case 'tutor_registration': return <TutorRegistration onComplete={() => setActiveTab('settings')} />;
      case 'tutor_hub': return <TutorHub />;
      case 'audio_lab': return (
        <AudioLab 
          onQuizGenerated={(quiz) => { setCurrentQuiz(quiz); setActiveTab('quiz'); }}
          onFlashcardsGenerated={(deck, cards) => { setCurrentDeck({ deck, cards }); setActiveTab('flashcards'); }}
        />
      );
      default: return <Dashboard onNavigate={setActiveTab} />;
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
                  ? 'opacity-55 dark:opacity-35 blur-[8px] scale-105' 
                  : 'opacity-65 dark:opacity-45 blur-[12px] scale-105'
              }`}
            />
            <div className="absolute inset-0 bg-white/30 dark:bg-[#050b18]/55" />
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
      ) : (
        <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="h-full w-full"
            >
              <Suspense fallback={<PageLoader fullScreen={false} />}>
                {renderContent()}
              </Suspense>
            </motion.div>
          </AnimatePresence>

          <Suspense fallback={null}>
            {activeTab === 'dashboard' && (
              <motion.div
                key="levelbot"
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
              >
                <LevelBot />
              </motion.div>
            )}
          </Suspense>
        </AppShell>
      )}
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