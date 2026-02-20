import { supabase } from './supabase';
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
    ShopItem
} from '../types';

// ========== CONSTANTS ==========
const ADMIN_USERNAME = 'levelmak611';
const ADMIN_PASSWORD = 'TMAB611';

// ========== ADMIN AUTHENTICATION ==========

export const submitComment = async (comment: Partial<UserComment>): Promise<void> => {
    try {
        const { error } = await supabase.from('user_comments').insert({
            user_id: comment.userId,
            user_name: comment.userName,
            content: comment.content,
            status: 'pending',
            timestamp: new Date().toISOString()
        });
        if (error) throw error;
    } catch (error) {
        console.error('Error submitting comment:', error);
        throw error;
    }
};

export const submitRating = async (rating: Omit<PlatformRating, 'id'>): Promise<void> => {
    try {
        const { error } = await supabase.from('user_ratings').insert({
            user_id: rating.userId,
            overall: rating.overall,
            features: rating.features,
            comment: rating.comment,
            timestamp: new Date().toISOString()
        });
        if (error) throw error;
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
            .select('role, name, phone_number')
            .eq('id', userId)
            .single();

        if (data) {
            if (data.role === 'admin') return 'admin';

            // Fallback check based on name or phone
            if (data.phone_number?.toLowerCase() === ADMIN_USERNAME.toLowerCase() ||
                data.name?.toLowerCase() === 'administrateur principal') {
                return 'admin';
            }
        }
        return 'user';
    } catch (error) {
        console.error('Error checking user role:', error);
        return 'user';
    }
};

// ========== STATISTICS ==========

export const getGlobalStats = async (period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<AdminStats> => {
    try {
        const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

        // Profiles active in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: activeUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gt('last_active', sevenDaysAgo.toISOString());

        const { data: allUsers } = await supabase.from('profiles').select('total_xp, stats, activities, last_active, created_at');

        if (!allUsers) throw new Error("Could not fetch users for stats");

        const now = new Date();
        const newUsersToday = allUsers.filter(u => isToday(u.created_at || '')).length;
        const newUsersWeek = allUsers.filter(u => isInPeriod(u.created_at || '', 7)).length;
        const newUsersMonth = allUsers.filter(u => isInPeriod(u.created_at || '', 30)).length;
        const newUsersYear = allUsers.filter(u => isInPeriod(u.created_at || '', 365)).length;

        const quizzesGenerated = allUsers.reduce((sum, u) => sum + (u.stats?.quizzesCompleted || 0), 0);
        const storiesWritten = allUsers.reduce((sum, u) => sum + (u.stats?.storiesWritten || 0), 0);
        const booksRead = allUsers.reduce((sum, u) => sum + (u.stats?.booksRead || 0), 0);
        const totalLearningHours = allUsers.reduce((sum, u) => sum + (u.stats?.hoursLearned || 0), 0);

        const quizzesToday = allUsers.reduce((sum, u) => {
            const todayActivities = (u.activities || []).filter((a: any) => a.type === 'quiz' && isToday(a.timestamp));
            return sum + todayActivities.length;
        }, 0);

        const averageEngagementRate = (totalUsers || 0) > 0 ? Number((((activeUsers || 0) / (totalUsers || 1)) * 100).toFixed(1)) : 0;

        return {
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            newUsersToday, newUsersWeek, newUsersMonth, newUsersYear,
            quizzesGenerated, quizzesToday, flashcardsCreated: 0, flashcardsToday: 0,
            storiesWritten, storiesToday: 0, booksRead, booksToday: 0,
            totalLearningHours, averageEngagementRate
        };
    } catch (error) {
        console.error('Error getting global stats:', error);
        throw error;
    }
};

// ========== USER ANALYTICS ==========

export const getUserAnalytics = async (limitCount: number = 50): Promise<AdminUserAnalytics[]> => {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
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
            lastActive: user.last_active,
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
            content: c.content,
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

        const overall = ratings.reduce((s, r) => s + r.overall, 0) / count;

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
        console.error('Error getting admin logs:', error);
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
            targetType: r.target_type,
            reason: r.reason,
            details: r.details,
            status: r.status,
            adminNote: r.admin_note,
            resolvedAt: r.resolved_at,
            timestamp: r.timestamp
        } as Report));
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
    // For now we might mock or reuse admin logs if security logs aren't separate.
    // Let's reuse admin logs that are related to security or auth.
    return []; // Placeholder until security logs are fully separated
};

// ========== DATA EXPORT ==========

export const exportUserData = async (): Promise<any[]> => {
    try {
        const users = await getUserAnalytics();
        return users.map((u: AdminUserAnalytics) => ({
            "ID Utilisateur": u.userId,
            "Nom": u.userName,
            "Email": u.email,
            "Téléphone": u.phoneNumber || 'N/A',
            "Âge": u.ageRange || 'N/A',
            "Genre": u.gender || 'N/A',
            "Éducation": u.education || 'N/A',
            "Niveau": u.level,
            "XP": u.xp,
            "Date Inscription": u.registrationDate,
            "Dernière Activité": u.lastActive,
            "Statut": u.status
        }));
    } catch (error) {
        console.error('Error exporting user data:', error);
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
        const { data: users, error } = await supabase.from('profiles').select('*');
        if (error) throw error;

        const stats = {
            byGender: { HOMME: 0, FEMME: 0, TOTAL: 0 },
            byAge: {
                '15-18': 0,
                '19-23': 0,
                '24+': 0,
                'unknown': 0,
                total: 0
            },
            crossTable: [] as { ageRange: string; HOMME: number; FEMME: number; total: number }[]
        };

        const crossMap: Record<string, { HOMME: number; FEMME: number }> = {
            '15-18': { HOMME: 0, FEMME: 0 },
            '19-23': { HOMME: 0, FEMME: 0 },
            '24+': { HOMME: 0, FEMME: 0 },
            'unknown': { HOMME: 0, FEMME: 0 }
        };

        users.forEach(user => {
            // Gender Stats
            if (user.gender === 'HOMME') stats.byGender.HOMME++;
            else if (user.gender === 'FEMME') stats.byGender.FEMME++;
            stats.byGender.TOTAL++;

            // Age Stats
            const age = user.ageRange || 'unknown';
            if (stats.byAge[age as keyof typeof stats.byAge] !== undefined) {
                stats.byAge[age as keyof typeof stats.byAge]++;
            } else {
                stats.byAge.unknown++;
            }
            stats.byAge.total++;

            // Cross Table Data
            const genderKey = (user.gender === 'HOMME' || user.gender === 'FEMME') ? user.gender : 'HOMME'; // Default/Fallback to avoid crash, or handle 'Autre' if we add it

            // Safe update for crossMap
            const targetAge = (crossMap[age]) ? age : 'unknown';
            if (user.gender === 'HOMME' || user.gender === 'FEMME') {
                crossMap[targetAge][user.gender]++;
            }
        });

        // Format Cross Table
        stats.crossTable = Object.entries(crossMap).map(([age, genders]) => ({
            ageRange: age === 'unknown' ? 'Non spécifié' : age,
            HOMME: genders.HOMME,
            FEMME: genders.FEMME,
            total: genders.HOMME + genders.FEMME
        }));

        return stats;
    } catch (error) {
        console.error('Error getting demographic stats:', error);
        throw error;
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
        const querySnapshot = await getDocs(collection(db, 'shop_items'));
        return querySnapshot.docs.map(doc => ({
            ...doc.data() as Omit<ShopItem, 'firestoreId'>,
            firestoreId: doc.id
        }));
    } catch (error) {
        console.error('Error getting shop items:', error);
        throw error;
    }
};


export const addShopItem = async (item: Omit<ShopItem, 'firestoreId'>, imageFile?: File): Promise<string> => {
    try {
        let imageUrl = item.image || '';

        // Convert image to base64 and store directly in Firestore (avoids CORS issues)
        if (imageFile) {
            imageUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string || '');
                reader.readAsDataURL(imageFile);
            });
        }

        const docRef = await addDoc(collection(db, 'shop_items'), {
            ...item,
            image: imageUrl,
            createdAt: Timestamp.now()
        });

        return docRef.id;
    } catch (error) {
        console.error('Error adding shop item:', error);
        throw error;
    }
};

export const updateShopItem = async (
    firestoreId: string,
    updates: Partial<Omit<ShopItem, 'firestoreId'>>,
    newImage?: File
): Promise<void> => {
    try {
        let imageUrl = updates.image;

        if (newImage) {
            imageUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string || '');
                reader.readAsDataURL(newImage);
            });
        }

        await updateDoc(doc(db, 'shop_items', firestoreId), {
            ...updates,
            ...(imageUrl && { image: imageUrl }),
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error updating shop item:', error);
        throw error;
    }
};

export const deleteShopItem = async (firestoreId: string, imageUrl?: string): Promise<void> => {
    try {
        if (imageUrl && imageUrl.includes('firebase')) {
            try {
                const { storage } = await import('./firebase');
                const { ref, deleteObject } = await import('firebase/storage');
                const imageRef = ref(storage, imageUrl);
                await deleteObject(imageRef);
            } catch (err) {
                console.warn('Could not delete image:', err);
            }
        }

        await deleteDoc(doc(db, 'shop_items', firestoreId));
    } catch (error) {
        console.error('Error deleting shop item:', error);
        throw error;
    }
};
