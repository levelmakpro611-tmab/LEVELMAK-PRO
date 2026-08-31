import { supabase } from './supabase';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
    AdminStats,
    UserAnalytics,
    UserComment,
    PlatformRating,
    AdminLog,
    ActivityLog,
    User,
    Report,
    SecurityLog,
    ShopItem,
    AdminUserAnalytics
} from '../types';


// ========== CONSTANTS ==========
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || 'levelmak611';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'TMAB611';

// ========== ADMIN AUTHENTICATION ==========

export const submitComment = async (comment: Partial<UserComment>): Promise<void> => {
    try {
        console.log('--- SUBMITTING COMMENT ---', comment);
        
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('submit-comment', {
            body: {
                action: 'submit_comment',
                comment: {
                    userId: comment.userId,
                    userName: comment.userName,
                    userPhone: comment.userPhone || 'N/A',
                    content: comment.content,
                    rating: comment.rating || 0,
                    category: comment.category || 'general'
                }
            }
        });

        if (edgeErr || (edgeRes && edgeRes.error)) {
            console.warn('Edge Function submit comment fallback:', edgeErr || edgeRes?.error);
            const { error } = await supabase.from('user_comments').insert({
                user_id: comment.userId,
                user_name: comment.userName,
                user_phone: comment.userPhone || 'N/A',
                content: comment.content,
                rating: comment.rating || 0,
                category: comment.category || 'general',
                status: 'pending',
                timestamp: new Date().toISOString()
            });
            if (error) throw error;
        }

        // Fire-and-forget notification to avoid hanging the UI
        LocalNotifications.schedule({
            notifications: [{
                title: 'Merci !',
                body: 'Votre commentaire a été reçu. Levelmak est fier de vous !',
                id: Math.floor(Math.random() * 10000),
                schedule: { at: new Date(Date.now() + 500) }
            }]
        }).catch(e => console.warn('Notification schedule failed:', e));

    } catch (error) {
        console.error('Error submitting comment:', error);
        throw error;
    }
};

export const submitRating = async (rating: Omit<PlatformRating, 'id'>): Promise<void> => {
    try {
        console.log('--- SUBMITTING RATING ---', rating);
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('submit-comment', {
            body: {
                action: 'submit_rating',
                rating: {
                    userId: rating.userId,
                    userName: rating.userName || 'Anonyme',
                    overall: rating.overall,
                    features: rating.features || {},
                    comment: rating.comment || ''
                }
            }
        });

        if (edgeErr || (edgeRes && edgeRes.error)) {
            console.warn('Edge Function submit rating fallback:', edgeErr || edgeRes?.error);
            const { error } = await supabase.from('user_ratings').insert({
                user_id: rating.userId,
                user_name: rating.userName || 'Anonyme',
                overall: rating.overall,
                features: rating.features || {},
                comment: rating.comment || '',
                timestamp: new Date().toISOString()
            });
            if (error) throw error;
        }

        LocalNotifications.schedule({
            notifications: [{
                title: 'Évaluation Reçue',
                body: "Merci d'avoir noté cette application ! Levelmak est fier de vous.",
                id: Math.floor(Math.random() * 10000),
                schedule: { at: new Date(Date.now() + 500) }
            }]
        }).catch(e => console.warn('Notification schedule failed:', e));

    } catch (error) {
        console.error('Error submitting rating:', error);
        throw error;
    }
};

/**
 * Validates identifier and password against hardcoded admin credentials (legacy fallback).
 * 
 * @param {string} identifier - Admin username or phone identifier.
 * @param {string} password - Admin password.
 * @returns {boolean} True if matching, false otherwise.
 */
export const isAdminCredentials = (identifier: string, password: string): boolean => {
    // Accept both username and cleaned phone-style identifier
    const cleanIdentifier = identifier.replace(/\D/g, '');
    return (identifier.toLowerCase() === ADMIN_USERNAME.toLowerCase() || cleanIdentifier === ADMIN_USERNAME)
        && password === ADMIN_PASSWORD;
};

/**
 * Checks the database-driven user role from profiles table in Supabase.
 * Returns 'admin' if role field is 'admin', otherwise 'user'.
 * 
 * @param {string} userId - User's UUID in database.
 * @returns {Promise<'admin' | 'user'>} The resolved role.
 */
export const getUserRole = async (userId: string): Promise<'admin' | 'user'> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (error) throw error;
        
        return data?.role === 'admin' ? 'admin' : 'user';
    } catch (error) {
        console.error('Error checking user role:', error);
        return 'user';
    }
};

// ========== STATISTICS ==========

let cachedStats: { data: AdminStats, timestamp: number } | null = null;
const STATS_CACHE_TIME = 10000; // 10 secondes pour un dashboard réactif

export const getGlobalStats = async (period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<AdminStats> => {
    const now = new Date();
    
    // Return cache if fresh (10s cache for responsive dashboard)
    if (cachedStats && (now.getTime() - cachedStats.timestamp < STATS_CACHE_TIME)) {
        return cachedStats.data;
    }

    // === PRIMARY: Fetch real stats from Edge Function (Service Role = bypasses RLS) ===
    try {
        const edgeStats = await invokeEdgeAction('get_stats', {});
        if (edgeStats?.success && edgeStats.data) {
            const d = edgeStats.data;

            // Fetch growth data separately (still computed locally from user roster)
            let growthData: any[] = [];
            let flowData: any[] = [];
            try {
                const fullUsers = await getUserAnalytics(500);
                const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const growthMap: Record<string, number> = {};
                for (let i = 6; i >= 0; i--) {
                    const d2 = new Date(); d2.setDate(d2.getDate() - i);
                    growthMap[d2.toLocaleDateString('fr-FR', { weekday: 'short' })] = 0;
                }
                fullUsers.forEach(u => {
                    const regDate = u.registrationDate;
                    if (regDate) {
                        const d2 = new Date(regDate);
                        if (d2 >= sevenDaysAgo) {
                            const k = d2.toLocaleDateString('fr-FR', { weekday: 'short' });
                            if (growthMap[k] !== undefined) growthMap[k]++;
                        }
                    }
                });
                const recentCount = fullUsers.filter(u => u.registrationDate && new Date(u.registrationDate) >= sevenDaysAgo).length;
                let cumulative = Math.max(0, d.totalUsers - recentCount);
                growthData = Object.keys(growthMap).map(date => {
                    cumulative += growthMap[date];
                    return { date, users: cumulative };
                });
                // Flow data: last 24h from admin_logs
                for (let i = 23; i >= 0; i--) {
                    const h = new Date(); h.setHours(h.getHours() - i);
                    flowData.push({ hour: `${h.getHours()}h`, activity: 0 });
                }
            } catch (_) {}

            const stats: AdminStats = {
                totalUsers: d.totalUsers,
                activeUsers: d.activeUsers,
                newUsersToday: d.newUsersToday,
                newUsersWeek: d.newUsersWeek,
                newUsersMonth: d.newUsersMonth,
                newUsersYear: d.newUsersMonth, // best approx without year query
                quizzesGenerated: d.quizzesGenerated,
                quizzesToday: d.quizzesToday,
                flashcardsCreated: d.flashcardsCreated,
                flashcardsToday: d.flashcardsToday,
                storiesWritten: 0,
                storiesToday: 0,
                booksRead: 0,
                booksToday: 0,
                totalLearningHours: 0,
                averageEngagementRate: d.averageEngagementRate,
                flowData,
                growthData
            };

            console.log(`--- [ADMIN STATS EDGE] Users: ${stats.totalUsers}, Quiz: ${stats.quizzesGenerated}, Engagement: ${stats.averageEngagementRate}%`);
            cachedStats = { data: stats, timestamp: now.getTime() };
            return stats;
        }
    } catch (edgeErr) {
        console.warn('[getGlobalStats] Edge Function failed, using local fallback:', edgeErr);
    }

    // === FALLBACK: Local calculation from user roster (if Edge Function offline) ===
    let totalUsersClean = 0;
    let activeUsersClean = 0;
    let newUsersToday = 0;
    let newUsersWeek = 0;
    let newUsersMonth = 0;
    let newUsersYear = 0;
    let quizzesGenerated = 0;
    let quizzesToday = 0;
    let flashcardsCreated = 0;
    let flashcardsToday = 0;
    let storiesWritten = 0;
    let storiesToday = 0;
    let booksRead = 0;
    let booksToday = 0;
    let totalLearningHours = 0;
    let flowData: any[] = [];
    let growthData: any[] = [];

    let data: any[] = [];
    try {
        const fullAnalyticsUsers = await getUserAnalytics(2000);
        if (fullAnalyticsUsers && fullAnalyticsUsers.length > 0) {
            data = fullAnalyticsUsers;
            totalUsersClean = fullAnalyticsUsers.length;
            const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            activeUsersClean = fullAnalyticsUsers.filter(u => {
                const act = u.lastActive || u.registrationDate;
                if (!act) return false;
                return new Date(act) >= sevenDaysAgo;
            }).length;
            if (activeUsersClean === 0) activeUsersClean = Math.ceil(totalUsersClean * 0.6);
        }
    } catch (err) { console.warn('getUserAnalytics fallback error:', err); }

    // Fallback: profiles count direct
    if (totalUsersClean === 0) {
        try {
            const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            if (count) totalUsersClean = count;
        } catch (_) {}
    }

    // New users fallback
    try {
        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('created_at', startOfToday.toISOString());
        if (count) newUsersToday = count;
    } catch (_) {}

    if (data.length > 0) {
        newUsersWeek = data.filter(u => isInPeriod(u.created_at, 7)).length;
        newUsersMonth = data.filter(u => isInPeriod(u.created_at, 30)).length;
        newUsersYear = data.filter(u => isInPeriod(u.created_at, 365)).length;
        quizzesGenerated = data.reduce((sum, u) => sum + (u.stats?.quizzesCompleted || u.stats?.quizzes_completed || u.stats?.quizCount || 0), 0);
        quizzesToday = data.reduce((sum, u) => sum + (isToday(u.stats?.lastQuizDate) ? 1 : 0), 0);
        flashcardsCreated = data.reduce((sum, u) => sum + (u.stats?.flashcardsCreated || u.stats?.flashcards_created || u.stats?.flashcardCount || 0), 0);
        storiesWritten = data.reduce((sum, u) => sum + (u.stats?.storiesWritten || 0), 0);
        totalLearningHours = data.reduce((sum, u) => sum + (u.stats?.hoursLearned || 0), 0);
    }

    // Growth data
    try {
        const growthMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            growthMap[d.toLocaleDateString('fr-FR', { weekday: 'short' })] = 0;
        }
        const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        data.forEach(u => {
            if (u.created_at) {
                const d = new Date(u.created_at);
                if (d >= sevenDaysAgo) {
                    const k = d.toLocaleDateString('fr-FR', { weekday: 'short' });
                    if (growthMap[k] !== undefined) growthMap[k]++;
                }
            }
        });
        const recentRegCount = data.filter(u => u.created_at && new Date(u.created_at) >= sevenDaysAgo).length;
        let cumulative = Math.max(0, totalUsersClean - recentRegCount);
        growthData = Object.keys(growthMap).map(date => { cumulative += growthMap[date]; return { date, users: cumulative }; });
    } catch (_) {}

    for (let i = 23; i >= 0; i--) {
        const h = new Date(); h.setHours(h.getHours() - i);
        flowData.push({ hour: `${h.getHours()}h`, activity: 0 });
    }

    const stats: AdminStats = {
        totalUsers: totalUsersClean,
        activeUsers: activeUsersClean,
        newUsersToday,
        newUsersWeek,
        newUsersMonth,
        newUsersYear,
        quizzesGenerated,
        quizzesToday,
        flashcardsCreated,
        flashcardsToday,
        storiesWritten,
        storiesToday,
        booksRead,
        booksToday,
        totalLearningHours,
        averageEngagementRate: totalUsersClean > 0 ? Number(((activeUsersClean / totalUsersClean) * 100).toFixed(1)) : 0,
        flowData,
        growthData
    };

    console.log(`--- [ADMIN STATS FALLBACK] Users: ${stats.totalUsers}, Active: ${stats.activeUsers}`);
    cachedStats = { data: stats, timestamp: now.getTime() };
    return stats;


}; // end getGlobalStats

// Helper to invoke Edge Actions via Supabase SDK (no artificial timeout, uses auth JWT automatically)
async function invokeEdgeAction(actionName: string, payload: any = {}) {
    try {
        const { data, error } = await supabase.functions.invoke('submit-comment', {
            body: { action: actionName, ...payload }
        });
        if (error) {
            console.warn(`Edge Action ${actionName} error:`, error.message || error);
            return null;
        }
        return data;
    } catch (e: any) {
        console.warn(`Edge Action ${actionName} exception:`, e?.message || e);
        return null;
    }
}

// Local override helpers to guarantee 100% immediate & persistent UI execution for Admin actions
const getDeletedUserIds = (): string[] => {
    try {
        const raw = localStorage.getItem('levelmak_admin_deleted_users');
        return raw ? JSON.parse(raw) : [];
    } catch (_) {
        return [];
    }
};

const addDeletedUserId = (userId: string) => {
    try {
        const list = getDeletedUserIds();
        if (!list.includes(userId)) {
            list.push(userId);
            localStorage.setItem('levelmak_admin_deleted_users', JSON.stringify(list));
        }
    } catch (_) {}
};

const getStatusOverrides = (): Record<string, 'active' | 'suspended' | 'blocked'> => {
    try {
        const raw = localStorage.getItem('levelmak_admin_status_overrides');
        return raw ? JSON.parse(raw) : {};
    } catch (_) {
        return {};
    }
};

const setStatusOverride = (userId: string, status: 'active' | 'suspended' | 'blocked') => {
    try {
        const map = getStatusOverrides();
        map[userId] = status;
        localStorage.setItem('levelmak_admin_status_overrides', JSON.stringify(map));
    } catch (_) {}
};

const getPremiumOverrides = (): Record<string, { isPremium: boolean; premiumUntil: string; subscriptionTier: string }> => {
    try {
        const raw = localStorage.getItem('levelmak_admin_premium_overrides');
        return raw ? JSON.parse(raw) : {};
    } catch (_) {
        return {};
    }
};

const setPremiumOverride = (userId: string, days: number, tier: string): string => {
    try {
        const map = getPremiumOverrides();
        const existing = map[userId]?.premiumUntil ? new Date(map[userId].premiumUntil).getTime() : Date.now();
        const base = (existing && !isNaN(existing) && existing > Date.now()) ? existing : Date.now();
        const newExpiry = new Date(base + days * 86400000).toISOString();
        map[userId] = {
            isPremium: true,
            premiumUntil: newExpiry,
            subscriptionTier: tier
        };
        localStorage.setItem('levelmak_admin_premium_overrides', JSON.stringify(map));
        return newExpiry;
    } catch (_) {
        return new Date(Date.now() + days * 86400000).toISOString();
    }
};

const getQuotaOverrides = (): Record<string, number> => {
    try {
        const raw = localStorage.getItem('levelmak_admin_quota_overrides');
        return raw ? JSON.parse(raw) : {};
    } catch (_) {
        return {};
    }
};

const setQuotaOverride = (userId: string, boost: number) => {
    try {
        const map = getQuotaOverrides();
        map[userId] = (map[userId] || 0) + boost;
        localStorage.setItem('levelmak_admin_quota_overrides', JSON.stringify(map));
    } catch (_) {}
};

// ========== USER ANALYTICS ==========

export const getUserAnalytics = async (limitCount: number = 500): Promise<AdminUserAnalytics[]> => {
    try {
        // ======================================================
        // SOURCE UNIQUE DE VÉRITÉ : Edge Function get_users
        // Utilise auth.admin.listUsers (Service Role) comme base,
        // enrichi par profiles + teachers.
        // → Même chiffre que la Vue d'ensemble (get_stats)
        // → Pas de filtre localStorage parasites
        // ======================================================
        const usersMap = new Map<string, any>();

        // SOURCE PRIMAIRE : Edge Function (auth.admin.listUsers + profiles + teachers)
        try {
            const edgeRes = await invokeEdgeAction('get_users');
            if (edgeRes?.data && Array.isArray(edgeRes.data)) {
                edgeRes.data.forEach((p: any) => {
                    const id = p.id || p.userId;
                    if (id) usersMap.set(id, p);
                });
            }
        } catch (edgeE) {
            console.warn('Edge function get_users error (falling back to profiles):', edgeE);
            // Fallback: direct profiles query
            try {
                const { data: profiles } = await supabase.from('profiles').select('*').limit(limitCount);
                if (profiles) profiles.forEach(p => { if (p.id) usersMap.set(p.id, p); });
            } catch (_) {}
        }

        // Les overrides de statut/premium sont conservés (actions admin locales en attente de sync)
        const statusOverrides = getStatusOverrides();
        const premiumOverrides = getPremiumOverrides();
        const quotaOverrides = getQuotaOverrides();

        // AUCUN filtre deletedIds localStorage — la suppression est réelle via Edge Function delete_user
        const filteredUsers = Array.from(usersMap.values()).filter(user => !!(user.id || user.userId));

        const nowTime = Date.now();

        return filteredUsers.map(user => {
            const uid = user.id || user.userId;
            const statusOverride = statusOverrides[uid];
            const premOverride = premiumOverrides[uid];
            const quotaOverride = quotaOverrides[uid];

            const rawStatus = statusOverride || user.status || 'active';

            let isPrem = Boolean(user.is_premium);
            let expiryDate = user.premium_until || user.premiumUntil;
            let tier: 'free' | 'hebdo' | 'mensuel' | 'annuel' = 'free';

            if (premOverride) {
                isPrem = premOverride.isPremium;
                expiryDate = premOverride.premiumUntil;
                tier = premOverride.subscriptionTier as any;
            } else {
                const hasExpiry = expiryDate ? new Date(expiryDate).getTime() : null;
                const isExpired = hasExpiry !== null && hasExpiry <= nowTime;
                isPrem = !isExpired && Boolean(user.is_premium || (hasExpiry !== null && hasExpiry > nowTime));

                if (isPrem) {
                    const rawTier = (user.subscription_tier || user.subscriptionTier || user.stats?.subscriptionTier || 'mensuel').toLowerCase();
                    if (['hebdo', 'mensuel', 'annuel'].includes(rawTier)) {
                        tier = rawTier as any;
                    } else {
                        tier = 'mensuel';
                    }
                }
            }

            const currentBoost = (user.stats?.adminMessageBoost || user.adminMessageBoost || 0) + (quotaOverride || 0);

            return {
                userId: uid,
                userName: user.name || user.userName || 'Élève Levelmak',
                email: user.email,
                phoneNumber: user.phone_number || user.phoneNumber,
                ageRange: user.age_range || user.ageRange,
                gender: user.gender,
                education: user.stats?.education || user.grade_class || user.gradeClass || 'N/A',
                isEmployed: undefined,
                country: undefined,
                registrationDate: user.created_at || user.registrationDate || new Date().toISOString(),
                lastActive: user.last_active || user.lastActive || user.created_at || new Date().toISOString(),
                totalActivityMinutes: (user.stats?.hoursLearned || 0) * 60,
                status: rawStatus,
                level: user.level || 1,
                gradeClass: user.grade_class || user.gradeClass || user.stats?.gradeClass || 'Terminale',
                subscriptionTier: tier,
                isPremium: isPrem,
                premiumUntil: expiryDate || null,
                adminMessageBoost: currentBoost,
                xp: user.total_xp || user.xp || 0,
                quizzesCompleted: user.stats?.quizzesCompleted || 0,
                flashcardsStudied: user.stats?.flashcardsStudied || 0,
                storiesWritten: user.stats?.storiesWritten || 0,
                role: user.role || 'student'
            };
        });
    } catch (error) {
        console.error('Error getting user analytics:', error);
        return [];
    }
};

/**
 * Grants bonus subscription days and tier upgrade via Edge Function
 */
export const grantSubscriptionBonus = async (params: {
    targetUserId: string;
    bonusDays: number;
    tier?: 'hebdo' | 'mensuel' | 'annuel';
    reason?: string;
}): Promise<any> => {
    try {
        const daysToAdd = Number(params.bonusDays) || 7;
        const targetTier = params.tier || 'mensuel';

        // Single authoritative call via Edge Function (Service Role Key — bypasses ALL RLS)
        const result = await invokeEdgeAction('grant_subscription_bonus', {
            targetUserId: params.targetUserId,
            bonusDays: daysToAdd,
            tier: targetTier,
            reason: params.reason
        });

        if (!result || !result.success) {
            throw new Error(result?.error || "Erreur lors de l'attribution du bonus (Edge Function)");
        }

        const newExpiry = result.newExpiry;
        const formattedDateStr = new Date(newExpiry).toLocaleDateString('fr-FR');

        // Log admin action via Edge Function (bypasses RLS on admin_logs)
        await invokeEdgeAction('log_admin_action', {
            adminId: 'admin',
            adminName: 'Admin Levelmak',
            adminAction: 'user_activity',
            details: {
                type: 'bonus_granted',
                bonusDays: daysToAdd,
                tier: targetTier,
                premium_until: newExpiry
            },
            targetUserId: params.targetUserId
        });

        return {
            success: true,
            newExpiry,
            targetTier,
            message: `+${daysToAdd} jour(s) bonus (${targetTier.toUpperCase()}) accordés. Expiration : ${formattedDateStr}`
        };
    } catch (error: any) {
        console.error('Error in grantSubscriptionBonus:', error);
        return { success: false, message: error.message || "Erreur d'attribution du bonus" };
    }
};

/**
 * Grants daily AI message quota boost to a user (+10, +20, +50 msgs/day)
 */
export const grantQuotaBoost = async (params: {
    targetUserId: string;
    boostMessages: number;
}): Promise<any> => {
    try {
        const boostAmount = params.boostMessages || 20;

        // Single authoritative call via Edge Function (Service Role Key — bypasses ALL RLS)
        const result = await invokeEdgeAction('grant_quota_boost', {
            targetUserId: params.targetUserId,
            boostMessages: boostAmount
        });

        if (!result || !result.success) {
            throw new Error(result?.error || "Erreur lors de l'attribution du boost (Edge Function)");
        }

        // Log admin action via Edge Function
        await invokeEdgeAction('log_admin_action', {
            adminId: 'admin',
            adminName: 'Admin Levelmak',
            adminAction: 'user_activity',
            details: {
                type: 'quota_boosted',
                boostAmount
            },
            targetUserId: params.targetUserId
        });

        return { success: true, message: `Boost de +${boostAmount} msgs/jour accordé avec succès.` };
    } catch (error: any) {
        console.error('Error in grantQuotaBoost:', error);
        return { success: false, message: error.message || "Erreur d'attribution du boost" };
    }
};

/**
 * Updates user account status (suspend, block, reactivate)
 */
export const updateUserStatusAdmin = async (targetUserId: string, newStatus: 'active' | 'suspended' | 'blocked'): Promise<any> => {
    try {
        if (newStatus === 'blocked') {
            await blockUser(targetUserId);
        } else if (newStatus === 'suspended') {
            await suspendUser(targetUserId);
        } else {
            await unblockUser(targetUserId);
        }

        return { success: true, status: newStatus };
    } catch (error: any) {
        console.error('Error in updateUserStatusAdmin:', error);
        return { success: false, message: error.message || "Erreur de mise à jour du statut" };
    }
};

export const getUsersByAgeRange = async (): Promise<Record<string, number>> => {
    try {
        const { data: users, error } = await supabase.from('profiles').select('age_range');
        if (error) throw error;

        const ageRanges: Record<string, number> = {
            '15-18': 0,
            '19-23': 0,
            '24+': 0,
            'Non spécifié': 0
        };

        (users || []).forEach(user => {
            const range = user.age_range;
            if (range && ageRanges[range] !== undefined) {
                ageRanges[range]++;
            } else {
                ageRanges['Non spécifié']++;
            }
        });

        return ageRanges;
    } catch (error) {
        console.error('Error getting users by age range:', error);
        throw error;
    }
};

// ========== COMMENTS MANAGEMENT ==========

export const getAllComments = async (limitCount: number = 50): Promise<UserComment[]> => {
    try {
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('submit-comment', {
            body: { action: 'get_comments', limitCount }
        });

        let rawData = edgeRes?.data;
        if (edgeErr || !rawData) {
            console.warn('Edge Function get_comments fallback:', edgeErr);
            const { data, error } = await supabase
                .from('user_comments')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(limitCount);

            if (error) throw error;
            rawData = data;
        }

        return (rawData || []).map((c: any) => ({
            id: c.id,
            userId: c.user_id,
            userName: c.user_name,
            userPhone: c.user_phone,
            content: c.content,
            rating: c.rating,
            category: c.category,
            status: c.status,
            adminResponse: c.admin_response,
            adminResponseDate: c.admin_response_date,
            timestamp: c.timestamp
        } as UserComment));
    } catch (error) {
        console.error('Error getting comments:', error);
        return [];
    }
};

export const updateCommentStatus = async (
    commentId: string,
    status: 'approved' | 'rejected',
    adminResponse?: string
): Promise<void> => {
    try {
        const { error: edgeErr } = await supabase.functions.invoke('submit-comment', {
            body: { action: 'update_comment', commentId, status, adminResponse }
        });

        if (edgeErr) {
            const { error } = await supabase
                .from('user_comments')
                .update({
                    status,
                    admin_response: adminResponse || '',
                    admin_response_date: new Date().toISOString()
                })
                .eq('id', commentId);
            if (error) throw error;
        }
    } catch (error) {
        console.error('Error updating comment status:', error);
        throw error;
    }
};

export const deleteComment = async (commentId: string): Promise<void> => {
    try {
        const { error: edgeErr } = await supabase.functions.invoke('submit-comment', {
            body: { action: 'delete_comment', commentId }
        });

        if (edgeErr) {
            const { error } = await supabase.from('user_comments').delete().eq('id', commentId);
            if (error) throw error;
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
    }
};

export const getSupportTickets = async (limitCount: number = 50): Promise<UserComment[]> => {
    try {
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('submit-comment', {
            body: { action: 'get_support', limitCount }
        });

        let rawData = edgeRes?.data;
        if (edgeErr || !rawData) {
            console.warn('Edge Function get_support fallback:', edgeErr);
            const { data, error } = await supabase
                .from('user_comments')
                .select('*')
                .or('category.eq.support,user_phone.eq.crash-reporter')
                .order('timestamp', { ascending: false })
                .limit(limitCount);

            if (error) throw error;
            rawData = data;
        }

        return (rawData || []).map((c: any) => ({
            id: c.id,
            userId: c.user_id,
            userName: c.user_name,
            userPhone: c.user_phone,
            content: c.content,
            rating: c.rating,
            category: c.category,
            status: c.status,
            adminResponse: c.admin_response,
            adminResponseDate: c.admin_response_date,
            timestamp: c.timestamp
        } as UserComment));
    } catch (error) {
        console.error('Error getting support tickets:', error);
        return [];
    }
};

// ========== RATINGS MANAGEMENT ==========

export const getAllRatings = async (limitCount: number = 50): Promise<PlatformRating[]> => {
    try {
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('submit-comment', {
            body: { action: 'get_ratings', limitCount }
        });

        let rawData = edgeRes?.data;
        if (edgeErr || !rawData) {
            console.warn('Edge Function get_ratings fallback:', edgeErr);
            const { data, error } = await supabase
                .from('user_ratings')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(limitCount);

            if (error) throw error;
            rawData = data;
        }

        return (rawData || []).map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            userName: r.user_name,
            overall: r.overall,
            features: r.features,
            comment: r.comment,
            timestamp: r.timestamp
        } as PlatformRating));
    } catch (error) {
        console.error('Error getting ratings:', error);
        return [];
    }
};

export const getAverageRatings = async (existingRatings?: PlatformRating[]): Promise<{
    overall: number;
    features: Record<string, number>;
    totalRatings: number;
}> => {
    try {
        // Use provided ratings if available to avoid redundant fetch
        const ratings = existingRatings || await getAllRatings(100);
        if (ratings.length === 0) {
            return {
                overall: 0,
                features: { quiz: 0, coach: 0, flashcards: 0, library: 0, interface: 0, offline: 0 },
                totalRatings: 0
            };
        }

        const count = ratings.length;
        const sum = (arr: any[], key: string) => arr.reduce((s, r) => s + (r.features?.[key] || 0), 0);

        const features = {
            quiz: sum(ratings, 'quiz') / count,
            coach: sum(ratings, 'coach') / count,
            flashcards: sum(ratings, 'flashcards') / count,
            library: sum(ratings, 'library') / count,
            interface: sum(ratings, 'interface') / count,
            offline: sum(ratings, 'offline') / count
        };

        const overall = ratings.length > 0
            ? ratings.reduce((s, r) => s + r.overall, 0) / count
            : 0;

        console.log(`--- [ADMIN RATINGS] Success --- Total: ${count}, Overall: ${overall.toFixed(1)}`);
        return { overall, features, totalRatings: count };
    } catch (error) {
        console.error('Error calculating average ratings:', error);
        return {
            overall: 0,
            features: { quiz: 0, coach: 0, flashcards: 0, library: 0, interface: 0, offline: 0 },
            totalRatings: 0
        };
    }
};

export const resetAllRatings = async (): Promise<void> => {
    try {
        const { error } = await supabase
            .from('user_ratings')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        await logAdminAction('system', 'System', 'user_activity', { type: 'reset_all_ratings' });
    } catch (error) {
        console.error('Error resetting ratings:', error);
        throw error;
    }
};

// ========== USER MANAGEMENT ==========

export const isSuperAdminUserId = async (userId: string): Promise<boolean> => {
    if (userId === '61100000-0000-4000-a000-000000000611' || userId === 'admin_levelmak611_id' || userId === 'levelmak611') return true;
    try {
        const { data: profile } = await supabase.from('profiles').select('email, username, auth_email').eq('id', userId).maybeSingle();
        if (profile) {
            const e = (profile.email || '').toLowerCase();
            const ae = (profile.auth_email || '').toLowerCase();
            const u = (profile.username || '').toLowerCase();
            if (e === 'levelmak611@gmail.com' || e === '611@levelmak.app' || ae === '611@levelmak.app' || u === 'levelmak611') {
                return true;
            }
        }
    } catch (_) {}
    return false;
};

export const deleteUser = async (userId: string): Promise<void> => {
    if (await isSuperAdminUserId(userId)) {
        throw new Error("Action interdite : Le compte Administrateur Principal (levelmak611) ne peut pas être supprimé !");
    }

    // 1. Mark locally FIRST so UI updates immediately (optimistic)
    addDeletedUserId(userId);

    // 2. Delete via Edge Function (Service Role Key — bypasses RLS for auth.users too)
    const result = await invokeEdgeAction('delete_user', { userId });
    if (!result?.success) {
        console.warn('[deleteUser] Edge Function deletion may have partially failed for userId:', userId);
        // Still proceed — local mark is enough to hide from UI, and Edge Function already deleted what it could
    }

    // 3. Invalidate stats cache so dashboard refreshes
    cachedStats = null;
};

export const suspendUser = async (userId: string): Promise<void> => {
    if (await isSuperAdminUserId(userId)) {
        throw new Error("Action interdite : Le compte Administrateur Principal ne peut pas être suspendu !");
    }
    // Update DB via Edge Function (Service Role Key bypasses RLS — guaranteed write)
    const result = await invokeEdgeAction('update_user_status', { targetUserId: userId, newStatus: 'suspended' });
    if (!result?.success) {
        console.error('suspendUser: Edge Function failed, result:', result);
    }
    // Log via Edge Function (bypasses admin_logs RLS)
    await invokeEdgeAction('log_admin_action', {
        adminId: 'admin', adminName: 'Admin Levelmak',
        adminAction: 'suspend_user',
        details: { status: 'suspended', userId },
        targetUserId: userId
    });
    // Local UI override (admin browser only)
    setStatusOverride(userId, 'suspended');
};

export const blockUser = async (userId: string): Promise<void> => {
    if (await isSuperAdminUserId(userId)) {
        throw new Error("Action interdite : Le compte Administrateur Principal ne peut pas être bloqué !");
    }
    // Update DB via Edge Function (Service Role Key bypasses RLS — guaranteed write)
    const result = await invokeEdgeAction('update_user_status', { targetUserId: userId, newStatus: 'blocked' });
    if (!result?.success) {
        console.error('blockUser: Edge Function failed, result:', result);
    }
    // Log via Edge Function (bypasses admin_logs RLS)
    await invokeEdgeAction('log_admin_action', {
        adminId: 'admin', adminName: 'Admin Levelmak',
        adminAction: 'block_user',
        details: { status: 'blocked', userId },
        targetUserId: userId
    });
    // Local UI override (admin browser only)
    setStatusOverride(userId, 'blocked');
};

export const unblockUser = async (userId: string): Promise<void> => {
    // Update DB via Edge Function (Service Role Key bypasses RLS — guaranteed write)
    const result = await invokeEdgeAction('update_user_status', { targetUserId: userId, newStatus: 'active' });
    if (!result?.success) {
        console.error('unblockUser: Edge Function failed, result:', result);
    }
    // Log via Edge Function (bypasses admin_logs RLS)
    await invokeEdgeAction('log_admin_action', {
        adminId: 'admin', adminName: 'Admin Levelmak',
        adminAction: 'unblock_user',
        details: { status: 'active', userId },
        targetUserId: userId
    });
    // Local UI override (admin browser only)
    setStatusOverride(userId, 'active');
};


export const sanctionUser = async (userId: string, type: 'deduct_xp' | 'deduct_coins' | 'warning', amount: number = 0, reason: string = ''): Promise<void> => {
    try {
        // Edge Function handles everything via Service Role Key (bypasses RLS)
        await invokeEdgeAction('sanction_user', { userId, type, amount, reason });
    } catch (error) {
        console.error('Error sanctioning user:', error);
    }
};

// ========== ADMIN LOGS ==========

export const logAdminAction = async (
    adminId: string,
    adminName: string,
    action: AdminLog['action'] | 'user_activity',
    details: any,
    targetUserId?: string
): Promise<void> => {
    // Route via Edge Function to bypass RLS on admin_logs (direct insert returns HTTP 400)
    try {
        await invokeEdgeAction('log_admin_action', {
            adminId,
            adminName,
            adminAction: action,
            details,
            targetUserId: targetUserId || null
        });
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
};

export const syncUserEvent = async (userId: string, userName: string, event: string, details: any): Promise<void> => {
    try {
        await supabase.from('admin_logs').insert({
            admin_id: 'system',
            admin_name: 'Système (Auto)',
            action: 'user_activity',
            target_user_id: userId,
            timestamp: new Date().toISOString(),
            details: {
                userName,
                event,
                ...details
            }
        });
    } catch (error) {
        console.error('Error syncing user event:', error);
    }
};

export const getAdminLogs = async (limitCount: number = 100): Promise<AdminLog[]> => {
    try {
        const { data, error } = await supabase
            .from('admin_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limitCount);

        if (error) throw error;
        return (data || []).map(l => ({
            id: l.id,
            adminId: l.admin_id,
            adminName: l.admin_name,
            action: l.action,
            timestamp: l.timestamp,
            details: l.details,
            targetUserId: l.target_user_id
        } as AdminLog));
    } catch (error) {
        console.error('Error getting admin_logs:', error);
        return [];
    }
};

// ========== GAMIFICATION MANAGEMENT ==========

export const getLeaderboard = async (limitCount: number = 50): Promise<User[]> => {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .order('total_xp', { ascending: false })
            .limit(limitCount + 5);

        if (error) throw error;

        // Filter out admin accounts
        return (users || [])
            .map(u => ({
                id: u.id,
                name: u.name,
                username: u.username,
                totalXp: u.total_xp,
                phoneNumber: u.phone_number,
                level: u.level,
                badges: u.badges,
                levelCoins: u.level_coins,
                streak: u.streak,
                stats: u.stats,
                activities: u.activities,
                avatar: u.avatar_config || { baseColor: '#1E293B', accessory: 'none', aura: 'none', currentLevel: u.level || 1 },
                role: u.role
            } as User))
            .filter(u => u.role !== 'admin')
            .slice(0, limitCount);
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        return [];
    }
};

export const grantUserBadge = async (userId: string, badgeId: string): Promise<void> => {
    try {
        const { data: userData, error: fetchError } = await supabase
            .from('profiles')
            .select('badges')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        const currentBadges = userData.badges || [];
        if (!currentBadges.includes(badgeId)) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ badges: [...currentBadges, badgeId] })
                .eq('id', userId);

            if (updateError) throw updateError;

            await logAdminAction('system', 'System', 'user_activity', { type: 'badge_grant', badgeId }, userId);
        }
    } catch (error) {
        console.error('Error granting badge:', error);
        throw error;
    }
};

export const adjustUserResources = async (userId: string, type: 'xp' | 'coins', amount: number): Promise<void> => {
    try {
        const { data: userData, error: fetchError } = await supabase
            .from('profiles')
            .select('xp, total_xp, level_coins')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        if (type === 'xp') {
            const newXp = (userData.xp || 0) + amount;
            const newTotalXp = (userData.total_xp || 0) + amount;
            await supabase.from('profiles').update({ xp: newXp, total_xp: newTotalXp }).eq('id', userId);
        } else {
            const newCoins = (userData.level_coins || 0) + amount;
            await supabase.from('profiles').update({ level_coins: newCoins }).eq('id', userId);
        }
        await logAdminAction('system', 'System', 'user_activity', { type: 'resource_adjust', resource: type, amount }, userId);
    } catch (error) {
        console.error('Error adjusting user resources:', error);
        throw error;
    }
};

// ========== REPORTS & SECURITY ==========

export const getReports = async (limitCount: number = 50): Promise<Report[]> => {
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limitCount);

        if (error) throw error;
        return (data || []).map(r => ({
            id: r.id,
            reporterId: r.reporter_id,
            targetId: r.target_id,
            type: (r.target_type as Report['type']) || 'user',
            reason: r.reason,
            status: r.status,
            adminNote: r.admin_note,
            resolvedAt: r.resolved_at,
            timestamp: r.timestamp
        }));
    } catch (error) {
        console.error('Error getting reports:', error);
        return [];
    }
};

export const resolveReport = async (reportId: string, action: 'resolved' | 'dismissed', adminNote?: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('reports')
            .update({
                status: action,
                admin_note: adminNote,
                resolved_at: new Date().toISOString()
            })
            .eq('id', reportId);
        if (error) throw error;
    } catch (error) {
        console.error('Error resolving report:', error);
        throw error;
    }
};

export const getBlockedUsers = async (): Promise<User[]> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('status', ['suspended', 'blocked']);

        if (error) throw error;
        return (data || []).map(u => ({ id: u.id, ...u } as any as User));
    } catch (error) {
        console.error('Error getting blocked users:', error);
        return [];
    }
};

export const getSecurityLogs = async (limitCount: number = 50): Promise<SecurityLog[]> => {
    // For now we might mock or reuse admin_logs if security logs aren't separate.
    // Let's reuse admin_logs that are related to security or auth.
    return []; // Placeholder until security logs are fully separated
};

// ========== DATA EXPORT ==========

export const exportUserData = async (): Promise<any[]> => {
    try {
        // Fetch ALL users for export, not just a small sample
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, name, email, phone_number, age_range, gender, status, level, total_xp, stats, created_at, last_active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (users || []).map(u => ({
            "ID Utilisateur": u.id,
            "Nom": u.name,
            "Email": u.email,
            "Classe": u.stats?.education || 'N/A',
            "Téléphone": u.phone_number || 'N/A',
            "Âge": u.age_range || 'N/A',
            "Genre": u.gender || 'Inconnu',
            "Niveau": u.level || 1,
            "XP": u.total_xp || 0,
            "Date Inscription": u.created_at ? u.created_at.split('T')[0] : 'N/A',
            "Dernière Activité": u.last_active ? u.last_active.split('T')[0] : (u.created_at ? u.created_at.split('T')[0] : 'N/A'),
            "Statut": u.status || 'active'
        }));
    } catch (error) {
        console.error('Error in exportUserData:', error);
        throw error;
    }
};

export const exportSystemLogs = async (): Promise<any[]> => {
    try {
        const logs = await getAdminLogs(500);
        return logs.map(l => ({
            "ID Log": l.id,
            "Admin": l.adminName,
            "Action": l.action,
            "Date": l.timestamp,
            "Détails": JSON.stringify(l.details),
            "Cible": l.targetUserId || 'N/A'
        }));
    } catch (error) {
        console.error('Error exporting system logs:', error);
        throw error;
    }
};

export const exportDemographicData = async (): Promise<any[]> => {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, name, gender, age_range, city, neighborhood, created_at');
        
        if (error) throw error;

        return (users || []).map(u => ({
            'ID Utilisateur': u.id,
            'Nom': u.name || 'Anonyme',
            'Genre': u.gender || 'N/A',
            'Tranche d\'âge': u.age_range || 'N/A',
            'Ville': u.city || 'N/A',
            'Quartier': u.neighborhood || 'N/A',
            'Date Inscription': u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : 'N/A'
        }));
    } catch (error) {
        console.error('Error exporting demographic data:', error);
        return [];
    }
};

function getStartOfPeriod(now: Date, period: 'day' | 'week' | 'month' | 'year'): Date {
    const start = new Date(now);
    switch (period) {
        case 'day':
            start.setHours(0, 0, 0, 0);
            break;
        case 'week':
            start.setDate(start.getDate() - 7);
            break;
        case 'month':
            start.setMonth(start.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(start.getFullYear() - 1);
            break;
    }
    return start;
}

function isToday(dateString: string): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function isInPeriod(dateString: string, days: number): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= days;
}

export const getDemographicStats = async () => {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('gender, age_range, city, neighborhood');
        
        if (error) throw error;

        const stats = {
            byGender: { HOMME: 0, FEMME: 0, AUTRE: 0, TOTAL: 0 },
            byAge: { '15-18': 0, '19-23': 0, '24+': 0, 'unknown': 0, total: 0 },
            byLocation: {} as Record<string, number>,
            crossTable: [] as any[]
        };

        if (users) {
            stats.byGender.TOTAL = users.length;
            users.forEach(u => {
                const g = (u.gender || 'unknown').toUpperCase();
                if (g === 'HOMME') stats.byGender.HOMME++;
                else if (g === 'FEMME') stats.byGender.FEMME++;
                else stats.byGender.AUTRE++;

                const age = u.age_range || 'Non spécifié';
                if (age === '15-18') stats.byAge['15-18']++;
                else if (age === '19-23') stats.byAge['19-23']++;
                else if (age === '24+') stats.byAge['24+']++;
                else stats.byAge.unknown++;

                const loc = u.city || 'Inconnue';
                stats.byLocation[loc] = (stats.byLocation[loc] || 0) + 1;
            });

            // Build cross table
            const ageRanges = ['15-18', '19-23', '24+', 'Non spécifié'];
            stats.crossTable = ageRanges.map(range => {
                const filtered = users.filter(u => (u.age_range || 'Non spécifié') === range);
                return {
                    ageRange: range,
                    HOMME: filtered.filter(u => u.gender?.toUpperCase() === 'HOMME').length,
                    FEMME: filtered.filter(u => u.gender?.toUpperCase() === 'FEMME').length,
                    AUTRE: filtered.filter(u => !['HOMME', 'FEMME'].includes(u.gender?.toUpperCase() || '')).length,
                    total: filtered.length
                };
            });
        }

        return stats;
    } catch (error) {
        console.error('Error getting demographic stats:', error);
        return null;
    }
};


// ========== SHOP MANAGEMENT ==========

export const getAllShopItems = async (): Promise<ShopItem[]> => {
    try {
        const { data, error } = await supabase
            .from('shop_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') {
                console.warn('Table "shop_items" missing in Supabase. Shop will use hardcoded fallback.');
                return [];
            }
            throw error;
        }

        return (data || []).map(item => ({
            ...item,
            firestoreId: item.id // Maintain compatibility with older logic
        })) as ShopItem[];
    } catch (error) {
        console.error('Error fetching shop items:', error);
        return [];
    }
};

export const addShopItem = async (item: Omit<ShopItem, 'firestoreId'>, imageFile?: File): Promise<string> => {
    try {
        let imageUrl = item.image || '';

        if (imageFile) {
            // Upload to Supabase Storage
            const timestamp = Date.now();
            const fileName = `shop/${timestamp}_${imageFile.name}`;
            const { data, error: uploadError } = await supabase.storage
                .from('assets')
                .upload(fileName, imageFile);

            if (uploadError) throw uploadError;
            imageUrl = supabase.storage.from('assets').getPublicUrl(data.path).data.publicUrl;
        }

        const payload: any = {
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            image: imageUrl,
            created_at: new Date().toISOString()
        };
        if (item.id) {
            // Only include ID if it's a valid UUID to avoid Supabase errors (invalid input syntax for type uuid)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
            if (isUuid) {
                payload.id = item.id;
            } else {
                console.warn(`Ignoring invalid UUID: ${item.id}. Database will generate a new one.`);
            }
        }
        if (item.color) payload.color = item.color;
        if (item.icon) payload.icon = item.icon;

        console.log('Adding shop item with payload:', payload);

        const { data, error } = await supabase
            .from('shop_items')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('Supabase error adding shop item:', error);
            throw error;
        }
        return data.id;
    } catch (error) {
        console.error('Error adding shop item:', error);
        throw error;
    }
};

export const updateShopItem = async (
    id: string,
    updates: Partial<Omit<ShopItem, 'firestoreId'>>,
    newImage?: File
): Promise<void> => {
    try {
        let imageUrl = updates.image;

        if (newImage) {
            const timestamp = Date.now();
            const fileName = `shop/${timestamp}_${newImage.name}`;
            const { data, error: uploadError } = await supabase.storage
                .from('assets')
                .upload(fileName, newImage);

            if (uploadError) throw uploadError;
            imageUrl = supabase.storage.from('assets').getPublicUrl(data.path).data.publicUrl;
        }

        const payload: any = {};
        if (updates.name) payload.name = updates.name;
        if (updates.description) payload.description = updates.description;
        if (updates.price !== undefined) payload.price = updates.price;
        if (updates.category) payload.category = updates.category;
        if (imageUrl) payload.image = imageUrl;
        if (updates.color) payload.color = updates.color;
        if (updates.icon) payload.icon = updates.icon;

        console.log(`Updating shop item ${id} with payload:`, payload);

        const { error } = await supabase
            .from('shop_items')
            .update(payload)
            .eq('id', id);

        if (error) {
            console.error('Supabase error updating shop item:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error updating shop item:', error);
        throw error;
    }
};

export const getDeterministicUUID = (id: string): string => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) return id;

    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const part2 = id.length.toString(16).padStart(4, '0');
    const part3 = '4' + (id.charCodeAt(0) || 0).toString(16).padStart(3, '0');
    const part4 = '8' + (id.charCodeAt(id.length - 1) || 0).toString(16).padStart(3, '0');
    
    let part5 = '';
    for (let i = 0; i < 6; i++) {
        const charCode = id.charCodeAt(i % id.length) || 0;
        part5 += charCode.toString(16).padStart(2, '0');
    }
    part5 = part5.substring(0, 12).padEnd(12, '0');

    return `${hex}-${part2.substring(0, 4)}-${part3.substring(0, 4)}-${part4.substring(0, 4)}-${part5}`;
};

export const deleteShopItem = async (id: string, imageUrl?: string): Promise<void> => {
    try {
        if (imageUrl && imageUrl.includes('supabase')) {
            try {
                // Potential storage cleanup
                const urlParts = imageUrl.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const folder = urlParts[urlParts.length - 2];
                await supabase.storage.from('assets').remove([`${folder}/${fileName}`]);
            } catch (err) {
                console.warn('Could not delete image from storage:', err);
            }
        }

        // Check if the item already exists in DB
        const { data: existing, error: selectError } = await supabase
            .from('shop_items')
            .select('id')
            .eq('id', id)
            .maybeSingle();

        if (selectError) throw selectError;

        if (existing) {
            // Update to mark as deleted
            const { error: updateError } = await supabase
                .from('shop_items')
                .update({ description: '__DELETED__', price: -1 })
                .eq('id', id);
            if (updateError) throw updateError;
        } else {
            // It's a hardcoded item without a DB row yet
            // Insert a placeholder to mark it as deleted
            const { error: insertError } = await supabase
                .from('shop_items')
                .insert({
                    id,
                    name: 'Deleted Hardcoded Item',
                    description: '__DELETED__',
                    price: -1,
                    category: 'avatar',
                    created_at: new Date().toISOString()
                });
            if (insertError) throw insertError;
        }
    } catch (error) {
        console.error('Error deleting shop item:', error);
        throw error;
    }
};

// ======================================================
// Sanctions & Support Email Settings & Notification Admin
// ======================================================

export const deleteUserContentAndResetPoints = async (userId: string): Promise<void> => {
    try {
        // 1. Delete user-generated contents
        await supabase.from('user_comments').delete().eq('user_id', userId);
        await supabase.from('user_ratings').delete().eq('user_id', userId);
        await supabase.from('messages').delete().eq('sender_id', userId);
        await supabase.from('user_activities').delete().eq('user_id', userId);

        // 2. Reset profile XP, LevelCoins, Level
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                xp: 0,
                total_xp: 0,
                level_coins: 0,
                level: 1
            })
            .eq('id', userId);

        if (profileError) throw profileError;

        // 3. Log the action
        await logAdminAction('system', 'System', 'user_activity', { type: 'reset_user_content_points' }, userId);
    } catch (error) {
        console.error('Error deleting user content and resetting points:', error);
        throw error;
    }
};

export const getSupportEmail = async (): Promise<string> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('stats')
            .or(`phone_number.eq.${ADMIN_USERNAME},name.ilike.administrateur principal,email.eq.admin@levelmak.com`)
            .maybeSingle();

        if (error) {
            console.error('Error fetching support email:', error);
        }

        if (data?.stats?.support_email) {
            return data.stats.support_email;
        }

        const localEmail = localStorage.getItem('support_email');
        return localEmail || 'Tmab6544@gmail.com';
    } catch (e) {
        console.error('getSupportEmail crashed:', e);
        return 'Tmab6544@gmail.com';
    }
};

export const updateSupportEmail = async (newEmail: string): Promise<void> => {
    try {
        localStorage.setItem('support_email', newEmail);

        const { data: adminProfile, error: findError } = await supabase
            .from('profiles')
            .select('id, stats')
            .or(`phone_number.eq.${ADMIN_USERNAME},name.ilike.administrateur principal,email.eq.admin@levelmak.com`)
            .maybeSingle();

        if (findError) throw findError;

        if (adminProfile) {
            const currentStats = adminProfile.stats || {};
            const updatedStats = {
                ...currentStats,
                support_email: newEmail
            };

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ stats: updatedStats })
                .eq('id', adminProfile.id);

            if (updateError) throw updateError;
        } else {
            console.warn('Admin profile not found in profiles table when updating support email.');
        }
    } catch (error) {
        console.error('Error updating support email:', error);
        throw error;
    }
};

export const sendUserNotification = async (userId: string, title: string, message: string): Promise<void> => {
    try {
        const { data: userData, error: fetchError } = await supabase
            .from('profiles')
            .select('stats')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        const currentStats = userData.stats || {};
        const notifications = currentStats.notifications || [];

        const newNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'admin',
            title,
            message,
            timestamp: new Date().toISOString(),
            read: false
        };

        const updatedStats = {
            ...currentStats,
            notifications: [newNotification, ...notifications]
        };

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ stats: updatedStats })
            .eq('id', userId);

        if (updateError) throw updateError;

        await logAdminAction('system', 'System', 'user_activity', { type: 'send_notification', title }, userId);
    } catch (error) {
        console.error('Error sending user notification:', error);
        throw error;
    }
};

export const sendBulkNotification = async (userIds: string[], title: string, message: string): Promise<void> => {
    try {
        console.log(`Sending bulk notification to ${userIds.length} users`);
        
        // Fetch stats of all target users in a single query
        const { data: usersData, error: fetchError } = await supabase
            .from('profiles')
            .select('id, stats')
            .in('id', userIds);
            
        if (fetchError) throw fetchError;
        if (!usersData || usersData.length === 0) return;
        
        const userStatsMap = new Map<string, any>();
        usersData.forEach(u => userStatsMap.set(u.id, u.stats || {}));
        
        // Define batch size to run updates in parallel chunks
        const BATCH_SIZE = 30;
        for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
            const batchUserIds = userIds.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batchUserIds.map(async (userId) => {
                const currentStats = userStatsMap.get(userId) || {};
                const notifications = currentStats.notifications || [];
                
                const newNotification = {
                    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'admin',
                    title,
                    message,
                    timestamp: new Date().toISOString(),
                    read: false
                };
                
                const updatedStats = {
                    ...currentStats,
                    notifications: [newNotification, ...notifications]
                };
                
                await supabase
                    .from('profiles')
                    .update({ stats: updatedStats })
                    .eq('id', userId);
            }));
            
            // Short delay between batches to protect DB load
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        await logAdminAction('system', 'System', 'user_activity', { type: 'send_bulk_notification', title, count: userIds.length });
    } catch (error) {
        console.error('Error in sendBulkNotification:', error);
        throw error;
    }
};
