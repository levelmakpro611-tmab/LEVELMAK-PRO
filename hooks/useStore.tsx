import { safeLocalStorageSet } from '../services/storage';
import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { BattleRequest } from '../types';

import { useAuthStore, normalizeNotification } from './store/useAuthStore';
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
import { DEFAULT_CUSTOM_GOALS } from '../constants';

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
  const daily = useDailyStore(ui.settings.language, auth.user?.gradeClass || auth.user?.education);

  // Missing legacy states
  const notifications = useMemo(() => {
    let list: any[] = [];
    if (auth.user?.stats?.notifications && Array.isArray(auth.user.stats.notifications) && auth.user.stats.notifications.length > 0) {
      list = auth.user.stats.notifications;
    } else if (auth.user?.id) {
      try {
        const stored = localStorage.getItem(`levelmak_notifications_${auth.user.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
        }
      } catch (_) {}
    }
    return list.map(normalizeNotification);
  }, [auth.user?.id, auth.user?.stats?.notifications]);
  const [continuousStudyTime, setContinuousStudyTime] = useState(0);
  const [offlinePacks, setOfflinePacks] = useState<string[]>([]);
  const [pendingBattleInvite, setPendingBattleInvite] = useState<BattleRequest | null>(null);
  const [acceptedBattleRequest, setAcceptedBattleRequest] = useState<BattleRequest | null>(null);
  const globalBattleChannelRef = useRef<any>(null);
  const seenBattleInvitesRef = useRef<Set<string>>(new Set());

  // ─── GLOBAL BATTLE INVITE LISTENER ──────────────────────────────────────
  // Listens on user's dedicated channel, device session channel and map channel
  // so the invited user receives the challenge anywhere in the app.
  useEffect(() => {
    const currentDeviceId = typeof window !== 'undefined' ? sessionStorage.getItem('levelmak_device_session_id') : null;
    const userId = auth.user?.id || currentDeviceId;
    if (!userId) return;

    // Remove any stale channels before creating new ones
    if (globalBattleChannelRef.current) {
      if (Array.isArray(globalBattleChannelRef.current)) {
        globalBattleChannelRef.current.forEach((ch: any) => supabase.removeChannel(ch));
      } else {
        supabase.removeChannel(globalBattleChannelRef.current);
      }
      globalBattleChannelRef.current = null;
    }

    const handleBattleInvite = (p: any) => {
      const request: BattleRequest = p.payload?.request;
      if (!request || !request.id) return;

      const deviceId = typeof window !== 'undefined' ? sessionStorage.getItem('levelmak_device_session_id') : null;
      const myName = (auth.user?.name || '').trim().toLowerCase();
      const guestName = (request.guest?.name || '').trim().toLowerCase();
      const isNameMatch = myName.length > 1 && guestName.length > 1 && (myName === guestName || myName.includes(guestName) || guestName.includes(myName));

      const isForMe = request.guest?.id === userId || 
                      (request.guest as any)?.original_id === userId ||
                      (request.guest as any)?.user_id === userId ||
                      (request.guest as any)?.sessionId === deviceId ||
                      (deviceId && request.guest?.id === deviceId) ||
                      isNameMatch;

      if (!isForMe) return;

      // Deduplicate: ignore if this invite ID was already received in the session
      if (seenBattleInvitesRef.current.has(request.id)) {
        return;
      }
      seenBattleInvitesRef.current.add(request.id);

      console.log('⚔️ [GlobalBattle] Received unique battle_invite for this user:', request);
      setPendingBattleInvite(request);

      const typeName = request.type === 'quiz' ? 'Quiz' : request.type === 'doodle' ? 'Doodle' : 'Morpion';
      const hostName = request.host?.name || 'Un ami';
      const hostAvatar = request.host?.avatar || null;

      // 1. Add directly to user's notifications center (shown in notification drawer)
      auth.setUser((prev: any) => {
        if (!prev) return prev;
        const currentStats = prev.stats || {};
        const currentNotifs = currentStats.notifications || [];
        
        // Guard against duplicate notification in list
        const alreadyInList = currentNotifs.some((n: any) => 
          n.id === request.id || 
          n.battleId === request.id ||
          (n.title?.includes('Nouveau Défi') && n.message?.includes(hostName) && (Date.now() - new Date(n.timestamp).getTime()) < 30000)
        );
        if (alreadyInList) return prev;

        const newNotif: AppNotification = {
          id: request.id,
          battleId: request.id,
          type: 'info',
          title: 'Nouveau Défi ! ⚔️',
          message: `${hostName} te défie au ${typeName} !`,
          avatar: hostAvatar,
          senderName: hostName,
          timestamp: new Date().toISOString(),
          read: false
        };
        const updatedStats = {
          ...currentStats,
          notifications: [newNotif, ...currentNotifs].slice(0, 50)
        };
        const updatedUser = {
          ...prev,
          stats: updatedStats
        };
        safeLocalStorageSet('levelmak_user', JSON.stringify(updatedUser));
        return updatedUser;
      });

      // 2. Play sound, haptics & native notification
      import('../services/audio').then(({ audioService }) => {
        audioService.playBattleInvite();
      }).catch(() => {});
      import('../services/nativeAdapters').then(({ sendLocalNotification, HapticFeedback }) => {
        sendLocalNotification('Nouveau Défi ! ⚔️', `${hostName} te défie au ${typeName}`);
        HapticFeedback.success();
      }).catch(() => {});
    };

    const handleBattleAccept = (p: any) => {
      const request: BattleRequest = p.payload?.request;
      if (!request) return;
      if (request.host?.id === userId || (request.host as any)?.original_id === userId) {
        console.log('⚔️ [GlobalBattle] Host received battle_accept in useStore:', request);
        window.dispatchEvent(new CustomEvent('host_received_battle_accept', { detail: { request } }));
      }
    };

    const channels: any[] = [];

    // 1. Listen on user's dedicated personal channel
    const userChannel = supabase.channel(`user-battles-${userId}`)
      .on('broadcast', { event: 'battle_invite' }, handleBattleInvite)
      .on('broadcast', { event: 'battle_accept' }, handleBattleAccept)
      .subscribe((status, err) => {
        console.log(`⚔️ [GlobalBattle] user-battles-${userId} status:`, status, err || '');
      });
    channels.push(userChannel);

    // 2. If device session ID exists and is different from userId, listen on session channel as well
    if (currentDeviceId && currentDeviceId !== userId) {
      const sessionChannel = supabase.channel(`user-battles-${currentDeviceId}`)
        .on('broadcast', { event: 'battle_invite' }, handleBattleInvite)
        .on('broadcast', { event: 'battle_accept' }, handleBattleAccept)
        .subscribe((status, err) => {
          console.log(`⚔️ [GlobalBattle] user-battles-${currentDeviceId} status:`, status, err || '');
        });
      channels.push(sessionChannel);
    }

    // 3. Global map channel listener
    const presenceChannel = supabase.channel('world-presence-v3')
      .on('broadcast', { event: 'battle_invite' }, handleBattleInvite)
      .on('broadcast', { event: 'battle_accept' }, handleBattleAccept)
      .subscribe((status, err) => {
        console.log(`⚔️ [GlobalBattle] world-presence-v3 status:`, status, err || '');
      });
    channels.push(presenceChannel);

    globalBattleChannelRef.current = channels;

    return () => {
      if (globalBattleChannelRef.current) {
        if (Array.isArray(globalBattleChannelRef.current)) {
          globalBattleChannelRef.current.forEach((ch: any) => supabase.removeChannel(ch));
        } else {
          supabase.removeChannel(globalBattleChannelRef.current);
        }
        globalBattleChannelRef.current = null;
      }
    };
  }, [auth.user?.id, auth.user?.name]);

  const clearPendingBattleInvite = useCallback(() => setPendingBattleInvite(null), []);
  const clearAcceptedBattleRequest = useCallback(() => setAcceptedBattleRequest(null), []);
  // ────────────────────────────────────────────────────────────────────────

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
      const savedGoalsStr = auth.user.id ? localStorage.getItem(`levelmak_custom_goals_${auth.user.id}`) : null;
      let cachedGoals = null;
      if (savedGoalsStr) {
        try { cachedGoals = JSON.parse(savedGoalsStr); } catch (_) {}
      }

      const seededAnalytics = {
        studyTimeBySubject: {},
        studyTimeByDay: [],
        quizPerformance: [],
        weeklyGoals: { target: 120, achieved: 0 },
        examPredictions: [],
        customGoals: cachedGoals || auth.user.analytics?.customGoals || DEFAULT_CUSTOM_GOALS
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
  }, [auth.user?.id]);

  // Auto-seed official welcome notification for new accounts ONCE only
  // and auto-migrate legacy long welcome notifications with emojis to the new concise text
  useEffect(() => {
    if (auth.user) {
      const currentStats = auth.user.stats || {};
      const currentNotifications = currentStats.notifications || [];
      const welcomeKey = `levelmak_welcome_delivered_${auth.user.id}`;
      const isWelcomeDelivered = currentStats.welcomeNotifDelivered || localStorage.getItem(welcomeKey) === 'true';

      const firstName = (auth.user.name || 'Apprenant').split(' ')[0];
      const welcomeTitle = `Bienvenue sur LEVELMAK, ${firstName}`;
      const welcomeMessage = `Ton espace d'apprentissage est prêt. Révise tes cours, progresse avec le Coach IA et réussis tes examens à ton rythme. L'équipe LEVELMAK est à tes côtés.`;

      if (!isWelcomeDelivered && currentNotifications.length === 0) {
        localStorage.setItem(welcomeKey, 'true');
        const welcomeNotif: AppNotification = {
          id: `welcome_${auth.user.id}`,
          type: 'info',
          title: welcomeTitle,
          message: welcomeMessage,
          timestamp: new Date().toISOString(),
          read: false
        };

        const updatedStats = {
          ...currentStats,
          welcomeNotifDelivered: true,
          notifications: [welcomeNotif]
        };

        auth.setUser(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            stats: updatedStats
          };
          safeLocalStorageSet('levelmak_user', JSON.stringify(updated));
          return updated;
        });

        if (auth.user.id && !auth.user.id.includes('anon')) {
          supabase.from('profiles').update({ stats: updatedStats }).eq('id', auth.user.id).then(({ error }) => {
            if (error) console.error('[Welcome Notif Sync Error]:', error);
          });
        }
      } else if (currentNotifications.length > 0) {
        // Auto-migrate legacy welcome notification: remove emojis and shorten text
        let hasLegacyWelcome = false;
        const updatedNotifications = currentNotifications.map((notif: any) => {
          const isLegacyWelcome =
            notif.id?.startsWith('welcome_') ||
            notif.title?.includes("Bienvenue dans l'Élite LEVELMAK") ||
            notif.message?.includes('🤖') ||
            notif.message?.includes("Ton espace d'apprentissage d'excellence");

          if (isLegacyWelcome && (notif.title !== welcomeTitle || notif.message !== welcomeMessage || notif.type !== 'info')) {
            hasLegacyWelcome = true;
            return {
              ...notif,
              type: 'info',
              title: welcomeTitle,
              message: welcomeMessage
            };
          }
          return notif;
        });

        if (hasLegacyWelcome) {
          const updatedStats = {
            ...currentStats,
            notifications: updatedNotifications
          };

          auth.setUser(prev => {
            if (!prev) return null;
            const updated = {
              ...prev,
              stats: updatedStats
            };
            safeLocalStorageSet('levelmak_user', JSON.stringify(updated));
            return updated;
          });

          if (auth.user.id && !auth.user.id.includes('anon')) {
            supabase.from('profiles').update({ stats: updatedStats }).eq('id', auth.user.id).then(({ error }) => {
              if (error) console.error('[Welcome Notif Migration Error]:', error);
            });
          }
        }
      }
    }
  }, [auth.user?.id]);

  const addNotification = useCallback((notificationOrType: any, title?: string, message?: string, avatar?: string | null) => {
    let newNotif: AppNotification;
    if (typeof notificationOrType === 'string' && title && message) {
      newNotif = {
        type: notificationOrType as any,
        title,
        message,
        avatar: avatar || null,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        read: false
      };
    } else {
      newNotif = {
        ...notificationOrType,
        id: notificationOrType.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: notificationOrType.timestamp || new Date().toISOString(),
        read: false
      };
    }
    
    auth.setUser(prev => {
      if (!prev) return prev;
      const currentStats = prev.stats || {};
      const currentNotifications = currentStats.notifications || [];

      // Guard: prevent identical notification within 10 seconds
      const isDuplicate = currentNotifications.some((n: any) => 
        (newNotif.id && n.id === newNotif.id) ||
        (n.title === newNotif.title && n.message === newNotif.message && (Date.now() - new Date(n.timestamp).getTime()) < 10000)
      );
      if (isDuplicate) return prev;

      const updatedStats = {
        ...currentStats,
        // Cap notifications at 50 to prevent localStorage overflow
        notifications: [newNotif, ...currentNotifications].slice(0, 50)
      };
      const updatedUser = {
        ...prev,
        stats: updatedStats
      };
      if (prev.id) {
        safeLocalStorageSet(`levelmak_notifications_${prev.id}`, JSON.stringify(updatedStats.notifications));
      }
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
      if (prev.id) {
        safeLocalStorageSet(`levelmak_notifications_${prev.id}`, JSON.stringify(updatedStats.notifications));
      }
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
      if (prev.id) {
        safeLocalStorageSet(`levelmak_notifications_${prev.id}`, JSON.stringify(updatedStats.notifications));
      }
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
      if (prev.id) {
        safeLocalStorageSet(`levelmak_notifications_${prev.id}`, JSON.stringify(updatedStats.notifications));
      }
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
        welcomeNotifDelivered: true,
        notifications: currentNotifications.filter((n: any) => String(n.id) !== String(id))
      };
      const updatedUser = {
        ...prev,
        stats: updatedStats
      };
      if (prev.id) {
        localStorage.setItem(`levelmak_welcome_delivered_${prev.id}`, 'true');
        safeLocalStorageSet(`levelmak_notifications_${prev.id}`, JSON.stringify(updatedStats.notifications));
      }
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
        welcomeNotifDelivered: true,
        notifications: []
      };
      const updatedUser = {
        ...prev,
        stats: updatedStats
      };
      if (prev.id) {
        localStorage.setItem(`levelmak_welcome_delivered_${prev.id}`, 'true');
        safeLocalStorageSet(`levelmak_notifications_${prev.id}`, JSON.stringify([]));
      }
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
    if (!minutes || isNaN(minutes) || minutes <= 0) return;
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

      const currentHours = prev.stats?.hoursLearned || 0;
      const currentMins = (prev.stats as any)?.studyMinutes || Math.round(currentHours * 60);
      const newMinutes = currentMins + Math.round(minutes);
      const newHours = parseFloat((newMinutes / 60).toFixed(2));

      const updatedStats = {
        ...prev.stats,
        hoursLearned: newHours,
        studyMinutes: newMinutes
      };

      const updatedUser = {
        ...prev,
        stats: updatedStats,
        analytics: updatedAnalytics
      };

      safeLocalStorageSet('levelmak_user', JSON.stringify(updatedUser));

      if (updatedUser.id && !updatedUser.id.includes('anon')) {
        import('../services/supabase').then(({ supabase }) => {
          supabase.from('profiles').update({
            stats: {
              ...updatedUser.stats,
              analytics: updatedAnalytics
            }
          }).eq('id', updatedUser.id).then(({ error }) => {
            if (error) console.warn('[trackTime sync error]:', error.message);
          });
        }).catch(() => {});
      }

      return updatedUser;
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

    // Contribuer au Jardin de l'Esprit lors d'un quiz/duel contre l'IA ou joueur
    const plantTypes: ('flower' | 'tree' | 'shrub')[] = ['flower', 'tree', 'shrub'];
    const selectedPlant = plantTypes[Math.floor(Math.random() * plantTypes.length)];
    gamification.plantInGarden(selectedPlant);

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
    updateSRSMetadata,
    pendingBattleInvite,
    clearPendingBattleInvite,
    acceptedBattleRequest,
    setAcceptedBattleRequest,
    clearAcceptedBattleRequest
  }), [auth, content, ui, coach, gamification, daily, changePassword, registerTeacher, resolveBattle, rollDice, notifications, continuousStudyTime, resetContinuousStudyTime, deleteCurrentUserAccount, addNotification, markNotificationAsRead, toggleNotificationRead, markAllNotificationsAsRead, deleteNotification, clearNotifications, trackTime, offlinePacks, downloadCourse, incrementFlashcardsStudied, updateSRSMetadata, pendingBattleInvite, clearPendingBattleInvite, acceptedBattleRequest, clearAcceptedBattleRequest]);

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
