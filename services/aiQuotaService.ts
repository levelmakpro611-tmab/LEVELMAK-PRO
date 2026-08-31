import { User, SUBSCRIPTION_QUOTAS, isElementaryOrMiddleSchool, AIQuotaLimits } from '../types';

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  messagesUsed: number;
  photosUsed: number;
  quizzesUsed: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  message?: string;
}

/**
  Gets current date string formatted as YYYY-MM-DD
 */
const getTodayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * ✅ FIX 12: Generate an obfuscated storage key to make client-side manipulation harder.
 * The key includes the user ID mixed with a static salt so it's not guessable.
 * Note: This is NOT a security guarantee (client-side quotas can always be bypassed
 * by determined users). True enforcement requires server-side validation in the Edge Function.
 */
const getQuotaStorageKey = (userId: string): string => {
  // Simple obfuscation: XOR-hash the userId chars with a salt
  const salt = 'lmk_q_v2';
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return `_lmk_${Math.abs(hash).toString(36)}_${salt}`;
};

/**
 * Gets daily usage for a user. Resets automatically at 00:00.
 */
export const getDailyUsage = (userId: string): DailyUsage => {
  const today = getTodayKey();
  const storageKey = getQuotaStorageKey(userId);
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    try {
      const parsed: DailyUsage = JSON.parse(stored);
      if (parsed.date === today) {
        return parsed;
      }
    } catch (e) {
      console.warn('Error parsing daily usage storage', e);
    }
  }

  // Initial / New day reset
  const fresh: DailyUsage = {
    date: today,
    messagesUsed: 0,
    photosUsed: 0,
    quizzesUsed: 0
  };
  localStorage.setItem(storageKey, JSON.stringify(fresh));
  return fresh;
};

/**
 * Saves updated daily usage to localStorage
 */
const saveDailyUsage = (userId: string, usage: DailyUsage): void => {
  const storageKey = getQuotaStorageKey(userId);
  localStorage.setItem(storageKey, JSON.stringify(usage));
};

/**
 * Gets user's active quota limits taking into account subscription tier and admin boosts
 */
export const getUserQuotaLimits = (user: User | null): AIQuotaLimits => {
  if (!user) {
    return SUBSCRIPTION_QUOTAS['free'];
  }

  // Check tier
  const tier = user.subscriptionTier || (user.is_premium ? 'mensuel' : 'free');
  const baseQuotas = SUBSCRIPTION_QUOTAS[tier] || SUBSCRIPTION_QUOTAS['free'];

  // Admin boost if present in user stats
  const adminMessageBoost = user.stats?.adminMessageBoost || 0;

  return {
    ...baseQuotas,
    dailyMessages: baseQuotas.dailyMessages + adminMessageBoost
  };
};

/**
 * Checks if user can make an AI message request today
 */
export const checkMessageQuota = (user: User | null): QuotaCheckResult => {
  if (!user) {
    return { allowed: false, used: 0, limit: 0, remaining: 0, message: 'Utilisateur non connecté.' };
  }

  const limits = getUserQuotaLimits(user);
  const usage = getDailyUsage(user.id);

  const remaining = Math.max(0, limits.dailyMessages - usage.messagesUsed);
  const allowed = usage.messagesUsed < limits.dailyMessages;

  return {
    allowed,
    used: usage.messagesUsed,
    limit: limits.dailyMessages,
    remaining,
    message: allowed ? undefined : `Quota quotidien atteint (${usage.messagesUsed}/${limits.dailyMessages} messages). Réinitialisation à minuit (00h00) !`
  };
};

/**
 * Increments user's message quota usage by 1
 */
export const incrementMessageUsage = (user: User | null): void => {
  if (!user) return;
  const usage = getDailyUsage(user.id);
  usage.messagesUsed += 1;
  saveDailyUsage(user.id, usage);
};

/**
 * Checks if user can analyze/scan a photo today
 */
export const checkPhotoQuota = (user: User | null): QuotaCheckResult => {
  if (!user) {
    return { allowed: false, used: 0, limit: 0, remaining: 0, message: 'Utilisateur non connecté.' };
  }

  const limits = getUserQuotaLimits(user);
  const usage = getDailyUsage(user.id);

  const remaining = Math.max(0, limits.dailyPhotos - usage.photosUsed);
  const allowed = usage.photosUsed < limits.dailyPhotos;

  return {
    allowed,
    used: usage.photosUsed,
    limit: limits.dailyPhotos,
    remaining,
    message: allowed ? undefined : `Quota quotidien de photos/scans atteint (${usage.photosUsed}/${limits.dailyPhotos}).`
  };
};

/**
 * Increments user's photo quota usage by 1
 */
export const incrementPhotoUsage = (user: User | null): void => {
  if (!user) return;
  const usage = getDailyUsage(user.id);
  usage.photosUsed += 1;
  saveDailyUsage(user.id, usage);
};

/**
 * Checks if user can generate a quiz today
 */
export const checkQuizQuota = (user: User | null): QuotaCheckResult => {
  if (!user) {
    return { allowed: false, used: 0, limit: 0, remaining: 0, message: 'Utilisateur non connecté.' };
  }

  const limits = getUserQuotaLimits(user);
  const usage = getDailyUsage(user.id);

  const remaining = limits.dailyQuizzes === 999 ? 999 : Math.max(0, limits.dailyQuizzes - usage.quizzesUsed);
  const allowed = limits.dailyQuizzes === 999 || usage.quizzesUsed < limits.dailyQuizzes;

  return {
    allowed,
    used: usage.quizzesUsed,
    limit: limits.dailyQuizzes,
    remaining,
    message: allowed ? undefined : `Quota quotidien de quiz atteint (${usage.quizzesUsed}/${limits.dailyQuizzes}).`
  };
};

/**
 * Increments user's quiz quota usage by 1
 */
export const incrementQuizUsage = (user: User | null): void => {
  if (!user) return;
  const usage = getDailyUsage(user.id);
  usage.quizzesUsed += 1;
  saveDailyUsage(user.id, usage);
};

/**
 * Feature visibility matrix based on student's school grade class
 */
export const isFeatureAllowedForGrade = (
  feature: 'feynman' | 'summarizer' | 'timeMachine' | 'aiCoach' | 'quizzes',
  gradeClass?: string
): boolean => {
  if (!gradeClass) return true;

  const isElementaryOrMiddle = isElementaryOrMiddleSchool(gradeClass);

  if (isElementaryOrMiddle) {
    // 1ère à 9ème année:
    // Feynman IS ALLOWED (user required: "Du côté méthode Feynman, je veux que tu mettes ça visible pour la 1ère à 9ème année aussi... ça va les permettre de s'améliorer")
    if (feature === 'feynman') return true;
    // Summarizer & Time Machine are HIDDEN / DISABLED for 1st-9th graders
    if (feature === 'summarizer' || feature === 'timeMachine') return false;
    return true;
  }

  // 10ème à Terminale & Université: ALL features allowed
  return true;
};
