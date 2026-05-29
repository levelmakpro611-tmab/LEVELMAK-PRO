import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState, useCallback } from 'react';

import { useAuthStore } from './store/useAuthStore';
import { useContentStore } from './store/useContentStore';
import { useGamificationStore } from './store/useGamificationStore';
import { useUIStore } from './store/useUIStore';
import { useCoachStore } from './store/useCoachStore';
import { useDailyStore } from './store/useDailyStore';
import { changeUserPassword as apiChangePassword } from '../services/authService';

// Re-defining interface to match exactly what the app expects
// (Normally this should be in types.ts, but let's keep it here for compatibility if it was)
import { User, Quiz, Story, Mission, Book, Flashcard, FlashcardDeck, Activity, StudyPlan, CoachMessage, CoachSession, AILabSession } from '../types';
import { AppNotification } from '../services/notificationService';

export interface FullAppState {
  user: User | null;
  quizzes: Quiz[];
  stories: Story[];
  missions: Mission[];
  flashcards: Flashcard[];
  decks: FlashcardDeck[];
  books: Book[];
  studyPlan: StudyPlan | null;
  settings: any;
  dailyVocab: { words: any[]; loading: boolean };
  dailyMotivation: { quote: string; author: string; loading: boolean };
  loading: boolean;
  isOnline: boolean;
  t: (key: string, params?: any) => any;
  dir: 'ltr' | 'rtl';
  
  // Actions
  loginWithPhone: (phone: string, pw: string) => Promise<void>;
  registerWithPhone: (params: any) => Promise<void>;
  logout: () => void;
  addXp: (amount: number) => void;
  addLevelCoins: (amount: number) => void;
  waterGarden: (plantId: string, itemType: 'water_can' | 'fertilizer') => void;
  saveQuiz: (quiz: Quiz) => void;
  deleteQuiz: (id: string) => void;
  saveStory: (story: Story) => void;
  deleteStory: (id: string) => void;
  saveBook: (book: Book) => void;
  deleteBook: (id: string) => void;
  saveFlashcardDeck: (deck: FlashcardDeck, cards: Flashcard[]) => void;
  updateProfile: (name: string, phone?: string, updates?: any) => void;
  updateSettings: (settings: any) => void;
  grantBadge: (id: string, title: string, desc: string) => void;
  changePassword: (old: string, newPw: string) => Promise<void>;
  setMapFocusFeatureId: (id: string | null) => void;
  setAtlasFocusFeatureId: (id: string | null) => void;
  // ... many others
  [key: string]: any; 
}

const AppContext = createContext<FullAppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Initialize Slices
  const auth = useAuthStore();
  const ui = useUIStore();
  const content = useContentStore(ui.settings.language);
  const coach = useCoachStore();
  
  // Gamification needs access to user and addActivity
  const gamification = useGamificationStore(auth.user, auth.setUser, auth.addActivity);
  const daily = useDailyStore(ui.settings.language);

  // Missing legacy states
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [continuousStudyTime, setContinuousStudyTime] = useState(0);
  const [offlinePacks, setOfflinePacks] = useState<string[]>([]);

  const addNotification = useCallback((notificationOrType: any, title?: string, message?: string) => {
    let newNotif: AppNotification;
    if (typeof notificationOrType === 'string' && title && message) {
      newNotif = {
        type: notificationOrType as any,
        title,
        message,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        read: false
      };
    } else {
      newNotif = {
        ...notificationOrType,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        read: false
      };
    }
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const downloadCourse = useCallback(async (courseId: string) => {
    // Simulating download logic
    setOfflinePacks(prev => {
        if (!prev.includes(courseId)) {
            addNotification({ type: 'success', title: 'Téléchargement terminé', message: 'Contenu disponible hors ligne.' });
            return [...prev, courseId];
        }
        return prev;
    });
  }, [addNotification]);

  const trackTime = useCallback((minutes: number) => {
    setContinuousStudyTime(prev => prev + minutes);
    auth.setUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          hoursLearned: (prev.stats?.hoursLearned || 0) + (minutes / 60)
        }
      };
    });
  }, [auth]);

  // 2. Specialized Actions (that bridge multiple slices)
  const changePassword = async (oldPw: string, newPw: string) => {
    auth.setLoading(true);
    try {
      await apiChangePassword(oldPw, newPw);
      auth.addActivity('profile', 'Sécurité ✨', 'Mot de passe mis à jour.');
    } finally {
      auth.setLoading(false);
    }
  };

  const registerTeacher = useCallback(async (data: any) => {
    auth.setLoading(true);
    try {
      const { signUpWithEmail } = await import('../services/authService');
      const { applyAsTeacher } = await import('../services/tutorService');

      const newUser = await signUpWithEmail(data.email, data.password, `${data.firstName} ${data.lastName}`, undefined, undefined, data.phone);
      if (newUser) {
        await applyAsTeacher(newUser.id, {
          userId: newUser.id,
          name: `${data.firstName} ${data.lastName}`,
          firstName: data.firstName,
          lastName: data.lastName,
          bio: '',
          whatsappNumber: data.phone,
          city: '',
          neighborhood: '',
          subjects: [],
          schools: [],
          type: 'professional'
        }, data.proofFiles, data.avatarFile);

        auth.setUser({ ...newUser, role: 'teacher' } as any);
        localStorage.setItem('levelmak_user', JSON.stringify({ ...newUser, role: 'teacher' }));
      }
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Erreur d\'inscription', message: e.message || 'Impossible de créer le compte enseignant.' });
      throw e;
    } finally {
      setTimeout(() => auth.setLoading(false), 1000);
    }
  }, [auth, addNotification]);

  const resolveBattle = useCallback((winnerId: string, isDraw: boolean) => {
    if (!auth.user) return;

    const isWinner = auth.user.id === winnerId;
    const xpAmount = isWinner ? 50 : isDraw ? 20 : 10;
    const coinAmount = isWinner ? 10 : 0;

    gamification.addXp(xpAmount);
    if (coinAmount > 0) gamification.addLevelCoins(coinAmount);

    auth.addActivity('battle', isWinner ? 'Victoire ! 🏆' : isDraw ? 'Match Nul' : 'Défi relevé', 
      isWinner ? 'Tu as remporté le duel.' : 'Belle tentative dans l\'arène.');
  }, [auth.user, gamification, auth.addActivity]);

  const rollDice = useCallback(() => {
    const result = Math.floor(Math.random() * 6) + 1;
    const coins = result * 2;
    gamification.addLevelCoins(coins);
    addNotification({ type: 'success', title: `Dé lancé : ${result} !`, message: `Tu as gagné ${coins} LevelCoins.` });
    auth.addActivity('fun', 'Lancer de dé 🎲', `Résultat: ${result}. Gain: ${coins} coins.`);
  }, [gamification, addNotification, auth.addActivity]);

  const incrementFlashcardsStudied = useCallback((amount: number) => {
    auth.setUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          flashcardsStudied: (prev.stats?.flashcardsStudied || 0) + amount
        }
      };
    });
  }, [auth]);

  const updateSRSMetadata = useCallback((id: string, type: 'flashcard' | 'quiz', rating: number) => {
    // Stub function to prevent crash. In a full backend, this updates spaced-repetition parameters.
    console.log(`SRS updated for ${type} ${id} with rating ${rating}`);
  }, []);

  // 3. Assemble the Global State
  const value = useMemo(() => ({
    ...auth,
    ...content,
    ...ui,
    ...coach,
    ...gamification,
    ...daily,
    changePassword,
    registerTeacher,
    resolveBattle,
    rollDice,
    
    // Add previously missing properties that caused crashes
    notifications,
    addNotification,
    markNotificationAsRead,
    clearNotifications,
    continuousStudyTime,
    trackTime,
    offlinePacks,
    downloadCourse,
    incrementFlashcardsStudied,
    updateSRSMetadata
  }), [auth, content, ui, coach, gamification, daily, changePassword, registerTeacher, resolveBattle, rollDice, notifications, continuousStudyTime, addNotification, markNotificationAsRead, clearNotifications, trackTime, offlinePacks, downloadCourse, incrementFlashcardsStudied, updateSRSMetadata]);

  return (
    <AppContext.Provider value={value as any}>
      {children}
    </AppContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useStore must be used within an AppProvider');
  }
  return context;
};
