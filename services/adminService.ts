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
        
        if (error) {
            console.error('Supabase insert error (comment):', error);
            throw error;
        }

        // Fire-and-forget notification to avoid hanging the UI
        LocalNotifications.schedule({
            notifications: [{
                title: 'Merci ! 💬',
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
        const { error } = await supabase.from('user_ratings').insert({
            user_id: rating.userId,
            user_name: rating.userName || 'Anonyme',
            overall: rating.overall,
            features: rating.features || {},
            comment: rating.comment || '',
            timestamp: new Date().toISOString()
        });
        
        if (error) {
            console.error('Supabase insert error (rating):', error);
            throw error;
        }

        LocalNotifications.schedule({
            notifications: [{
                title: 'Évaluation Reçue ⭐',
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

export const isAdminCredentials = (identifier: string, password: string): boolean => {
    // Accept both username and cleaned phone-style identifier
    const cleanIdentifier = identifier.replace(/\D/g, '');
    return (identifier.toLowerCase() === ADMIN_USERNAME.toLowerCase() || cleanIdentifier === ADMIN_USERNAME)
        && password === ADMIN_PASSWORD;
};

export const getUserRole = async (userId: string): Promise<'admin' | 'user'> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('name, phone_number, email')
            .eq('id', userId)
            .single();

        if (error) throw error;
        
        const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || 'levelmak611';
        const isAdmin = 
            data.name?.toLowerCase().includes('administrateur principal') ||
            data.name?.toLowerCase().includes('mouctar') ||
            data.phone_number === ADMIN_USERNAME ||
            data.email?.includes(ADMIN_USERNAME);

        if (isAdmin) {
            return 'admin';
        }
        return 'user';
    } catch (error) {
        console.error('Error checking user role:', error);
        return 'user';
    }
};

// ========== STATISTICS ==========

let cachedStats: { data: AdminStats, timestamp: number } | null = null;
const STATS_CACHE_TIME = 30000; // 30 secondes pour un feeling "temps réel"

export const getGlobalStats = async (period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<AdminStats> => {
    const now = new Date();
    
    // Return cache if fresh
    if (cachedStats && (now.getTime() - cachedStats.timestamp < STATS_CACHE_TIME)) {
        return cachedStats.data;
    }

    try {
        // 1. Total and Active Users (Efficient counts)
        const { count: totalUsers, error: tError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: activeUsers, error: aError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .or(`last_active.gt."${sevenDaysAgo.toISOString()}",created_at.gt."${sevenDaysAgo.toISOString()}"`);

        // Fallback or Diagnostic for RLS: if count is 0 but we have a session, try a manual fetch
        let statsFallbackCount = 0;
        if ((totalUsers === 0 || totalUsers === null) && !tError) {
             console.log('--- ADMIN RLS CHECK ---');
             const { data: testRows, error: testError } = await supabase.from('profiles').select('id').limit(100);
             if (testRows && testRows.length > 0) {
                 console.warn(`ADMIN ALERT: count:exact returned 0, but select found ${testRows.length} rows. Using fallback count.`);
                 statsFallbackCount = testRows.length;
             } else if (testError) {
                 console.error('ADMIN RLS ERROR during test fetch:', testError);
             }
        }

        const { data: summaryData, error: summaryError } = await supabase
            .from('profiles')
            .select('total_xp, stats, created_at, last_active')
            .limit(2000);
        
        // Detailed Diagnostic Logs
        if (tError || aError || summaryError) {
            console.error('--- Supabase Stats Diagnostic ---');
            if (tError) console.error('Total Users Error:', tError);
            if (aError) console.error('Active Users Error:', aError);
            if (summaryError) console.error('Summary Data Error:', summaryError);
        }

        // 2. New Users Today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const { count: newUsersToday } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gt('created_at', startOfToday.toISOString());

        // Use empty array if data fetch failed or returned nothing
        const data = summaryData || [];

        const quizzesGenerated = data.reduce((sum, u) => sum + (u.stats?.quizzesCompleted || 0), 0);
        const storiesWritten = data.reduce((sum, u) => sum + (u.stats?.storiesWritten || 0), 0);
        const booksRead = data.reduce((sum, u) => sum + (u.stats?.booksRead || 0), 0);
        const totalLearningHours = data.reduce((sum, u) => sum + (u.stats?.hoursLearned || 0), 0);

        const totalUsersClean = totalUsers || statsFallbackCount || 0;
        const activeUsersClean = activeUsers || (statsFallbackCount > 0 ? statsFallbackCount : 0);

        const stats: AdminStats = {
            totalUsers: totalUsersClean,
            activeUsers: activeUsersClean,
            newUsersToday: newUsersToday || 0,
            newUsersWeek: data.filter(u => isInPeriod(u.created_at, 7)).length,
            newUsersMonth: data.filter(u => isInPeriod(u.created_at, 30)).length,
            newUsersYear: data.filter(u => isInPeriod(u.created_at, 365)).length,
            quizzesGenerated: quizzesGenerated || 0,
            quizzesToday: data.reduce((sum, u) => sum + (isToday(u.stats?.lastQuizDate) ? 1 : 0), 0),
            flashcardsCreated: data.reduce((sum, u) => sum + (u.stats?.flashcardsCreated || 0), 0),
            flashcardsToday: data.reduce((sum, u) => sum + (isToday(u.stats?.lastFlashcardDate) ? 1 : 0), 0),
            storiesWritten: storiesWritten || 0,
            storiesToday: data.reduce((sum, u) => sum + (isToday(u.stats?.lastStoryDate) ? 1 : 0), 0),
            booksRead: booksRead || 0,
            booksToday: data.reduce((sum, u) => sum + (isToday(u.stats?.lastBookDate) ? 1 : 0), 0),
            totalLearningHours: totalLearningHours || 0,
            averageEngagementRate: totalUsersClean > 0 ? Number(((activeUsersClean / totalUsersClean) * 100).toFixed(1)) : 0
        };

        console.log(`--- [ADMIN STATS] Success --- Users: ${stats.totalUsers}, Active: ${stats.activeUsers}`);
        cachedStats = { data: stats, timestamp: now.getTime() };
        return stats;
    } catch (error) {
        console.error('CRITICAL: Error getting global stats:', error);
        // Return blank stats instead of throwing to prevent Admin UI from breaking
        return {
            totalUsers: 0,
            activeUsers: 0,
            newUsersToday: 0,
            newUsersWeek: 0,
            newUsersMonth: 0,
            newUsersYear: 0,
            quizzesGenerated: 0,
            quizzesToday: 0,
            flashcardsCreated: 0,
            flashcardsToday: 0,
            storiesWritten: 0,
            storiesToday: 0,
            booksRead: 0,
            booksToday: 0,
            totalLearningHours: 0,
            averageEngagementRate: 0
        };
    }
}
;

// ========== USER ANALYTICS ==========

export const getUserAnalytics = async (limitCount: number = 50): Promise<AdminUserAnalytics[]> => {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, name, email, phone_number, age_range, gender, status, level, total_xp, stats, created_at, last_active')
            .limit(limitCount);

        if (error) throw error;

        return (users || []).map(user => ({
            userId: user.id,
            userName: user.name,
            email: user.email,
            phoneNumber: user.phone_number,
            ageRange: user.age_range,
            gender: user.gender,
            education: user.education,
            isEmployed: user.is_employed,
            country: undefined,
            registrationDate: user.created_at,
            lastActive: user.last_active || user.created_at,
            totalActivityMinutes: (user.stats?.hoursLearned || 0) * 60,
            status: user.status || 'active',
            level: user.level || 1,
            xp: user.total_xp || 0,
            quizzesCompleted: user.stats?.quizzesCompleted || 0,
            flashcardsStudied: 0,
            storiesWritten: user.stats?.storiesWritten || 0
        }));
    } catch (error) {
        console.error('Error getting user analytics:', error);
        throw error;
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
        const { data, error } = await supabase
            .from('user_comments')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limitCount);

        if (error) throw error;
        return (data || []).map(c => ({
            id: c.id,
            userId: c.user_id,
            userName: c.user_name,
            userPhone: c.user_phone, // Map user_phone
            content: c.content,
            rating: c.rating, // Map rating
            category: c.category, // Map category
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
        const { error } = await supabase
            .from('user_comments')
            .update({
                status,
                admin_response: adminResponse || '',
                admin_response_date: new Date().toISOString()
            })
            .eq('id', commentId);
        if (error) throw error;
    } catch (error) {
        console.error('Error updating comment status:', error);
        throw error;
    }
};

export const deleteComment = async (commentId: string): Promise<void> => {
    try {
        const { error } = await supabase.from('user_comments').delete().eq('id', commentId);
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
    }
};

// ========== RATINGS MANAGEMENT ==========

export const getAllRatings = async (limitCount: number = 50): Promise<PlatformRating[]> => {
    try {
        const { data, error } = await supabase
            .from('user_ratings')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limitCount);

        if (error) throw error;
        return (data || []).map(r => ({
            id: r.id,
            userId: r.user_id,
            userName: r.user_name, // Map user_name
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

// ========== USER MANAGEMENT ==========

export const deleteUser = async (userId: string): Promise<void> => {
    try {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

export const suspendUser = async (userId: string): Promise<void> => {
    try {
        const { error } = await supabase.from('profiles').update({ status: 'suspended' }).eq('id', userId);
        if (error) throw error;
    } catch (error) {
        console.error('Error suspending user:', error);
        throw error;
    }
};

export const blockUser = async (userId: string): Promise<void> => {
    try {
        const { error } = await supabase.from('profiles').update({ status: 'blocked' }).eq('id', userId);
        if (error) throw error;
    } catch (error) {
        console.error('Error blocking user:', error);
        throw error;
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
    try {
        await supabase.from('admin_logs').insert({
            admin_id: adminId,
            admin_name: adminName,
            action,
            details,
            target_user_id: targetUserId,
            timestamp: new Date().toISOString()
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
                avatar: u.avatar_config || { baseColor: '#1E293B', accessory: 'none', aura: 'none', currentLevel: u.level || 1 }
            } as User))
            .filter(u => {
                const name = (u.name || '').toLowerCase();
                const username = (u.username || '').toLowerCase();
                const phone = (u.phoneNumber || '').toLowerCase();

                const isAdmin =
                    name === 'administrateur principal' ||
                    username === ADMIN_USERNAME.toLowerCase() ||
                    phone === ADMIN_USERNAME.toLowerCase();

                return !isAdmin;
            })
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

export const unblockUser = async (userId: string): Promise<void> => {
    try {
        const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', userId);
        if (error) throw error;
        await logAdminAction('system', 'System', 'user_activity', { type: 'unblock' }, userId);
    } catch (error) {
        console.error('Error unblocking user:', error);
        throw error;
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
            .select('id, name, email, phone_number, age_range, gender, status, level, total_xp, created_at, last_active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (users || []).map(u => ({
            "ID Utilisateur": u.id,
            "Nom": u.name,
            "Email": u.email,
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
        const stats = await getDemographicStats();
        return stats.crossTable.map(row => ({
            "Tranche d'Âge": row.ageRange,
            "Hommes": row.HOMME,
            "Femmes": row.FEMME,
            "Inconnu": row.AUTRE || 0,
            "Total": row.total
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
            .select('gender, age_range');
        if (error) throw error;

        const stats = {
            byGender: { HOMME: 0, FEMME: 0, AUTRE: 0, TOTAL: 0 },
            byAge: {
                '15-18': 0,
                '19-23': 0,
                '24+': 0,
                'unknown': 0,
                total: 0
            },
            crossTable: [] as { ageRange: string; HOMME: number; FEMME: number; AUTRE: number; total: number }[]
        };

        const crossMap: Record<string, { HOMME: number; FEMME: number; AUTRE: number }> = {
            '15-18': { HOMME: 0, FEMME: 0, AUTRE: 0 },
            '19-23': { HOMME: 0, FEMME: 0, AUTRE: 0 },
            '24+': { HOMME: 0, FEMME: 0, AUTRE: 0 },
            'unknown': { HOMME: 0, FEMME: 0, AUTRE: 0 }
        };

        users.forEach(user => {
            // Gender Stats
            const gender = user.gender === 'HOMME' || user.gender === 'FEMME' ? user.gender : 'AUTRE';
            stats.byGender[gender]++;
            stats.byGender.TOTAL++;

            // Age Stats
            const age = user.age_range || 'unknown';
            const targetAge = (crossMap[age]) ? age : 'unknown';
            stats.byAge[targetAge as keyof typeof stats.byAge]++;
            stats.byAge.total++;

            // Cross Table Data
            crossMap[targetAge][gender]++;
        });

        // Format Cross Table
        stats.crossTable = Object.entries(crossMap).map(([age, genders]) => ({
            ageRange: age === 'unknown' ? 'Non spécifié' : age,
            HOMME: genders.HOMME,
            FEMME: genders.FEMME,
            AUTRE: genders.AUTRE,
            total: genders.HOMME + genders.FEMME + genders.AUTRE
        }));

        return stats;
    } catch (error) {
        console.error('Error getting demographic stats:', error);
        return {
            byGender: { HOMME: 0, FEMME: 0, AUTRE: 0, TOTAL: 0 },
            byAge: { '15-18': 0, '19-23': 0, '24+': 0, 'unknown': 0, total: 0 },
            crossTable: []
        };
    }
};

export const exportDemographicData = (stats: any, type: 'pdf' | 'csv' | 'json') => {
    if (!stats) return;

    if (type === 'json') {
        const dataStr = JSON.stringify(stats, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `demographics_report_${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    } else if (type === 'csv') {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Type,Category,Value\n";

        // Gender
        csvContent += `Gender,HOMME,${stats.byGender.HOMME}\n`;
        csvContent += `Gender,FEMME,${stats.byGender.FEMME}\n`;
        csvContent += `Gender,TOTAL,${stats.byGender.TOTAL}\n`;

        // Age
        Object.entries(stats.byAge).forEach(([key, value]) => {
            if (key !== 'total') csvContent += `Age,${key},${value}\n`;
        });

        // Cross Table
        csvContent += "\nCross Table (Age x Gender)\n";
        csvContent += "Age Range,Male,Female,Total\n";
        stats.crossTable.forEach((row: any) => {
            csvContent += `${row.ageRange},${row.HOMME},${row.FEMME},${row.total}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `demographics_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// ========== SHOP MANAGEMENT ==========

export const getAllShopItems = async (): Promise<ShopItem[]> => {
    try {
        const { data, error } = await supabase
            .from('shop_items')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return (data || []).map(item => ({
            ...item,
            firestoreId: item.id // Keep alias for compatibility
        } as ShopItem));
    } catch (error) {
        console.error('Error getting shop items:', error);
        throw error;
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
        if (item.id) payload.id = item.id;
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

        const payload: any = {
            updated_at: new Date().toISOString()
        };
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

        const { error } = await supabase.from('shop_items').delete().eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting shop item:', error);
        throw error;
    }
};
