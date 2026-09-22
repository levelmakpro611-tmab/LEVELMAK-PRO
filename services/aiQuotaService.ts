import { User, SUBSCRIPTION_QUOTAS, isElementaryOrMiddleSchool, AIQuotaLimits, SubscriptionTier } from '../types';

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
 * Checks if user has an active, valid premium subscription
 */
export const isUserPremiumActive = (user: User | null): boolean => {
  if (!user) return false;
  return Boolean(user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > Date.now());
};

const getFreeLifetimeKey = (userId: string): string => `_lmk_free_lifetime_msgs_${userId}`;

export const getFreeLifetimeMessagesUsed = (userId: string): number => {
  try {
    const val = localStorage.getItem(getFreeLifetimeKey(userId));
    return val ? Math.max(0, parseInt(val, 10) || 0) : 0;
  } catch (_) {
    return 0;
  }
};

export const setFreeLifetimeMessagesUsed = (userId: string, count: number): void => {
  try {
    localStorage.setItem(getFreeLifetimeKey(userId), String(count));
  } catch (_) {}
};

// Free Quizzes & Flashcards lifetime tracking
const getFreeLifetimeQuizzesKey = (userId: string): string => `_lmk_free_lifetime_quizzes_${userId}`;
export const getFreeLifetimeQuizzesUsed = (userId: string): number => {
  try {
    const val = localStorage.getItem(getFreeLifetimeQuizzesKey(userId));
    return val ? Math.max(0, parseInt(val, 10) || 0) : 0;
  } catch (_) {
    return 0;
  }
};

const getFreeLifetimeFlashcardsKey = (userId: string): string => `_lmk_free_lifetime_flashcards_${userId}`;
export const getFreeLifetimeFlashcardsUsed = (userId: string): number => {
  try {
    const val = localStorage.getItem(getFreeLifetimeFlashcardsKey(userId));
    return val ? Math.max(0, parseInt(val, 10) || 0) : 0;
  } catch (_) {
    return 0;
  }
};

/**
 * Gets user's active quota limits taking into account subscription tier and admin boosts
 */
export const getUserQuotaLimits = (user: User | null): AIQuotaLimits => {
  if (!user || !isUserPremiumActive(user)) {
    return SUBSCRIPTION_QUOTAS['free'];
  }

  // Normalize tier name
  let rawTier = (user.subscriptionTier || 'mensuel').toLowerCase();
  let tier: SubscriptionTier = 'mensuel';
  if (rawTier === 'hebdo' || rawTier === 'weekly') tier = 'hebdo';
  else if (rawTier === 'annuel' || rawTier === 'annual') tier = 'annuel';
  else tier = 'mensuel';

  const baseQuotas = SUBSCRIPTION_QUOTAS[tier] || SUBSCRIPTION_QUOTAS['mensuel'];
  const adminMessageBoost = user.stats?.adminMessageBoost || 0;

  return {
    ...baseQuotas,
    dailyMessages: baseQuotas.dailyMessages + adminMessageBoost
  };
};

/**
 * Checks if user can make an AI message request (Coach IA, Savants TimeMachine, Feynman Lab)
 */
export const checkMessageQuota = (user: User | null): QuotaCheckResult => {
  if (!user) {
    const guestKey = '_lmk_guest_lifetime_msgs';
    const guestUsed = parseInt(localStorage.getItem(guestKey) || '0', 10);
    const limit = 10;
    const remaining = Math.max(0, limit - guestUsed);
    const allowed = guestUsed < limit;
    return {
      allowed,
      used: guestUsed,
      limit,
      remaining,
      message: allowed ? undefined : "⚠️ Vous avez épuisé vos 10 messages d'essai gratuits. Abonnez-vous à un forfait PRO pour continuer à échanger avec le Coach IA et les Savants !"
    };
  }

  const isPremium = isUserPremiumActive(user);

  if (!isPremium) {
    // Mode Gratuit : strictement 10 messages au total (à vie, non renouvelable à minuit)
    const freeUsed = getFreeLifetimeMessagesUsed(user.id);
    const limit = 10;
    const remaining = Math.max(0, limit - freeUsed);
    const allowed = freeUsed < limit;

    return {
      allowed,
      used: freeUsed,
      limit,
      remaining,
      message: allowed ? undefined : "⚠️ Vous avez épuisé vos 10 messages d'essai gratuits. Abonnez-vous à un forfait PRO pour continuer à échanger avec le Coach IA et les Savants !"
    };
  }

  // Mode Abonné : Quotas quotidiens renouvelés à 00h00
  const limits = getUserQuotaLimits(user);
  const usage = getDailyUsage(user.id);

  const remaining = Math.max(0, limits.dailyMessages - usage.messagesUsed);
  const allowed = usage.messagesUsed < limits.dailyMessages;

  return {
    allowed,
    used: usage.messagesUsed,
    limit: limits.dailyMessages,
    remaining,
    message: allowed ? undefined : `⚠️ Quota quotidien atteint (${usage.messagesUsed}/${limits.dailyMessages} messages). Votre quota se recharge cette nuit à minuit (00h00) !`
  };
};

/**
 * Increments user's message quota usage by 1 (shared across all AI chats)
 */
export const incrementMessageUsage = (user: User | null): void => {
  if (!user) {
    const guestKey = '_lmk_guest_lifetime_msgs';
    const guestUsed = parseInt(localStorage.getItem(guestKey) || '0', 10);
    localStorage.setItem(guestKey, String(guestUsed + 1));
    return;
  }

  const isPremium = isUserPremiumActive(user);
  if (!isPremium) {
    const current = getFreeLifetimeMessagesUsed(user.id);
    setFreeLifetimeMessagesUsed(user.id, current + 1);
  } else {
    const usage = getDailyUsage(user.id);
    usage.messagesUsed += 1;
    saveDailyUsage(user.id, usage);
  }
};

/**
 * Checks if user can analyze/scan a photo today
 */
export const checkPhotoQuota = (user: User | null): QuotaCheckResult => {
  if (!user) {
    return { allowed: false, used: 0, limit: 0, remaining: 0, message: 'Utilisateur non connecté.' };
  }

  const isPremium = isUserPremiumActive(user);
  const limits = getUserQuotaLimits(user);
  const usage = getDailyUsage(user.id);

  const limit = isPremium ? limits.dailyPhotos : 1;
  const remaining = Math.max(0, limit - usage.photosUsed);
  const allowed = usage.photosUsed < limit;

  return {
    allowed,
    used: usage.photosUsed,
    limit,
    remaining,
    message: allowed ? undefined : (isPremium 
      ? `⚠️ Quota quotidien de photos/scans atteint (${usage.photosUsed}/${limit}). Recharge cette nuit à 00h00 !`
      : `⚠️ Limite gratuite de 1 photo atteinte. Passez à un forfait PRO pour débloquer les scans quotidiens !`)
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
 * Checks if user can generate or play a quiz (free: max 5 lifetime, premium: unlimited)
 */
export const checkQuizQuota = (user: User | null): QuotaCheckResult => {
  if (!user) {
    return { allowed: false, used: 0, limit: 0, remaining: 0, message: 'Utilisateur non connecté.' };
  }

  const isPremium = isUserPremiumActive(user);
  if (!isPremium) {
    const used = getFreeLifetimeQuizzesUsed(user.id);
    const limit = 5;
    const remaining = Math.max(0, limit - used);
    const allowed = used < limit;
    return {
      allowed,
      used,
      limit,
      remaining,
      message: allowed ? undefined : "⚠️ Vous avez atteint la limite de 5 quiz gratuits. Passez au forfait PRO pour débloquer les quiz illimités !"
    };
  }

  return { allowed: true, used: 0, limit: 999, remaining: 999 };
};

/**
 * Checks if user can create a flashcard (free: max 5 lifetime, premium: unlimited)
 */
export const checkFlashcardQuota = (user: User | null): QuotaCheckResult => {
  if (!user) {
    return { allowed: false, used: 0, limit: 0, remaining: 0, message: 'Utilisateur non connecté.' };
  }

  const isPremium = isUserPremiumActive(user);
  if (!isPremium) {
    const used = getFreeLifetimeFlashcardsUsed(user.id);
    const limit = 5;
    const remaining = Math.max(0, limit - used);
    const allowed = used < limit;
    return {
      allowed,
      used,
      limit,
      remaining,
      message: allowed ? undefined : "⚠️ Vous avez atteint la limite de 5 flashcards gratuites. Passez au forfait PRO pour créer des flashcards sans limites !"
    };
  }

  return { allowed: true, used: 0, limit: 999, remaining: 999 };
};

/**
 * Increments user's quiz quota usage by 1
 */
export const incrementQuizUsage = (user: User | null): void => {
  if (!user) return;
  const isPremium = isUserPremiumActive(user);
  if (!isPremium) {
    const current = getFreeLifetimeQuizzesUsed(user.id);
    try {
      localStorage.setItem(getFreeLifetimeQuizzesKey(user.id), String(current + 1));
    } catch (_) {}
  } else {
    const usage = getDailyUsage(user.id);
    usage.quizzesUsed += 1;
    saveDailyUsage(user.id, usage);
  }
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
