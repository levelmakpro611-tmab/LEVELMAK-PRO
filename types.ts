
export enum SchoolLevel {
  PRIMARY = 'Primaire',
  MIDDLE = 'Collège',
  HIGH = 'Lycée',
  UNIVERSITY = 'Université'
}

export interface Activity {
  id: string;
  type: 'quiz' | 'post' | 'comment' | 'profile' | 'badge' | 'mission' | 'study' | 'reading' | 'writing';
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phoneNumber?: string;
  gender?: 'HOMME' | 'FEMME';
  ageRange?: '15-18' | '19-23' | '24+';
  status?: 'active' | 'suspended' | 'blocked';
  level: SchoolLevel;
  avatar: AvatarConfig;
  analytics?: UserAnalytics;
  xp: number;
  totalXp: number;
  rank: number;
  stats: {
    quizzesCompleted: number;
    hoursLearned: number;
    booksRead: number;
    storiesWritten: number;
    flashcardsStudied: number;
  };
  badges: string[];
  favorites: string[];
  friends: string[];
  levelCoins: number;
  inventory: string[];
  onboardingCompleted?: boolean;
  streak: {
    current: number;
    lastLogin?: string;
  };
  lastDiceRoll?: string;
  activities?: Activity[];
  progression?: { date: string; xp: number }[];
  seenWords?: string[];
  seenMotivations?: string[];
  consumables?: { [id: string]: number };
  activeEffects?: { [type: string]: number };
  quizzes?: Quiz[];
  stories?: Story[];
}

export interface AvatarConfig {
  baseColor: string;
  accessory: string;
  aura: string;
  currentLevel: number;
  image?: string; // For high-quality real avatars
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz extends Partial<SRSData> {
  id: string;
  title: string;
  subject: string;
  questions: QuizQuestion[];
  summary: string;
  keyPoints?: string[]; // Ajout des points clés
  definitions?: { term: string, definition: string }[]; // Ajout des définitions
  createdAt: string;
}

export interface SRSData {
  lastReviewed?: string;
  nextReviewDate?: string;
  interval: number; // in days
  easeFactor: number;
  repetitions: number;
}

export interface Flashcard extends SRSData {
  id: string;
  front: string;
  back: string;
  deckId: string;
  tags?: string[];
}

export interface FlashcardDeck {
  id: string;
  title: string;
  subject: string;
  cardCount: number;
  lastStudied?: string;
  createdAt: string;
}

export interface OfflinePack {
  courseId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  definitions: { term: string; definition: string }[];
  faq: { question: string; answer: string }[];
  quiz: Quiz;
  timestamp: string;
}

export interface ShopItem {
  id: string;
  firestoreId?: string;
  name: string;
  description: string;
  price: number;
  category: 'avatar' | 'badge' | 'theme' | 'potion';
  image?: string;
  color?: string;
  icon?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  category: string;
  content?: string;
  uri?: string;
  fallbacks?: {
    [key: string]: string;
  };
}

export interface Story {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category: string; // Added category
  likes: number;
  isPublic: boolean;
  createdAt: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  completed: boolean;
  type: 'quiz' | 'reading' | 'writing' | 'daily';
}

export interface VocabWord {
  word: string;
  explanation: string;
  usage: string;
}


export interface DailyVocabulary {
  date: string;
  words: VocabWord[];
}

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  description: string;
  duration: string;
  priority: 'high' | 'medium' | 'low';
  date: string;
  completed?: boolean;
}

export interface StudyPlan {
  title: string;
  startDate: string;
  endDate: string;
  tasks: StudyTask[];
  extractedTopics?: string[];
}

export interface UserAnalytics {
  studyTimeBySubject: { [subject: string]: number }; // in minutes
  studyTimeByDay: { date: string; minutes: number }[];
  quizPerformance: {
    subject: string;
    correctRate: number;
    totalAttempts: number;
    lastScore: number;
  }[];
  weeklyGoals: {
    target: number; // minutes
    achieved: number;
  };
  examPredictions: {
    subject: string;
    predictedScore: number;
    confidence: number;
  }[];
}

// ========== ADMIN TYPES ==========

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  newUsersYear: number;
  quizzesGenerated: number;
  quizzesToday: number;
  flashcardsCreated: number;
  flashcardsToday: number;
  storiesWritten: number;
  storiesToday: number;
  booksRead: number;
  booksToday: number;
  totalLearningHours: number;
  averageEngagementRate: number;
}

export interface UserComment {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  content: string;
  rating: number; // 1-5 stars
  category: 'quiz' | 'flashcards' | 'library' | 'coach' | 'general';
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  adminResponse?: string;
  adminResponseDate?: string;
}

export interface PlatformRating {
  id: string;
  userId: string;
  userName: string;
  overall: number; // 1-5
  features: {
    quiz: number;
    coach: number;
    flashcards: number;
    library: number;
    interface: number;
    offline: number;
  };
  timestamp: string;
  comment?: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: 'login' | 'logout' | 'user_delete' | 'user_suspend' | 'user_block' | 'comment_approve' | 'comment_reject' | 'comment_delete' | 'export_report' | 'user_activity';
  timestamp: string;
  details: any;
  targetUserId?: string;
}

export interface AdminUserAnalytics {
  userId: string;
  userName: string;
  email: string;
  phoneNumber?: string;
  ageRange?: User['ageRange'];
  gender?: User['gender'];
  education?: string;
  isEmployed?: boolean;
  country?: string;
  registrationDate: string;
  lastActive: string;
  totalActivityMinutes: number;
  status: 'active' | 'suspended' | 'blocked';
  level: number;
  xp: number;
  quizzesCompleted: number;
  flashcardsStudied: number;
  storiesWritten: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  type: 'quiz' | 'flashcard' | 'story' | 'book' | 'coach';
  action: string;
  timestamp: string;
  details?: any;
}
export interface SecurityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details?: any;
}

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  type: 'user' | 'content' | 'other';
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  timestamp: string;
  adminNote?: string;
  resolvedAt?: string;
}

