
// Force redeploy - build: 2026-04-07 14:30
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useStore } from './hooks/useStore';
import Auth from './pages/Auth';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import QuizGenerator from './pages/QuizGenerator';
import QuizPlayer from './pages/QuizPlayer';
import CreativeWriting from './pages/CreativeWriting';
import Community from './pages/Community';
import Shop from './pages/Shop';
import StudyPlanner from './pages/StudyPlanner';
import Settings from './pages/Settings';
import Flashcards from './pages/Flashcards';
import FlashcardPlayer from './pages/FlashcardPlayer';
import { FlashcardMode } from './pages/FlashcardMode';
import Ranking from './pages/Ranking';
import Analytics from './pages/Analytics';
import AISummary from './pages/AISummary';
import Library from './pages/Library';
import LevelBot from './components/LevelBot';
import AtlasLibrary from './components/AtlasLibrary';
import AdminDashboard from './pages/AdminDashboard';
import BookReader from './components/BookReader';
import { AILab } from './components/AILab';
import { WorldBrainMap } from './components/WorldBrainMap';
import { ActiveVisual } from './pages/ActiveVisual';
import AudioLab from './pages/AudioLab';
import TutorRegistration from './pages/TutorRegistration';
import TutorHub from './pages/TutorHub';
import TeacherDashboard from './pages/TeacherDashboard';


import { Quiz, FlashcardDeck, Flashcard, Book as BookType } from './types';
import { Loader2 } from 'lucide-react';
import { openrouterService } from './services/openrouter';
import { initializeNativeFeatures } from './services/nativeAdapters';
import { App as CapacitorApp } from '@capacitor/app';

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

  // Initialize native features on app start
  useEffect(() => {
    initializeNativeFeatures();
    
    // Custom navigation listener
    const handleNav = (e: any) => {
      if (e.detail) setActiveTab(e.detail);
    };
    window.addEventListener('nav_change', handleNav);
    return () => window.removeEventListener('nav_change', handleNav);
  }, []);

  // Gestion du bouton retour physique (Android)
  useEffect(() => {
    const listener = CapacitorApp.addListener('backButton', () => {
      if (currentBook) {
        setCurrentBook(null);
      } else if (currentQuiz) {
        setCurrentQuiz(null);
      } else if (currentDeck) {
        setCurrentDeck(null);
      } else if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      listener.then(sub => sub.remove());
    };
  }, [currentBook, currentQuiz, currentDeck, activeTab]);

  if (currentBook) {
    return (
      <BookReader
        key={`reader-${currentBook.id}`}
        book={currentBook}
        onClose={() => setCurrentBook(null)}
      />
    );
  }

  // Show loading screen ONLY on initial cold boot
  // If we have no user and the store is loading, it's the very first startup
  if (loading && !user && activeTab === 'dashboard') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <img src="/logo.png" alt="LEVELMAK" className="w-64 h-auto mx-auto animate-float object-contain relative z-10" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">{t('auth.loadingUniverse')}</p>
            </div>
            <div className="w-48 h-1 bg-white/5 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-secondary animate-progress shadow-glow"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no user is logged in, show Auth page
  // The Auth page now handles its own loading state internally (localLoading)
  if (!user) return <Auth />;

  // Check if user is admin (username: levelmak611)
  const isAdmin = user.name?.toLowerCase().includes('administrateur principal') ||
    user.name?.toLowerCase().includes('mouctar') ||
    user.phoneNumber === 'levelmak611' ||
    user.email?.includes('levelmak611');
  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Gérer l'espace enseignant séparément
  if (user.role === 'teacher') {
      return <TeacherDashboard />;
  }

  if (currentQuiz) {
    return (
      <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
        <QuizPlayer quiz={currentQuiz} onClose={() => setCurrentQuiz(null)} />
      </AppShell>
    );
  }

  if (currentDeck) {
    return (
      <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
        <FlashcardPlayer
          deck={currentDeck.deck}
          cards={currentDeck.cards}
          onClose={() => setCurrentDeck(null)}
        />
      </AppShell>
    );
  }

  // Removed early return to prevent flickering/transparency issues

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
            onQuizGenerated={(quiz) => {
              setCurrentQuiz(quiz);
              setActiveTab('quiz');
            }}
            onFlashcardsGenerated={(deck, cards) => {
              setCurrentDeck({ deck, cards });
              setActiveTab('flashcards');
            }}
            onReadBook={(book) => {
              setCurrentQuiz(null);
              setCurrentDeck(null);
              setCurrentBook(book);
            }}
          />
        );
      case 'writing':
        return <CreativeWriting />;
      case 'social':
        return <Community onNavigate={setActiveTab} />;
      case 'shop':
        return <Shop />;
      case 'planner':
        return <StudyPlanner />;
      case 'flashcards':
        return <Flashcards onStartSession={(deck, cards) => setCurrentDeck({ deck, cards })} />;
      case 'summary':
        return (
          <AISummary
            onGenerateQuiz={async (content, title) => {
              try {
                const quiz = await openrouterService.generateQuiz(content, title, 'Intermédiaire');
                setCurrentQuiz(quiz);
                setActiveTab('quiz');
              } catch (error) {
                alert(t('common.quizError'));
              }
            }}
            onGenerateFlashcards={async (content, title) => {
              try {
                const cards = await openrouterService.generateFlashcards(content, title);
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
              } catch (error) {
                alert(t('common.flashcardError'));
              }
            }}
          />
        );
      case 'ailab':
        return <AILab />;
      case 'ranking':
        return <Ranking />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings onNavigate={setActiveTab} />;
      case 'atlas':
        return <AtlasLibrary onNavigate={setActiveTab} />;
      case 'map':
        return (
          <WorldBrainMap 
            onCloseMap={() => setActiveTab('atlas')} 
            onNavigate={setActiveTab} 
          />
        );
      case 'flashcard_mode':
        return <FlashcardMode onClose={() => setActiveTab('dashboard')} />;
      case 'active_visual':
        return <ActiveVisual />;
      case 'tutor_registration':
        return <TutorRegistration onComplete={() => setActiveTab('settings')} />;
      case 'tutor_hub':
        return <TutorHub />;
      case 'audio_lab':
        return <AudioLab 
          onQuizGenerated={(quiz) => {
            setCurrentQuiz(quiz);
            setActiveTab('quiz');
          }}
          onFlashcardsGenerated={(deck, cards) => {
            setCurrentDeck({ deck, cards });
            setActiveTab('flashcards');
          }}
        />;

      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{
            duration: 0.25,
            ease: [0.23, 1, 0.32, 1] // Custom ease for premium feel
          }}
          className="h-full w-full"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
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
      </AnimatePresence>
    </AppShell>

  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;