import { safeLocalStorageSet } from '../services/storage';
import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState, useCallback } from 'react';

import { useAuthStore } from './store/useAuthStore';
import { useContentStore } from './store/useContentStore';
import { useGamificationStore } from './store/useGamificationStore';
import { useUIStore } from './store/useUIStore';
import { useCoachStore } from './store/useCoachStore';
import { useDailyStore } from './store/useDailyStore';
import { changeUserPassword as apiChangePassword } from '../services/authService';
import { supabase } from '../services/supabase';

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
  resetContinuousStudyTime: () => void;
  deleteCurrentUserAccount: (password: string) => Promise<void>;
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
  const content = useContentStore(ui.settings.language, auth.user, auth.setUser);
  const coach = useCoachStore(auth.user, auth.setUser);
  
  // Gamification needs access to user and addActivity
  const gamification = useGamificationStore(auth.user, auth.setUser, auth.addActivity);
  const daily = useDailyStore(ui.settings.language);

  // Missing legacy states
  const notifications = useMemo(() => {
    return auth.user?.stats?.notifications || [];
  }, [auth.user?.stats?.notifications]);
  const [continuousStudyTime, setContinuousStudyTime] = useState(0);
  const [offlinePacks, setOfflinePacks] = useState<string[]>([]);

  const resetContinuousStudyTime = useCallback(() => {
    setContinuousStudyTime(0);
  }, []);

  const deleteCurrentUserAccount = useCallback(async (password: string) => {
    const { deleteCurrentUserAccount: apiDeleteAccount } = await import('../services/authService');
    await apiDeleteAccount(password);
    auth.setUser(null);
    localStorage.removeItem('levelmak_user');
    localStorage.removeItem('levelmak_last_sync');
  }, [auth]);

  // Initialize study history/analytics to clean starting values if empty
  useEffect(() => {
    if (auth.user && (!auth.user.analytics || !auth.user.analytics.weeklyGoals)) {
      const seededAnalytics = {
        studyTimeBySubject: {},
        studyTimeByDay: [],
        quizPerformance: [],
        weeklyGoals: { target: 120, achieved: 0 },
        examPredictions: [],
        customGoals: auth.user.analytics?.customGoals || [
          { id: "g1", text: "Faire 3 quiz cette semaine", completed: false },
          { id: "g2", text: "Étudier 2 heures au total", completed: false },
          { id: "g3", text: "Lire un livre de la bibliothèque", completed: false }
        ]
      };
      
      auth.setUser(prev => {
        if (!prev) return null;
        const updated = {
          ...prev,
          analytics: seededAnalytics
        };
        safeLocalStorageSet('levelmak_user', JSON.stringify(updated));
        return updated;
      });
    }
  }, [auth.user, auth.setUser]);

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
    
    auth.setUser(prev => {
      if (!prev) return prev;
      const currentStats = prev.stats || {};
      const currentNotifications = currentStats.notifications || [];
      const updatedStats = {
        ...currentStats,
        // ✅ FIX 3: Cap notifications at 50 to prevent localStorage overflow
        notifications: [newNotif, ...currentNotifications].slice(0, 50)
      };
      const updatedUser = {
        ...prev,
        stats: updatedStats
      };
      safeLocalStorageSet('levelmak_user', JSON.stringify(updatedUser));
      if (prev.id && !prev.id.includes('anon')) {
        supabase.from('profiles').update({ stats: updatedStats }).eq('id', prev.id).then(({ error }) => {
          if (error) console.error('[Notification Add Supabase Sync Error]:', error);
        });
      }
      return updatedUser;
    });
  }, [auth]);

  const markNotificationAsRead = useCallback((id: string) => {
    auth.setUser(prev => {
      if (!prev) return prev;
      const currentStats = prev.stats || {};
      const currentNotifications = currentStats.notifications || [];
      const updatedStats = {
        ...currentStats,
        notifications: currentNotifications.map((n: any) => n.id === id ? { ...n, read: true } : n)
      };
      const updatedUser = {
        ...prev,
        stats: updatedStats
      };
      safeLocalStorageSet('levelmak_user', JSON.stringify(updatedUser));
      if (prev.id && !prev.id.includes('anon')) {
        supabase.from('profiles').update({ stats: updatedStats }).eq('id', prev.id).then(({ error }) => {
          if (error) console.error('[Notification Mark Read Supabase Sync Error]:', error);
        });
      }
      return updatedUser;
    });
  }, [auth]);

  const toggleNotificationRead = useCallback((id: string) => {
    auth.setUser(prev => {
      if (!prev) return prev;
      const currentStats = prev.stats || {};
      const currentNotifications = currentStats.notifications || [];
      const updatedStats = {
        ...currentStats,
        notifications: currentNotifications.map((n: any) => n.id === id ? { ...n, read: !n.read } : n)
      };
      const updatedUser = {
        ...prev,
        stats: updatedStats
      };
      safeLocalStorageSet('levelmak_user', JSON.stringify(updatedUser));
      if (prev.id && !prev.id.includes('anon')) {
        supabase.from('profiles').update({ stats: updatedStats }).eq('id', prev.id).then(({ error }) => {
          if (error) console.error('[Notification Toggle Read Supabase Sync Error]:', error);
        });
      }
      return updatedUser;
    });
  }, [auth]);

  const markAllNotificationsAsRead = useCallback(() => {
    auth.setUser(prev => {
      if (!prev) return prev;
      const currentStats = prev.stats || {};
      const currentNotifications = currentStats.notifications || [];
      const updatedStats = {
        ...currentStats,
        notifications: currentNotifications.map((n: any) => ({ ...n, read: true }))
      };
      const updatedUser = {
        ...prev,
        stats: updatedStats
      };
      safeLocalStorageSet('levelmak_user', JSON.stringify(updatedUser));
      if (prev.id && !prev.id.includes('anon')) {
        supabase.from('profiles').update({ stats: updatedStats }).eq('id', prev.id).then(({ error }) => {
          if (error) console.error('[Notification Mark All Read Supabase Sync Error]:', error);
        });
      }
      return updatedUser;
    });
  }, [auth]);

  const deleteNotification = useCallback((id: string) => {
    auth.setUser(prev => {
      if (!prev) return prev;
      const currentStats = prev.stats || {};
      const currentNotifications = currentStats.notifications || [];
      const updatedStats = {
        ...currentStats,
        notifications: currentNotifications.filter((n: any) => n.id !== id)
      };
      const updatedUser = {
        ...prev,
        stats: updatedStats
      };
      safeLocalStorageSet('levelmak_user', JSON.stringify(updatedUser));
      if (prev.id && !prev.id.includes('anon')) {
        supabase.from('profiles').update({ stats: updatedStats }).eq('id', prev.id).then(({ error }) => {
          if (error) console.error('[Notification Delete Supabase Sync Error]:', error);
        });
      }
      return updatedUser;
    });
  }, [auth]);

  const clearNotifications = useCallback(() => {
    auth.setUser(prev => {
      if (!prev) return prev;
      const currentStats = prev.stats || {};
      const updatedStats = {
        ...currentStats,
        notifications: []
      };
      const updatedUser = {
        ...prev,
        stats: updatedStats
      };
      safeLocalStorageSet('levelmak_user', JSON.stringify(updatedUser));
      if (prev.id && !prev.id.includes('anon')) {
        supabase.from('profiles').update({ stats: updatedStats }).eq('id', prev.id).then(({ error }) => {
          if (error) console.error('[Notification Clear Supabase Sync Error]:', error);
        });
      }
      return updatedUser;
    });
  }, [auth]);

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

  const trackTime = useCallback((minutes: number, subject?: string) => {
    setContinuousStudyTime(prev => prev + minutes);
    auth.setUser(prev => {
      if (!prev) return prev;
      
      const todayStr = new Date().toISOString().split('T')[0];
      const currentAnalytics = prev.analytics || {
        studyTimeBySubject: {},
        studyTimeByDay: [],
        quizPerformance: [],
        weeklyGoals: { target: 120, achieved: 0 },
        examPredictions: []
      };

      const activeSubject = subject || "Général";
      const updatedSubjectTime = {
        ...currentAnalytics.studyTimeBySubject,
        [activeSubject]: (currentAnalytics.studyTimeBySubject[activeSubject] || 0) + Math.round(minutes)
      };

      const dayIndex = currentAnalytics.studyTimeByDay.findIndex(d => d.date === todayStr);
      let updatedTimeByDay = [...currentAnalytics.studyTimeByDay];
      if (dayIndex !== -1) {
        updatedTimeByDay[dayIndex] = {
          ...updatedTimeByDay[dayIndex],
          minutes: updatedTimeByDay[dayIndex].minutes + Math.round(minutes)
        };
      } else {
        updatedTimeByDay.push({ date: todayStr, minutes: Math.round(minutes) });
      }

      const updatedWeeklyGoals = {
        ...currentAnalytics.weeklyGoals,
        achieved: (currentAnalytics.weeklyGoals.achieved || 0) + Math.round(minutes)
      };

      const updatedAnalytics = {
        ...currentAnalytics,
        studyTimeBySubject: updatedSubjectTime,
        studyTimeByDay: updatedTimeByDay,
        weeklyGoals: updatedWeeklyGoals
      };

      return {
        ...prev,
        stats: {
          ...prev.stats,
          hoursLearned: (prev.stats?.hoursLearned || 0) + (minutes / 60)
        },
        analytics: updatedAnalytics
      };
    });
  }, [auth]);

  // 2. Specialized Actions (that bridge multiple slices)
  // ✅ Wrapped in useCallback so its reference is stable between renders.
  // Without this, the useMemo that assembles the context value runs every render
  // because changePassword would be a brand-new function object each time.
  const changePassword = useCallback(async (oldPw: string, newPw: string) => {
    auth.setLoading(true);
    try {
      await apiChangePassword(oldPw, newPw);
      auth.addActivity('profile', 'Sécurité ✨', 'Mot de passe mis à jour.');
    } finally {
      auth.setLoading(false);
    }
  }, [auth]);


  const registerTeacher = useCallback(async (data: any) => {
    auth.setLoading(true);
    try {
      safeLocalStorageSet('levelmak_signing_up_teacher', 'true');
      const { signUpWithEmail } = await import('../services/authService');
      const { applyAsTeacher } = await import('../services/tutorService');

      const newUser = await signUpWithEmail(data.email, data.password, `${data.firstName} ${data.lastName}`, undefined, undefined, data.phone);
      if (newUser) {
        await applyAsTeacher(newUser.id, {
          userId: newUser.id,
          name: `${data.firstName} ${data.lastName}`,
          firstName: data.firstName,
          lastName: data.lastName,
          bio: data.bio || '',
          whatsappNumber: data.phone,
          city: data.city || '',
          neighborhood: data.neighborhood || '',
          subjects: data.subjects || [],
          schools: data.schools || [],
          type: data.type || 'professional'
        }, data.proofFiles, data.avatarFile);

        auth.setUser({ ...newUser, role: 'teacher' } as any);
        safeLocalStorageSet('levelmak_user', JSON.stringify({ ...newUser, role: 'teacher' }));
      }
      localStorage.removeItem('levelmak_signing_up_teacher');
    } catch (e: any) {
      localStorage.removeItem('levelmak_signing_up_teacher');
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
    toggleNotificationRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearNotifications,
    continuousStudyTime,
    resetContinuousStudyTime,
    deleteCurrentUserAccount,
    trackTime,
    offlinePacks,
    downloadCourse,
    incrementFlashcardsStudied,
    updateSRSMetadata
  }), [auth, content, ui, coach, gamification, daily, changePassword, registerTeacher, resolveBattle, rollDice, notifications, continuousStudyTime, resetContinuousStudyTime, deleteCurrentUserAccount, addNotification, markNotificationAsRead, toggleNotificationRead, markAllNotificationsAsRead, deleteNotification, clearNotifications, trackTime, offlinePacks, downloadCourse, incrementFlashcardsStudied, updateSRSMetadata]);

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
