import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { User, SchoolLevel, Quiz, Story, Mission, Book, Flashcard, FlashcardDeck, Activity, StudyPlan, StudyTask, UserAnalytics, GardenPlant, CoachMessage, CoachSession, League, AILabSession } from '../types';
import { AppNotification, notificationService } from '../services/notificationService';
import { audioService } from '../services/audio';
import { openrouterService } from '../services/openrouter';
import { XP_PER_LEVEL, POTIONS, getLeagueFromXp, getXpForNextLevel } from '../constants';
import { supabase } from '../services/supabase';
import { signUpWithPhone, signInWithPhone, convertSupabaseUser, changeUserPassword } from '../services/authService';
import { translations, Language } from '../utils/translations';
import { offlineService } from '../services/offlineService';
import { Network } from '@capacitor/network';
import { OfflinePack } from '../types';
import { HapticFeedback } from '../services/nativeAdapters';

interface AppState {
  user: User | null;
  quizzes: Quiz[];
  stories: Story[];
  missions: Mission[];
  flashcards: Flashcard[];
  decks: FlashcardDeck[];
  books: Book[];
  studyPlan: StudyPlan | null;
  settings: {
    theme: 'light' | 'dark';
    fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
    soundEnabled: boolean;
    language: 'fr' | 'en' | 'ar';
    notifications: {
      missions: boolean;
      quiz: boolean;
      community: boolean;
    };
  };
  dailyVocab: {
    words: { word: string; explanation: string; usage: string }[];
    loading: boolean;
  };
  dailyMotivation: {
    quote: string;
    author: string;
    loading: boolean;
  };
  loading: boolean;
  login: (name: string) => void;
  registerWithPhone: (params: { name: string, phone: string, email: string, password: string, gender: User['gender'], ageRange: User['ageRange'] }) => Promise<void>;
  loginWithPhone: (phone: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string, gender?: User['gender'], ageRange?: User['ageRange']) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  addXp: (amount: number) => void;
  saveQuiz: (quiz: Quiz) => void;
  saveStory: (story: Story) => void;
  deleteStory: (id: string) => void;
  saveBook: (book: Book) => void;
  saveFlashcardDeck: (deck: FlashcardDeck, cards: Flashcard[]) => void;
  saveFlashcard: (card: Flashcard) => void;
  deleteFlashcard: (id: string) => void;
  completeMission: (id: string) => void;
  purchaseItem: (itemId: string, price: number) => boolean;
  equipItem: (itemId: string, category: 'avatar' | 'badge' | 'theme', imageUrl?: string) => void;
  updateProfileImage: (imageUrl: string) => void;
  updateProfile: (name: string, phoneNumber?: string, updates?: Partial<User>) => void;
  deleteBook: (id: string) => void;
  deleteFlashcardDeck: (id: string) => void;
  updateSettings: (newSettings: Partial<AppState['settings']>) => void;
  addActivity: (type: Activity['type'], title: string, description: string) => void;
  trackTime: (minutes: number) => void;
  grantBadge: (badgeId: string, title: string, description: string) => void;
  incrementBooksRead: () => void;
  incrementFlashcardsStudied: (amount: number) => void;
  saveStudyPlan: (plan: StudyPlan) => void;
  deleteStudyPlan: () => void;
  toggleTaskCompletion: (taskId: string) => void;
  trackStudyTime: (minutes: number, subject?: string) => void;
  updateQuizPerformance: (subject: string, score: number, total: number) => void;
  addLevelCoins: (amount: number) => void;
  betLevelCoins: (amount: number) => boolean;
  purchasePotion: (potionId: string) => boolean;
  usePotion: (potionId: string) => void;
  rollDice: () => { result: number, reward: { type: 'item' | 'joker' | 'surprise' | 'super', value: any } };
  changePassword: (oldPw: string, newPw: string) => Promise<void>;
  updateSRSMetadata: (id: string, type: 'flashcard' | 'quiz', rating: 1 | 2 | 3 | 4 | 5) => void;
  notifications: AppNotification[];
  addNotification: (type: AppNotification['type'], title: string, message: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  isOnline: boolean;
  downloadCourse: (courseId: string) => Promise<void>;
  offlinePacks: string[]; // List of offline course IDs
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
  plantInGarden: (type: 'flower' | 'tree' | 'cactus' | 'bonsai' | 'lotus') => void;
  waterGarden: (plantId?: string, itemType?: 'water_can' | 'fertilizer') => boolean;
  updateLocation: (latitude: number, longitude: number, isPublic: boolean) => void;
  continuousStudyTime: number;  showBubbleWrap: boolean;
  setShowBubbleWrap: (show: boolean) => void;
  lastActivityTimestamp: number;
  resolveBattle: (winnerId: string, isDraw?: boolean) => void;
  coachSessions: CoachSession[];
  saveCoachMessage: (sessionId: string, message: CoachMessage) => void;
  createCoachSession: (firstMessage?: string) => string;
  deleteCoachSession: (sessionId: string) => void;
  aiLabHistory: AILabSession[];
  saveAILabSession: (session: AILabSession) => void;
  deleteAILabSession: (sessionId: string) => void;
  xpPercentage: number;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlinePacks, setOfflinePacks] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppState['settings']>({
    theme: 'dark',
    fontSize: 'base',
    soundEnabled: true,
    language: 'fr',
    notifications: {
      missions: true,
      quiz: true,
      community: true
    }
  });
  const [dailyVocab, setDailyVocab] = useState<AppState['dailyVocab']>({
    words: [],
    loading: true
  });
  const [dailyMotivation, setDailyMotivation] = useState<AppState['dailyMotivation']>({
    quote: "Le succès, c’est d’aller d’échec en échec sans perdre son enthousiasme.",
    author: "Winston Churchill",
    loading: false
  });
  const [continuousStudyTime, setContinuousStudyTime] = useState(0);
  const [showBubbleWrap, setShowBubbleWrap] = useState(false);
  const [lastActivityTimestamp, setLastActivityTimestamp] = useState(Date.now());
  const [coachSessions, setCoachSessions] = useState<CoachSession[]>([]);
  const [aiLabHistory, setAiLabHistory] = useState<AILabSession[]>([]);
  const locationUpdateTimer = useRef<NodeJS.Timeout | null>(null);

  // ========== HELPER FUNCTIONS ==========

  const syncUserWithSupabase = useCallback(async (updatedUser: User) => {
    if (updatedUser?.id && updatedUser.id !== 'guest') {
      try {
        await supabase
          .from('profiles')
          .update({
            xp: updatedUser.xp,
            total_xp: updatedUser.totalXp,
            level_coins: updatedUser.levelCoins,
            stats: updatedUser.stats,
            badges: updatedUser.badges,
            streak: updatedUser.streak,
            inventory: updatedUser.inventory,
            avatar_config: updatedUser.avatar // Store avatar and location info in avatar_config JSONB
          })
          .eq('id', updatedUser.id);
      } catch (error) {
        console.error('Error syncing user with Supabase:', error);
      }
    }
  }, []);

  const addActivity = useCallback((type: Activity['type'], title: string, description: string) => {
    setUser(prev => {
      if (!prev) return null;
      const newActivity: Activity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        description,
        timestamp: new Date().toISOString()
      };

      const updated: User = {
        ...prev,
        activities: [newActivity, ...(prev.activities || [])].slice(0, 20)
      };

      // Real-time sync for critical activities to Admin Dashboard
      const criticalTypes: Array<Activity['type'] | 'payment'> = ['quiz', 'badge', 'payment', 'profile'];
      if (criticalTypes.includes(type) && prev.id && !prev.id.includes('anon')) {
        import('../services/adminService').then(({ syncUserEvent }) => {
          syncUserEvent(prev.id, prev.name, title, { description, type });
        });
      }

      localStorage.setItem('levelmak_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const grantBadge = useCallback((badgeId: string, title: string, description: string) => {
    setUser(prev => {
      if (!prev || (prev.badges && prev.badges.includes(badgeId))) return prev;
      const updated: User = {
        ...prev,
        badges: [...(prev.badges || []), badgeId]
      };
      localStorage.setItem('levelmak_user', JSON.stringify(updated));

      setTimeout(() => {
        addActivity('badge', title, description);
        const audio = new Audio('/sounds/badge.mp3');
        audio.play().catch(() => { });
      }, 0);

      return updated;
    });
  }, [addActivity]);

  // Consolidated initialization effect
  useEffect(() => {
    // Clear stale OAuth fragments from the URL to prevent Supabase from using expired tokens (Fixing 400/403 errors on reload)
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        console.log("Cleared stale OAuth fragment from URL.");
    }

    const initializeApp = async () => {
      try {
        // 1. Load User from localStorage
        const storedUser = localStorage.getItem('levelmak_user');
        let loadedUser: User | null = null;

        if (storedUser) {
          try {
            loadedUser = JSON.parse(storedUser);
            if (loadedUser) {
              // Streak Logic
              const now = new Date();
              const lastLogin = loadedUser.streak?.lastLogin ? new Date(loadedUser.streak.lastLogin) : null;

              if (lastLogin) {
                const diffInMs = now.getTime() - lastLogin.getTime();
                const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

                if (diffInDays === 1) {
                  loadedUser.streak = {
                    current: (loadedUser.streak?.current || 0) + 1,
                    lastLogin: now.toISOString()
                  };
                  loadedUser.levelCoins = (loadedUser.levelCoins || 0) + 10;
                } else if (diffInDays > 1) {
                  loadedUser.streak = { current: 1, lastLogin: now.toISOString() };
                }
              } else {
                loadedUser.streak = { current: 1, lastLogin: now.toISOString() };
              }


              setUser(loadedUser);
              if (loadedUser.coachSessions) setCoachSessions(loadedUser.coachSessions);
              if (loadedUser.aiLabHistory) setAiLabHistory(loadedUser.aiLabHistory);
              localStorage.setItem('levelmak_user', JSON.stringify(loadedUser));
            }
          } catch (error) {
            console.error('Error parsing stored user:', error);
            localStorage.removeItem('levelmak_user');
          }
        }

        // 2. Load Missions
        setMissions([
          { id: 'm1', title: 'Premier Quiz', description: 'Génère et complète ton premier quiz', rewardXp: 100, completed: false, type: 'quiz' },
          { id: 'm2', title: 'Lecteur Assidu', description: 'Lis pendant 10 minutes', rewardXp: 50, completed: false, type: 'reading' },
        ]);

        // 3. Load Books
        const storedBooks = localStorage.getItem('levelmak_books');
        if (storedBooks) {
          try {
            setBooks(JSON.parse(storedBooks));
          } catch (e) {
            console.error("Error loading books", e);
          }
        } else {
          setBooks([
            { id: 'b1', title: 'L\'Enfant Noir', author: 'Camara Laye', category: 'Littérature Africaine', cover: 'https://picsum.photos/seed/book1/200/300', description: 'Un classique de la littérature africaine.', uri: 'https://www.google.fr/books/edition/L_enfant_noir/XW_uAAAAMAAJ' },
            { id: 'b2', title: 'Les Contes d\'Amadou Koumba', author: 'Birago Diop', category: 'Contes', cover: 'https://picsum.photos/seed/book2/200/300', description: 'Recueil de contes traditionnels.', uri: 'https://www.google.fr/books/edition/Les_contes_d_Amadou_Koumba/n3_uAAAAMAAJ' },
          ]);
        }

        // 4. Load Stories
        const storedStories = localStorage.getItem('levelmak_stories');
        if (storedStories) {
          try {
            setStories(JSON.parse(storedStories));
          } catch (e) {
            console.error("Error loading stories", e);
          }
        }

        // 5. Load Flashcards & Decks
        const storedFlashcards = localStorage.getItem('levelmak_flashcards');
        const storedDecks = localStorage.getItem('levelmak_decks');
        if (storedFlashcards) {
          try {
            setFlashcards(JSON.parse(storedFlashcards));
          } catch (e) { console.error("Error loading flashcards", e); }
        }
        if (storedDecks) {
          try {
            setDecks(JSON.parse(storedDecks));
          } catch (e) { console.error("Error loading decks", e); }
        }

        // 6. Load Settings
        const storedSettings = localStorage.getItem('levelmak_settings');
        if (storedSettings) {
          try {
            const parsed = JSON.parse(storedSettings);
            setSettings(prev => ({ ...prev, ...parsed }));
          } catch (e) {
            console.error("Error loading settings", e);
          }
        }

        // 7. Load Quizzes
        const storedQuizzes = localStorage.getItem('levelmak_quizzes');
        if (storedQuizzes) {
          try {
            setQuizzes(JSON.parse(storedQuizzes));
          } catch (e) {
            console.error("Error loading quizzes", e);
          }
        }

        // 8. Load Study Plan
        const storedPlan = localStorage.getItem('levelmak_study_plan');
        if (storedPlan) {
          try {
            setStudyPlan(JSON.parse(storedPlan));
          } catch (e) {
            console.error("Error loading study plan", e);
          }
        }

        // 9. Load Daily Content — Background Load
        const startDailyContent = async () => {
          try {
            const [{ cacheService }] = await Promise.all([
              import('../services/cache'),
            ]);

            const staticQuotes = [
              { quote: "Le succès n'est pas final, l'échec n'est pas fatal. C'est le courage de continuer qui compte.", author: "Winston Churchill" },
              { quote: "L'éducation est l'arme la plus puissante qu'on puisse utiliser pour changer le monde.", author: "Nelson Mandela" },
              { quote: "Le savoir est la seule matière qui s'accroît quand on la partage.", author: "Socrate" },
              { quote: "Vis comme si tu devais mourir demain. Apprends comme si tu devais vivre éternellement.", author: "Gandhi" },
              { quote: "Soyez le changement que vous voulez voir dans le monde.", author: "Gandhi" }
            ];

            const staticVocab = [
              [{ word: "Résilience", explanation: "Capacité à surmonter les épreuves.", usage: "Sa résilience l'a mené au succès." }, { word: "Paradigme", explanation: "Modèle de pensée.", usage: "Un changement de paradigme." }],
              [{ word: "Altruisme", explanation: "Souci du bien-être d'autrui.", usage: "Son altruisme est exemplaire." }, { word: "Pragmatique", explanation: "Qui privilégie l'action.", usage: "Une approche pragmatique." }]
            ];

            const dayIndex = new Date().getDate() - 1;
            setDailyMotivation({ ...staticQuotes[dayIndex % staticQuotes.length], loading: false });
            setDailyVocab({ words: staticVocab[dayIndex % staticVocab.length] || [], loading: false });

            // IA Background Refresh
            setTimeout(() => {
              cacheService.getDailyVocab(async () => {
                return await openrouterService.getDailyVocabulary([], settings.language);
              }, settings.language).then(words => {
                if (words?.length) setDailyVocab({ words, loading: false });
              }).catch(() => {});

              cacheService.getDailyMotivation(async () => {
                return await openrouterService.getDailyMotivation([], settings.language);
              }, settings.language).then(data => {
                if (data?.quote) setDailyMotivation({ ...data, loading: false });
              }).catch(() => {});
            }, 2000);
          } catch (e) {
            console.warn("Background content error:", e);
          }
        };

        // Don't await this, let it run in background
        startDailyContent();

      } catch (error) {
        console.error("Global app initialization failed:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // 2. Automated Badge Monitor
  useEffect(() => {
    if (!user) return;

    const checkBadges = () => {
      const stats = user.stats || {};
      const badges = user.badges || [];

      // First Quiz
      if (stats.quizzesCompleted >= 1 && !badges.includes('first_quiz')) {
        grantBadge('first_quiz', 'Premier Pas 🎯', 'Tu as complété ton premier quiz !');
      }
      // Quiz Master
      if (stats.quizzesCompleted >= 50 && !badges.includes('quiz_master')) {
        grantBadge('quiz_master', 'Maître des Quiz 🏆', 'Impressionnant ! 50 quiz complétés.');
      }
      // Reading Owl
      if (stats.booksRead >= 10 && !badges.includes('reading_owl')) {
        grantBadge('reading_owl', 'Chouette de Bibliothèque 🦉', 'Tu as débloqué le savoir de 10 livres.');
      }
      // Word Smith
      if (stats.storiesWritten >= 5 && !badges.includes('word_smith')) {
        grantBadge('word_smith', 'Plume d\'Or ✒️', '5 histoires écrites. Un vrai écrivain !');
      }
      // 7 Day Streak
      if (user.streak?.current >= 7 && !badges.includes('streak_7')) {
        grantBadge('streak_7', 'Série de Feu 🔥', 'Une semaine entière de régularité !');
      }
    };

    const timeoutId = setTimeout(checkBadges, 2000);
    return () => clearTimeout(timeoutId);
  }, [user?.stats, user?.streak?.current, grantBadge]);

  // Supabase Auth State Listener (Session Recovery)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('--- AUTH STATE CHANGE ---', event);
      if (session?.user) {
        try {
          const userData = await convertSupabaseUser(session.user);
          if (userData) {
            // Check for blocked/deactivated accounts
            if (userData.status === 'blocked' || userData.status === 'suspended') {
              console.warn('Account is restricted:', userData.status);
              await supabase.auth.signOut();
              setUser(null);
              localStorage.removeItem('levelmak_user');
              return;
            }

            if (!user) {
              console.log('Auth synced: User session restored');
              setUser(userData);
              if (userData.quizzes) setQuizzes(userData.quizzes);
              if (userData.stories) setStories(userData.stories);
              if (userData.coachSessions) setCoachSessions(userData.coachSessions);
              localStorage.setItem('levelmak_user', JSON.stringify(userData));
            }
          }
        } catch (error) {
          console.error('Failed to auto-sync session:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('levelmak_user');
      }
    });
    return () => subscription.unsubscribe();
  }, [user]);

  // AUTO-SYNC TO FIRESTORE ON CHANGES
  useEffect(() => {
    if (!user || !user.id || user.id.includes('anon')) return;

    const timer = setTimeout(async () => {
      try {
        const syncData = {
          ...user,
          last_sync: new Date().toISOString()
        };

        // Update user profile
        const { error: syncError } = await supabase
          .from('profiles')
          .update({
            xp: user.xp,
            total_xp: user.totalXp,
            level_coins: user.levelCoins,
            stats: user.stats,
            badges: user.badges,
            streak: user.streak,
            inventory: user.inventory,
            avatar_config: user.avatar // Store avatar and location info in avatar_config JSONB
          })
          .eq('id', user.id);
          
        if (syncError) {
            console.error("Supabase sync Error Details:", syncError);
            throw syncError;
        }

        localStorage.setItem('levelmak_user', JSON.stringify(user));
        console.log("Progress saved to Supabase ☁️");
      } catch (error) {
        console.error("Supabase sync failed:", error);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [user]);

  // Supabase cleanup or additional initialization
  useEffect(() => {
    const storedUser = localStorage.getItem('levelmak_user');
    if (!storedUser) return;

    // Check if session is still valid
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && storedUser) {
        // Optionnel: tenter une reconnexion ou simplement demander login
      }
    });
  }, []);

  const saveBook = useCallback((book: Book) => {
    setBooks(prev => {
      if (prev.some(b => b.title === book.title)) return prev;
      const newBooks = [book, ...prev];
      localStorage.setItem('levelmak_books', JSON.stringify(newBooks));
      return newBooks;
    });
    // Pas d'XP pour sauvegarder un livre (c'est juste un bookmark)
  }, []);

  const deleteBook = useCallback((id: string) => {
    setBooks(prev => {
      const newBooks = prev.filter(b => b.id !== id);
      localStorage.setItem('levelmak_books', JSON.stringify(newBooks));
      return newBooks;
    });
  }, []);

  const login = useCallback(async (name: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: { name }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error("Accès anonyme échoué");

      const newUser = await convertSupabaseUser(data.user);
      if (newUser) {
        setUser(newUser);
        localStorage.setItem('levelmak_user', JSON.stringify(newUser));
      }
    } catch (error) {
      console.error('Supabase Anonymous Auth failed during login:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const registerWithPhone = useCallback(async (params: { name: string, phone: string, email: string, password: string, gender: User['gender'], ageRange: User['ageRange'] }) => {
    const { name, phone, email, password, gender, ageRange } = params;
    try {
      setLoading(true);
      console.log('--- STORE registerWithPhone (OBJECT) ---');
      console.log('Password length:', password?.length);
      const newUser = await signUpWithPhone({
        name,
        phone,
        password,
        gender: gender!,
        ageRange: ageRange!,
        realEmail: email
      });
      if (newUser) {
        setUser(newUser);
        localStorage.setItem('levelmak_user', JSON.stringify(newUser));
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithPhone = useCallback(async (phone: string, password: string) => {
    try {
      setLoading(true);
      const loggedUser = await signInWithPhone(phone, password);
      if (loggedUser) {
        if (loggedUser.status && loggedUser.status !== 'active') {
          await supabase.auth.signOut();
          throw new Error(loggedUser.status === 'blocked'
            ? 'Ton compte a été bloqué définitivement pour non-respect des règles.'
            : 'Ton compte est actuellement suspendu. Contacte le support pour plus d\'infos.');
        }
        setUser(loggedUser);
        localStorage.setItem('levelmak_user', JSON.stringify(loggedUser));
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerWithEmail = useCallback(async (name: string, email: string, password: string, gender?: User['gender'], ageRange?: User['ageRange']) => {
    try {
      setLoading(true);
      const { signUpWithEmail } = await import('../services/authService');
      const newUser = await signUpWithEmail(email, password, name, gender, ageRange);
      if (newUser) {
        setUser(newUser);
        localStorage.setItem('levelmak_user', JSON.stringify(newUser));
      }
    } catch (error: any) {
      console.error('Email registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const { signInWithEmail } = await import('../services/authService');
      const loggedUser = await signInWithEmail(email, password);
      if (loggedUser) {
        setUser(loggedUser);
        localStorage.setItem('levelmak_user', JSON.stringify(loggedUser));
      }
    } catch (error: any) {
      console.error('Email login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      const { signInWithGoogle } = await import('../services/authService');
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        setUser(loggedUser);
        localStorage.setItem('levelmak_user', JSON.stringify(loggedUser));
      }
    } catch (error: any) {
      console.error('Google login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    // Always clear user state immediately, regardless of Supabase result
    setUser(null);
    localStorage.removeItem('levelmak_user');

    try {
      // Attempt Supabase signOut with a 5-second timeout
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 5000))
      ]);
      console.log('Logged out successfully');
    } catch (error) {
      // LockManager timeout or network error - user is already logged out locally
      console.warn('Supabase signOut warning (user already logged out locally):', error);
    }
  }, []);



  const addXp = useCallback((amount: number) => {
    setUser(prev => {
      if (!prev) return null;
      const today = new Date().toISOString().split('T')[0];
      const newProgression = [...(prev.progression || [])];
      const lastEntry = newProgression[newProgression.length - 1];

      const activeEffects = prev.activeEffects || {};
      const now = Date.now();
      let multiplier = 1;

      if (activeEffects['double_xp'] && activeEffects['double_xp'] > now) {
        multiplier = 2;
      }

      const finalAmount = amount * multiplier;

      if (lastEntry && lastEntry.date === today) {
        lastEntry.xp = prev.totalXp + finalAmount;
      } else {
        newProgression.push({ date: today, xp: prev.totalXp + finalAmount });
      }

      let bonusCoins = Math.floor(finalAmount / 10);

      if (activeEffects['fortune'] && activeEffects['fortune'] > now) {
        bonusCoins *= 2;
      }

      let updated: User = {
        ...prev,
        xp: prev.xp + finalAmount,
        totalXp: (prev.totalXp || 0) + finalAmount,
        levelCoins: (prev.levelCoins || 0) + bonusCoins,
        progression: newProgression,
        league: getLeagueFromXp((prev.totalXp || 0) + finalAmount) as League
      };

      let xpNeeded = getXpForNextLevel(updated.avatar?.currentLevel || 1);

      while (updated.xp >= xpNeeded) {
        updated.xp -= xpNeeded;
        updated.avatar = {
          ...updated.avatar,
          currentLevel: (updated.avatar?.currentLevel || 1) + 1
        };
        updated.levelCoins += 100;
        xpNeeded = getXpForNextLevel(updated.avatar.currentLevel);

        setTimeout(() => {
          addActivity('badge', 'Nouveau Niveau !', `Tu as atteint le niveau ${updated.avatar.currentLevel}`);
        }, 0);
      }

      localStorage.setItem('levelmak_user', JSON.stringify(updated));
      return updated;
    });
  }, [addActivity]);

  const addLevelCoins = (amount: number) => {
    setUser(prev => {
      if (!prev) return null;
      const activeEffects = prev.activeEffects || {};
      const now = Date.now();
      let bonusMulti = 1;
      if (activeEffects['fortune'] && activeEffects['fortune'] > now) bonusMulti = 2;

      const finalAmount = amount * bonusMulti;
      const updated: User = { ...prev, levelCoins: (prev.levelCoins || 0) + finalAmount };
      localStorage.setItem('levelmak_user', JSON.stringify(updated));
      return updated;
    });
  };

  const saveCoachMessage = useCallback((sessionId: string, message: CoachMessage) => {
    setCoachSessions(prev => {
      const sessionIndex = prev.findIndex(s => s.id === sessionId);
      let newSessions = [...prev];

      if (sessionIndex >= 0) {
        const session = { ...newSessions[sessionIndex] };
        session.messages = [...session.messages, message];
        session.lastUpdated = new Date().toISOString();
        // Update title if it was "Nouvelle Discussion"
        if (session.title === "Nouvelle Discussion" && message.role === 'user') {
          session.title = message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '');
        }
        newSessions[sessionIndex] = session;
      }

      setUser(userPrev => {
        if (!userPrev) return null;
        const updated = { ...userPrev, coachSessions: newSessions };
        localStorage.setItem('levelmak_user', JSON.stringify(updated));
        return updated;
      });

      return newSessions;
    });
  }, []);

  const createCoachSession = useCallback((firstMessage?: string) => {
    const newId = `session_${Date.now()}`;
    const newSession: CoachSession = {
      id: newId,
      title: firstMessage ? (firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '')) : "Nouvelle Discussion",
      messages: [],
      lastUpdated: new Date().toISOString()
    };

    setCoachSessions(prev => {
      const newSessions = [newSession, ...prev];
      setUser(userPrev => {
        if (!userPrev) return null;
        const updated = { ...userPrev, coachSessions: newSessions };
        localStorage.setItem('levelmak_user', JSON.stringify(updated));
        return updated;
      });
      return newSessions;
    });

    return newId;
  }, []);

  const deleteCoachSession = useCallback((sessionId: string) => {
    setCoachSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      setUser(userPrev => {
        if (!userPrev) return null;
        const updated = { ...userPrev, coachSessions: newSessions };
        localStorage.setItem('levelmak_user', JSON.stringify(updated));
        return updated;
      });
      return newSessions;
    });
  }, []);

  const saveAILabSession = useCallback((session: AILabSession) => {
    setAiLabHistory(prev => {
      const existingIdx = prev.findIndex(s => s.id === session.id);
      let newHistory;
      if (existingIdx >= 0) {
        newHistory = [...prev];
        newHistory[existingIdx] = session;
      } else {
        newHistory = [session, ...prev];
      }
      
      setUser(userPrev => {
        if (!userPrev) return null;
        const updated = { ...userPrev, aiLabHistory: newHistory };
        localStorage.setItem('levelmak_user', JSON.stringify(updated));
        return updated;
      });
      return newHistory;
    });
  }, []);

  const deleteAILabSession = useCallback((sessionId: string) => {
    setAiLabHistory(prev => {
      const newHistory = prev.filter(s => s.id !== sessionId);
      setUser(userPrev => {
        if (!userPrev) return null;
        const updated = { ...userPrev, aiLabHistory: newHistory };
        localStorage.setItem('levelmak_user', JSON.stringify(updated));
        return updated;
      });
      return newHistory;
    });
  }, []);

  const betLevelCoins = (amount: number): boolean => {
    if (!user || (user.levelCoins || 0) < amount) return false;

    const updated: User = {
      ...user,
      levelCoins: user.levelCoins - amount
    };

    setUser(updated);
    localStorage.setItem('levelmak_user', JSON.stringify(updated));
    return true;
  };

  const purchaseItem = (itemId: string, price: number): boolean => {
    if (!user || (user.levelCoins || 0) < price) return false;

    const updated: User = {
      ...user,
      levelCoins: user.levelCoins - price,
      inventory: [...(user.inventory || []), itemId]
    };

    setUser(updated);
    localStorage.setItem('levelmak_user', JSON.stringify(updated));
    return true;
  };

  const equipItem = (itemId: string, category: 'avatar' | 'badge' | 'theme', imageUrl?: string) => {
    if (!user || !user.inventory.includes(itemId)) return;

    let updated: User = { ...user };
    if (category === 'avatar' && imageUrl) {
      updated.avatar = { ...user.avatar, image: imageUrl };
    }

    setUser(updated);
    localStorage.setItem('levelmak_user', JSON.stringify(updated));
  };

  const updateProfileImage = (imageUrl: string) => {
    // Disabled: users must purchase avatars from the shop
    return;
  };

  const saveQuiz = useCallback((quiz: Quiz) => {
    setQuizzes(prev => {
      const newQuizzes = [quiz, ...prev];
      localStorage.setItem('levelmak_quizzes', JSON.stringify(newQuizzes));

      if (user) {
        setUser({
          ...user,
          quizzes: newQuizzes,
          stats: {
            ...user.stats,
            quizzesCompleted: (user.stats.quizzesCompleted || 0) + 1
          }
        });
      }
      return newQuizzes;
    });

    addXp(10); // Petit bonus pour la génération, la vraie récompense vient du jeu
  }, [user, addXp]);

  const updateProfile = useCallback((name: string, phoneNumber?: string, updates?: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated: User = {
        ...prev,
        ...updates,
        name: name,
        phoneNumber: phoneNumber || prev.phoneNumber,
        username: name.toLowerCase().replace(/\s+/g, '_'),
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@levelmak.local`,
      };
      // Only update image if provided in updates
      if (updates?.avatar?.image) {
        updated.avatar = { ...prev.avatar, image: updates.avatar.image };
      }
      localStorage.setItem('levelmak_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppState['settings']>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('levelmak_settings', JSON.stringify(updated));

      if (newSettings.soundEnabled !== undefined) {
        audioService.setEnabled(newSettings.soundEnabled);
      }

      return updated;
    });
  }, []);

  const saveStory = useCallback((story: Story) => {
    setStories(prev => {
      const existingIdx = prev.findIndex(s => s.id === story.id);
      let newStories;
      if (existingIdx >= 0) {
        newStories = [...prev];
        newStories[existingIdx] = story;
      } else {
        newStories = [story, ...prev];
        addXp(100);
      }

      if (user) {
        setUser({
          ...user,
          stories: newStories,
          stats: {
            ...user.stats,
            storiesWritten: existingIdx >= 0 ? user.stats.storiesWritten : (user.stats.storiesWritten || 0) + 1
          }
        });
      }

      localStorage.setItem('levelmak_stories', JSON.stringify(newStories));
      return newStories;
    });
  }, [user, addXp]);

  const saveFlashcardDeck = (deck: FlashcardDeck, newCards: Flashcard[]) => {
    setDecks(prev => {
      const existingIdx = prev.findIndex(d => d.id === deck.id);
      const updatedDecks = existingIdx >= 0
        ? prev.map((d, i) => i === existingIdx ? deck : d)
        : [deck, ...prev];
      localStorage.setItem('levelmak_decks', JSON.stringify(updatedDecks));
      return updatedDecks;
    });

    setFlashcards(prev => {
      // Remove old cards from this deck and add new ones
      const otherCards = prev.filter(c => c.deckId !== deck.id);
      const updatedFlashcards = [...newCards, ...otherCards];
      localStorage.setItem('levelmak_flashcards', JSON.stringify(updatedFlashcards));
      return updatedFlashcards;
    });

    addXp(20); // Petit bonus pour la création, la vraie récompense vient de l'étude
  };

  const saveFlashcard = (card: Flashcard) => {
    setFlashcards(prev => {
      const existingIdx = prev.findIndex(c => c.id === card.id);
      let newFlashcards;
      if (existingIdx >= 0) {
        newFlashcards = [...prev];
        newFlashcards[existingIdx] = card;
      } else {
        newFlashcards = [card, ...prev];
        // Pas d'XP pour ajouter une carte individuelle
      }
      localStorage.setItem('levelmak_flashcards', JSON.stringify(newFlashcards));
      return newFlashcards;
    });
  };

  const deleteFlashcard = (id: string) => {
    setFlashcards(prev => {
      const newFlashcards = prev.filter(c => c.id !== id);
      localStorage.setItem('levelmak_flashcards', JSON.stringify(newFlashcards));
      return newFlashcards;
    });
  };

  const deleteFlashcardDeck = (id: string) => {
    setDecks(prev => {
      const newDecks = prev.filter(d => d.id !== id);
      localStorage.setItem('levelmak_decks', JSON.stringify(newDecks));
      return newDecks;
    });

    setFlashcards(prev => {
      const newFlashcards = prev.filter(c => c.deckId !== id);
      localStorage.setItem('levelmak_flashcards', JSON.stringify(newFlashcards));
      return newFlashcards;
    });
  };

  const deleteStory = (id: string) => {
    setStories(prev => {
      const newStories = prev.filter(s => s.id !== id);
      localStorage.setItem('levelmak_stories', JSON.stringify(newStories));
      return newStories;
    });
  };

  const completeMission = (id: string) => {
    setMissions(prev => prev.map(m => {
      if (m.id === id && !m.completed) {
        addXp(m.rewardXp);
        return { ...m, completed: true };
      }
      return m;
    }));
  };

  const trackTime = useCallback((minutes: number) => {
    const nowMs = Date.now();
    
    // Check for idle reset (10 minutes = 600,000 ms)
    setContinuousStudyTime(prev => {
      const isIdle = (nowMs - lastActivityTimestamp) > 10 * 60 * 1000;
      const newTime = isIdle ? minutes : prev + minutes;
      
      if (newTime >= 30 && (isIdle || prev < 30)) {
        setShowBubbleWrap(true);
      }
      return newTime;
    });

    setLastActivityTimestamp(nowMs);

    setUser(prev => {
      if (!prev) return null;
      const hoursToAdd = Number((minutes / 60).toFixed(2));
      const updated: User = {
        ...prev,
        stats: {
          ...prev.stats,
          hoursLearned: Number(((prev.stats.hoursLearned || 0) + hoursToAdd).toFixed(2))
        }
      };
      // Note: skip localStorage write for every single minute to improve speed
      return updated;
    });
  }, [lastActivityTimestamp]);


  const incrementBooksRead = useCallback(() => {
    setUser(prev => {
      if (!prev) return null;
      const updated: User = {
        ...prev,
        levelCoins: (prev.levelCoins || 0) + 1,
        stats: {
          ...prev.stats,
          booksRead: (prev.stats.booksRead || 0) + 1
        }
      };
      localStorage.setItem('levelmak_user', JSON.stringify(updated));
      setTimeout(() => addActivity('reading', 'Lecture Validée', 'Tu as ouvert un nouveau livre !'), 0);
      return updated;
    });
  }, [addActivity]);

  const incrementFlashcardsStudied = useCallback((amount: number) => {
    setUser(prev => {
      if (!prev) return null;
      const updated: User = {
        ...prev,
        stats: {
          ...prev.stats,
          flashcardsStudied: (prev.stats.flashcardsStudied || 0) + amount
        }
      };
      localStorage.setItem('levelmak_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const purchasePotion = useCallback((potionId: string): boolean => {
    if (!user) return false;
    const potion = POTIONS.find((p: any) => p.id === potionId);
    if (!potion || (user.levelCoins || 0) < potion.price) return false;

    const newConsumables = { ...(user.consumables || {}) };
    newConsumables[potionId] = (newConsumables[potionId] || 0) + 1;

    const updated: User = {
      ...user,
      levelCoins: user.levelCoins - potion.price,
      consumables: newConsumables
    };

    setUser(updated);
    localStorage.setItem('levelmak_user', JSON.stringify(updated));
    addActivity('badge', 'Achat Magique 🧪', `Tu as acheté : ${potion.name}`);
    return true;
  }, [user, addActivity]);

  const usePotion = useCallback((potionId: string) => {
    setUser(prev => {
      if (!prev || !prev.consumables || !prev.consumables[potionId]) return prev;
      const potion = POTIONS.find((p: any) => p.id === potionId);
      if (!potion) return prev;

      const newConsumables = { ...prev.consumables };
      newConsumables[potionId]--;
      if (newConsumables[potionId] <= 0) delete newConsumables[potionId];

      const newActiveEffects = { ...(prev.activeEffects || {}) };
      const now = Date.now();

      let message = `Utilisation de : ${potion.name}`;

      if (potionId === 'potion_double_xp') {
        newActiveEffects['double_xp'] = now + potion.duration;
        message = "Double XP activé pour 5 minutes ! 🔥";
      } else if (potionId === 'potion_fortune') {
        newActiveEffects['fortune'] = now + potion.duration;
        message = "Élixir de Fortune activé ! 🪙";
      } else if (potionId === 'potion_mystery') {
        const randomAvatarId = `onepiece_${Math.floor(Math.random() * 54) + 1}`;
        if (!prev.inventory.includes(randomAvatarId)) {
          prev.inventory.push(randomAvatarId);
          setTimeout(() => addActivity('badge' as any, 'Fiole Mystère ✨', `Félicitations ! Tu as débloqué un nouvel avatar rare.`), 0);
        } else {
          prev.levelCoins = (prev.levelCoins || 0) + 200;
          setTimeout(() => addActivity('badge' as any, 'Fiole Mystère ✨', `Tu avais déjà l'item, tu gagnes 200 LevelCoins en compensation !`), 0);
        }
      }

      const updatedUser: User = {
        ...prev,
        consumables: newConsumables,
        activeEffects: newActiveEffects
      };

      localStorage.setItem('levelmak_user', JSON.stringify(updatedUser));
      if (potionId !== 'potion_mystery') {
        setTimeout(() => addActivity('badge' as any, 'Magie Active ✨', message), 0);
      }
      return updatedUser;
    });
  }, [addActivity]);

  const rollDice = (): { result: number, reward: { type: 'item' | 'joker' | 'surprise' | 'super', value: any } } => {
    if (!user) throw new Error("User must be logged in to roll dice");

    const today = new Date().toISOString().split('T')[0];

    // Check if already rolled today
    if (user.lastDiceRoll === today) {
      throw new Error("Dé déjà lancé aujourd'hui ! Reviens demain.");
    }

    // Roll the dice (1-6)
    const result = Math.floor(Math.random() * 6) + 1;
    let reward: { type: 'item' | 'joker' | 'surprise' | 'super', value: any };

    // Define ultra-rare accessories pool
    const ultraRareAccessories = [
      `onepiece_${Math.floor(Math.random() * 54) + 1}`,
      `rare_avatar_${Math.floor(Math.random() * 20) + 1}`
    ];

    switch (result) {
      case 1: // Ultra-Rare Accessory
        const accessory = ultraRareAccessories[Math.floor(Math.random() * ultraRareAccessories.length)];
        reward = { type: 'item', value: { id: accessory, name: 'Accessoire Ultra-Rare' } };

        // Add to inventory if not already owned
        if (!user.inventory.includes(accessory)) {
          user.inventory.push(accessory);
        }
        addActivity('badge', '🎲 Dé de la Chance', 'Tu as gagné un accessoire ultra-rare !');
        addXp(50);
        break;

      case 2:
      case 3: // Joker (Fiole de Sauvetage)
        reward = { type: 'joker', value: { id: 'potion_skip', name: 'Fiole de Sauvetage' } };
        const newConsumables = { ...(user.consumables || {}) };
        newConsumables['potion_skip'] = (newConsumables['potion_skip'] || 0) + 1;
        user.consumables = newConsumables;
        addActivity('badge', '🎲 Dé de la Chance', 'Tu as gagné un Joker (Fiole de Sauvetage) !');
        addXp(30);
        break;

      case 4:
      case 5: // Surprise du Coach (Blague/Anecdote)
        reward = { type: 'surprise', value: { loading: true } };
        // The surprise content will be fetched later by the UI
        addActivity('badge', '🎲 Dé de la Chance', 'Le coach te prépare une surprise... 😄');
        addXp(20);
        break;

      case 6: // SUPER LOT (Triple combo)
        const superAccessory = ultraRareAccessories[Math.floor(Math.random() * ultraRareAccessories.length)];
        if (!user.inventory.includes(superAccessory)) {
          user.inventory.push(superAccessory);
        }

        const superConsumables = { ...(user.consumables || {}) };
        superConsumables['potion_skip'] = (superConsumables['potion_skip'] || 0) + 1;
        user.consumables = superConsumables;

        reward = {
          type: 'super',
          value: {
            accessory: superAccessory,
            joker: true,
            xp: 200,
            coins: 100
          }
        };

        addActivity('badge', '🎲 SUPER CHANCE !', 'JACKPOT ! Accessoire + Joker + XP + LevelCoins !');
        addXp(200);
        addLevelCoins(100);
        break;

      default:
        throw new Error("Invalid dice result");
    }

    // Update lastDiceRoll
    const updatedUser: User = {
      ...user,
      lastDiceRoll: today
    };

    setUser(updatedUser);
    localStorage.setItem('levelmak_user', JSON.stringify(updatedUser));

    return { result, reward };
  };

  const changePassword = async (oldPw: string, newPw: string) => {
    try {
      setLoading(true);
      await changeUserPassword(oldPw, newPw);
      addActivity('profile', 'Sécurité ✨', 'Le mot de passe a été mis à jour avec succès.');
    } catch (error: any) {
      console.error('Password change failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const saveStudyPlan = useCallback((plan: StudyPlan) => {
    if (!plan || !plan.tasks || !Array.isArray(plan.tasks)) {
      console.error("❌ Tentative de sauvegarde d'un plan d'étude invalide:", plan);
      return;
    }
    setStudyPlan(plan);
    localStorage.setItem('levelmak_study_plan', JSON.stringify(plan));
    addXp(30); // Récompense modérée pour la planification
    addActivity('study', 'Nouveau Plan d\'Étude', `Plan généré : ${plan.title}`);
  }, [addActivity, addXp]);

  const deleteStudyPlan = useCallback(() => {
    setStudyPlan(null);
    localStorage.removeItem('levelmak_study_plan');
  }, []);

  const toggleTaskCompletion = useCallback((taskId: string) => {
    setStudyPlan(prev => {
      if (!prev) return null;
      const updatedTasks = prev.tasks.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      const updatedPlan = { ...prev, tasks: updatedTasks };
      localStorage.setItem('levelmak_study_plan', JSON.stringify(updatedPlan));

      const task = updatedTasks.find(t => t.id === taskId);
      if (task?.completed) {
        addXp(15); // Récompense modérée pour compléter une tâche de révision
        addActivity('study', 'Tâche Complétée', `Révision de ${task.subject} terminée.`);
      }

      return updatedPlan;
    });
  }, [addActivity, addXp]);

  const trackStudyTime = useCallback((minutes: number, subject?: string) => {
    if (!user) return;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const newAnalytics: UserAnalytics = user.analytics || {
      studyTimeBySubject: {},
      studyTimeByDay: [],
      quizPerformance: [],
      weeklyGoals: { target: 120, achieved: 0 },
      examPredictions: []
    };

    // Update study time by day
    const dayEntries = [...(newAnalytics.studyTimeByDay || [])];
    const dayEntry = dayEntries.find(d => d.date === dateStr);
    if (dayEntry) {
      dayEntry.minutes += minutes;
    } else {
      dayEntries.push({ date: dateStr, minutes });
    }
    newAnalytics.studyTimeByDay = dayEntries;

    // Update study time by subject
    if (subject) {
      const subjectCaps = subject.toUpperCase();
      newAnalytics.studyTimeBySubject[subjectCaps] = (newAnalytics.studyTimeBySubject[subjectCaps] || 0) + minutes;
    }

    // Update weekly goals
    newAnalytics.weeklyGoals.achieved += minutes;

    updateProfile(user.name, user.phoneNumber || '', { analytics: newAnalytics });
    addXp(Math.floor(minutes / 2)); // 1 XP per 2 minutes studied
    
    // Manage continuous study time for Bubble Wrap
    const nowMs = Date.now();
    setContinuousStudyTime(prev => {
      const isIdle = (nowMs - lastActivityTimestamp) > 10 * 60 * 1000;
      const newTime = isIdle ? minutes : prev + minutes;
      if (newTime >= 30 && (isIdle || prev < 30)) {
        setShowBubbleWrap(true);
      }
      return newTime;
    });
    setLastActivityTimestamp(nowMs);
  }, [user, updateProfile, addXp, lastActivityTimestamp]);

  const updateQuizPerformance = useCallback((subject: string, score: number, total: number) => {
    if (!user) return;
    const rate = score / total;

    const newAnalytics: UserAnalytics = user.analytics || {
      studyTimeBySubject: {},
      studyTimeByDay: [],
      quizPerformance: [],
      weeklyGoals: { target: 120, achieved: 0 },
      examPredictions: []
    };

    const subjectCaps = subject.toUpperCase();
    const perfEntries = [...(newAnalytics.quizPerformance || [])];
    const perfEntry = perfEntries.find(p => p.subject === subjectCaps);
    if (perfEntry) {
      perfEntry.correctRate = (perfEntry.correctRate * perfEntry.totalAttempts + rate) / (perfEntry.totalAttempts + 1);
      perfEntry.totalAttempts += 1;
      perfEntry.lastScore = rate;
    } else {
      perfEntries.push({
        subject: subjectCaps,
        correctRate: rate,
        totalAttempts: 1,
        lastScore: rate
      });
    }
    newAnalytics.quizPerformance = perfEntries;

    updateProfile(user.name, user.phoneNumber || '', { analytics: newAnalytics });
  }, [user, updateProfile]);

  const addNotification = useCallback((type: AppNotification['type'], title: string, message: string) => {
    const newNotif = notificationService.createLocalNotification(type, title, message);
    setNotifications(prev => [newNotif, ...prev]);
    notificationService.send(title, { body: message });
    audioService.playNotification();
  }, []);

  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    let message = "Une erreur inattendue est survenue. L'équipe a été prévenue.";
    let title = "Oups !";

    if (error.status === 0 || error.message?.includes('Network')) {
      title = "Problème de Réseau";
      message = "Vérifie ta connexion internet pour continuer.";
    } else if (error.message?.includes('Gemini') || error.message?.includes('IA')) {
      title = "L'IA est timide";
      message = "Notre IA est un peu fatiguée, réessaie dans un petit instant.";
    } else if (error.status === 400 || error.status === 401 || error.message?.includes('invalid')) {
      title = "Erreur de Connexion";
      message = "Tes identifiants semblent incorrects.";
    }

    addNotification('error', title, message);
    HapticFeedback.error();
  }, [addNotification]);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateSRSMetadata = useCallback((id: string, type: 'flashcard' | 'quiz', rating: number) => {
    const q = rating;
    const now = new Date();

    if (type === 'flashcard') {
      setFlashcards(prev => {
        const card = prev.find(c => c.id === id);
        if (!card) return prev;

        let { interval, repetitions, easeFactor } = card;

        if (q >= 3) {
          if (repetitions === 0) {
            interval = 1;
          } else if (repetitions === 1) {
            interval = 6;
          } else {
            interval = Math.round(interval * easeFactor);
          }
          repetitions++;
        } else {
          repetitions = 0;
          interval = 1;
        }

        easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        if (easeFactor < 1.3) easeFactor = 1.3;

        const nextReviewDate = new Date(now);
        nextReviewDate.setDate(now.getDate() + interval);

        const updatedCard: Flashcard = {
          ...card,
          interval,
          repetitions,
          easeFactor,
          lastReviewed: now.toISOString(),
          nextReviewDate: nextReviewDate.toISOString()
        };

        const updatedCards = prev.map(c => c.id === id ? updatedCard : c);
        localStorage.setItem('levelmak_flashcards', JSON.stringify(updatedCards));
        return updatedCards;
      });
    } else if (type === 'quiz') {
      setUser(prev => {
        if (!prev || !prev.quizzes) return prev;
        const quiz = prev.quizzes.find(q => q.id === id);
        if (!quiz) return prev;

        let { interval = 0, repetitions = 0, easeFactor = 2.5 } = quiz;

        if (q >= 3) {
          if (repetitions === 0) {
            interval = 1;
          } else if (repetitions === 1) {
            interval = 6;
          } else {
            interval = Math.round(interval * easeFactor);
          }
          repetitions++;
        } else {
          repetitions = 0;
          interval = 1;
        }

        easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        if (easeFactor < 1.3) easeFactor = 1.3;

        const nextReviewDate = new Date(now);
        nextReviewDate.setDate(now.getDate() + interval);

        const updatedQuiz: Quiz = {
          ...quiz,
          interval,
          repetitions,
          easeFactor,
          lastReviewed: now.toISOString(),
          nextReviewDate: nextReviewDate.toISOString()
        };

        const updatedQuizzes = prev.quizzes.map(q => q.id === id ? updatedQuiz : q);
        const updatedUser = { ...prev, quizzes: updatedQuizzes };
        localStorage.setItem('levelmak_user', JSON.stringify(updatedUser));
        return updatedUser;
      });
    }
  }, []);



  const plantInGarden = useCallback((type: 'flower' | 'tree' | 'cactus' | 'bonsai' | 'lotus') => {
    setUser(prev => {
      if (!prev) return null;
      const now = new Date().toISOString();
      const currentGarden = prev.garden || { lastWatered: now, plants: [] };
      
      const newPlant: GardenPlant = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        type,
        plantedAt: now,
        lastWateredAt: now,
        growthStage: 2, // Start visible as a tiny tree/plant instead of a bean!
        state: 'healthy' as const
      };
      
      const updatedUser = {
        ...prev,
        garden: {
          ...currentGarden,
          plants: [...currentGarden.plants, newPlant]
        }
      };
      
      localStorage.setItem('levelmak_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const waterGarden = useCallback((plantId?: string, itemType: 'water_can' | 'fertilizer' = 'water_can'): boolean => {
    let success = false;
    setUser(prev => {
      if (!prev || !prev.garden) return prev;
      
      // Check if user has the item
      const currentCount = prev.consumables?.[itemType] || 0;
      if (currentCount <= 0) return prev;

      const updatedConsumables = { ...prev.consumables };
      updatedConsumables[itemType] = currentCount - 1;
      if (updatedConsumables[itemType] === 0) delete updatedConsumables[itemType];

      const now = new Date().toISOString();
      const updatedPlants = prev.garden.plants.map(p => {
        if (plantId && p.id !== plantId) return p;
        
        let newStage = p.growthStage;
        if (itemType === 'fertilizer' && p.growthStage < 4) {
          newStage = Math.min(4, p.growthStage + 1);
        } else if (itemType === 'water_can' && p.state !== 'healthy') {
          // Watering a non-healthy plant makes it healthy but doesn't necessarily grow it
          // Grow logic is handled by daily check or can be added here
        }

        return {
          ...p,
          state: 'healthy' as const,
          lastWateredAt: now,
          growthStage: newStage
        };
      });
      
      const updatedUser = {
        ...prev,
        consumables: updatedConsumables,
        garden: {
          lastWatered: now,
          plants: updatedPlants
        }
      };
      
      success = true;
      localStorage.setItem('levelmak_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
    return success;
  }, []);

  const updateLocation = useCallback((latitude: number, longitude: number, isPublic: boolean) => {
    // 1. Update local state immediately for UI responsiveness
    const locationData = {
        latitude,
        longitude,
        isPublic,
        lastUpdated: new Date().toISOString()
    };

    setUser(prev => {
      if (!prev) return null;
      const updatedUser = {
        ...prev,
        location: locationData,
        avatar: {
          ...(prev.avatar || {}),
          location: locationData
        }
      };
      
      // Save to localStorage immediately
      localStorage.setItem('levelmak_user', JSON.stringify(updatedUser));
      return updatedUser;
    });

    // 2. Debounce Supabase update to prevent LockManager timeouts (10s)
    if (locationUpdateTimer.current) clearTimeout(locationUpdateTimer.current);

    locationUpdateTimer.current = setTimeout(async () => {
        const currentUserStr = localStorage.getItem('levelmak_user');
        if (!currentUserStr) return;
        const currentUser = JSON.parse(currentUserStr);

        if (currentUser && currentUser.id && !currentUser.id.includes('anon')) {
            console.log("Syncing location to Supabase (Debounced)...");
            const { error } = await supabase.from('profiles').update({
                avatar_config: currentUser.avatar
            }).eq('id', currentUser.id);

            if (error) {
                if (error.message?.includes('LockManager')) {
                    console.warn('Supabase Lock contention, skipping this update. Will retry on next movement.');
                } else {
                    console.error('Error syncing location:', error);
                }
            }
        }
    }, 10000);
  }, []);

  useEffect(() => {
    if (!user || !user.garden) return;

    const lastWatered = new Date(user.garden.lastWatered);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastWatered.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 3) {
      const needsUpdate = user.garden.plants.some(p => p.state === 'healthy');
      if (needsUpdate) {
        setUser(prev => {
          if (!prev || !prev.garden) return prev;
          const updatedPlants = prev.garden.plants.map(p => ({
            ...p,
            state: (diffDays >= 7 ? 'dead' : 'yellowing') as 'healthy' | 'yellowing' | 'dead'
          }));
          const updatedUser = {
            ...prev,
            garden: { ...prev.garden, plants: updatedPlants }
          };
          localStorage.setItem('levelmak_user', JSON.stringify(updatedUser));
          return updatedUser;
        });
        
        addNotification(
          'info', 
          settings.language === 'fr' ? "Ton jardin a soif ! 🪴" : "Your garden is thirsty! 🪴",
          settings.language === 'fr' ? "Tes plantes commencent à jaunir. Arrose-les vite !" : "Your plants are starting to yellow. Water them quickly!"
        );
      }
    }
  }, [user?.id]); // Only run on login/mount


  // Automated Notifications Logic
  useEffect(() => {
    if (!user) return;
    const isFrench = settings.language === 'fr';

    // 1. Mission Reminder
    const uncompletedMissions = missions.filter(m => m.progress < 100);
    if (uncompletedMissions.length > 0 && settings.notifications.missions) {
      const lastCheck = localStorage.getItem('last_mission_notif');
      const today = new Date().toISOString().split('T')[0];

      if (lastCheck !== today) {
        addNotification(
          'mission_available',
          isFrench ? 'Nouvelles Missions !' : 'New Missions!',
          isFrench ? `Tu as ${uncompletedMissions.length} missions en attente. Gagne des XP !` : `You have ${uncompletedMissions.length} pending missions. Earn XP!`
        );
        localStorage.setItem('last_mission_notif', today);
      }
    }

    // 2. Daily Streak Reminder (Late in the day)
    const checkStreakReminder = () => {
      const now = new Date();
      const hour = now.getHours();
      const lastLogin = user.streak?.lastLogin ? new Date(user.streak.lastLogin) : null;
      const today = now.toISOString().split('T')[0];
      const loggedToday = lastLogin && lastLogin.toISOString().split('T')[0] === today;

      if (!loggedToday && hour >= 18) { // 6 PM
        const lastStreakNotif = localStorage.getItem('last_streak_notif');
        if (lastStreakNotif !== today) {
          addNotification(
            'streak_risk',
            isFrench ? "Ta série est en danger !" : "Your streak is in danger!",
            isFrench ? "Connecte-toi vite pour ne pas perdre ta série de jours." : "Log in quickly so you don't lose your day streak."
          );
          localStorage.setItem('last_streak_notif', today);
        }
      }
    };

    const interval = setInterval(checkStreakReminder, 3600000); // Check every hour
    checkStreakReminder();

    return () => clearInterval(interval);
  }, [user, missions, settings.notifications, settings.language, addNotification]);

  // Online Status Logic
  const syncOfflineData = useCallback(async () => {
    if (!isOnline || !user || user.id === 'guest') return;

    console.log('🔄 Starting background sync...');
    // Sync XP and stats to Supabase
    await syncUserWithSupabase(user);

    // Additional sync logic for local flashcard/quiz updates could go here
    addNotification('info', 'Synchronisation terminée', 'Vos progrès ont été synchronisés avec le cloud.');
    HapticFeedback.selection();
  }, [isOnline, user, syncUserWithSupabase, addNotification]);

  const downloadCourse = useCallback(async (courseId: string) => {
    const quiz = quizzes.find(q => q.id === courseId);
    if (!quiz) return;

    try {
      const pack: OfflinePack = {
        courseId: quiz.id,
        title: quiz.title,
        summary: quiz.summary,
        keyPoints: quiz.keyPoints || [],
        definitions: quiz.definitions || [],
        faq: [], // Could be populated if available
        quiz: quiz,
        timestamp: new Date().toISOString()
      };

      await offlineService.savePack(pack);
      setOfflinePacks(prev => [...new Set([...prev, courseId])]);
      addNotification('success', 'Téléchargement réussi', `"${quiz.title}" est maintenant disponible hors-ligne.`);
      HapticFeedback.success();
    } catch (error) {
      handleError(error, 'downloadCourse');
    }
  }, [quizzes, addNotification]);

  // Online Status Logic
  useEffect(() => {
    const initNetwork = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);

      const list = await offlineService.getOfflineList();
      setOfflinePacks(list.map(p => p.id));
    };

    initNetwork();

    const networkListener = Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected);
      if (status.connected) {
        // Trigger background sync when coming back online
        syncOfflineData();
      }
    });

    return () => {
      networkListener.then(l => l.remove());
    };
  }, [syncOfflineData]);

  // Translation Helper
  const t = useCallback((path: string): string => {
    const keys = path.split('.');
    let current: any = translations[settings.language as Language] || translations.fr;

    for (const key of keys) {
      if (current[key] === undefined) {
        // Fallback to French if translation is missing
        current = translations.fr;
        for (const k of keys) {
          if (current[k] === undefined) return path;
          current = current[k];
        }
        return current as string;
      };
      current = current[key];
    }
    return current as string;
  }, [settings.language]);

  const dir = settings.language === 'ar' ? 'rtl' : 'ltr';

  // Apply direction and font size to body
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = settings.language;

    // Apply font size
    const fontSizes = ['font-size-xs', 'font-size-sm', 'font-size-base', 'font-size-lg', 'font-size-xl'];
    document.documentElement.classList.remove(...fontSizes);
    if (settings.fontSize) {
      document.documentElement.classList.add(`font-size-${settings.fontSize}`);
    }
  }, [dir, settings.language, settings.fontSize]);

  const resolveBattle = useCallback((winnerId: string, isDraw: boolean = false) => {
    setUser(prev => {
      if (!prev) return null;
      let coinDelta = 0;
      let xpDelta = 20; // XP de participation

      if (!isDraw) {
        if (prev.id === winnerId) {
          coinDelta = 10; // Gagner: +10 LevelCoins
          xpDelta = 50;  // Bonus XP
        } else {
          coinDelta = -10; // Perdre: -10 LevelCoins
        }
      }

      const updated: User = {
        ...prev,
        levelCoins: Math.max(0, (prev.levelCoins || 0) + coinDelta),
        totalXp: (prev.totalXp || 0) + xpDelta,
        xp: (prev.xp || 0) + xpDelta
      };
      localStorage.setItem('levelmak_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const xpPercentage = useMemo(() => {
    if (!user) return 0;
    const xpNeeded = getXpForNextLevel(user.avatar?.currentLevel || 1);
    const xpForCurrentLevel = user.avatar?.currentLevel === 1 ? 0 : getXpForNextLevel((user.avatar?.currentLevel || 1) - 1);
    const currentLevelXp = user.xp - xpForCurrentLevel;
    const xpToNextLevel = xpNeeded - xpForCurrentLevel;
    return Math.min(100, Math.max(0, (currentLevelXp / xpToNextLevel) * 100));
  }, [user?.xp, user?.avatar?.currentLevel]);

  const contextValue = useMemo(() => ({
    user, quizzes, stories, missions, flashcards, decks, books, studyPlan, loading,
    login, registerWithPhone, loginWithPhone, registerWithEmail, loginWithEmail, loginWithGoogle, logout, addXp, saveQuiz, saveStory, deleteStory, saveBook,
    saveFlashcardDeck, saveFlashcard, deleteFlashcard, deleteFlashcardDeck, completeMission,
    purchaseItem, equipItem, updateProfileImage, updateProfile, deleteBook, updateSettings, addActivity,
    saveStudyPlan, deleteStudyPlan, toggleTaskCompletion,
    trackStudyTime, updateQuizPerformance,
    settings,
    dailyVocab,
    dailyMotivation,
    addLevelCoins,
    betLevelCoins,
    purchasePotion,
    usePotion,
    rollDice,
    changePassword,
    notifications,
    addNotification,
    markNotificationAsRead,
    clearNotifications,
    isOnline,
    t,
    dir,
    grantBadge,
    trackTime,
    incrementBooksRead,
    incrementFlashcardsStudied,
    updateSRSMetadata,
    downloadCourse,
    offlinePacks,
    plantInGarden,
    waterGarden,
    continuousStudyTime,
    showBubbleWrap,
    setShowBubbleWrap,
    updateLocation,
    resolveBattle,
    coachSessions,
    saveCoachMessage,
    createCoachSession,
    deleteCoachSession,
    aiLabHistory,
    saveAILabSession,
    deleteAILabSession
  }), [
    user, quizzes, stories, missions, flashcards, decks, books, studyPlan, loading,
    login, registerWithPhone, loginWithPhone, registerWithEmail, loginWithEmail, loginWithGoogle, logout, addXp, saveQuiz, saveStory, deleteStory, saveBook,
    saveFlashcardDeck, saveFlashcard, deleteFlashcard, deleteFlashcardDeck, completeMission,
    purchaseItem, equipItem, updateProfileImage, updateProfile, deleteBook, updateSettings, addActivity,
    trackTime, grantBadge, incrementBooksRead, incrementFlashcardsStudied, updateSRSMetadata,
    saveStudyPlan, deleteStudyPlan, toggleTaskCompletion,
    trackStudyTime, updateQuizPerformance,
    settings,
    dailyVocab,
    dailyMotivation,
    addLevelCoins,
    betLevelCoins,
    purchasePotion,
    usePotion,
    rollDice,
    notifications, addNotification, markNotificationAsRead, clearNotifications,
    isOnline,
    t,
    dir,
    downloadCourse,
    offlinePacks,
    plantInGarden,
    waterGarden,
    continuousStudyTime,
    showBubbleWrap,
    setShowBubbleWrap,
    updateLocation,
    resolveBattle,
    coachSessions,
    saveCoachMessage,
    createCoachSession,
    deleteCoachSession,
    aiLabHistory,
    saveAILabSession,
    deleteAILabSession
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useStore must be used within AppProvider');
  return context;
};
