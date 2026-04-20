import { supabase } from './supabase';

export type ActivityType = 'auth' | 'quiz' | 'library' | 'social' | 'system' | 'creative' | 'profile' | 'badge' | 'payment';

export interface UserActivity {
    id?: string;
    userId: string;
    userName: string;
    type: ActivityType;
    action: string;
    details?: any;
    timestamp: string; // ISO string 
    metadata?: {
        device?: string;
        location?: string;
        ip?: string;
    };
}

const TABLE_NAME = 'user_activities';

/**
 * Logs a user activity to Supabase
 */
export const logUserActivity = async (
    userId: string,
    userName: string,
    type: ActivityType,
    action: string,
    details: any = {}
) => {
    try {
        const { error } = await supabase.from(TABLE_NAME).insert({
            user_id: userId,
            user_name: userName,
            type,
            action,
            details,
            timestamp: new Date().toISOString()
        });

        if (error) {
            console.error('Error logging activity to Supabase:', error);
        }
    } catch (error) {
        console.error('Exception logging activity:', error);
    }
};

/**
 * Subscribes to the latest activities for real-time monitoring
 */
export const subscribeToActivities = (
    callback: (activities: UserActivity[]) => void,
    limitCount: number = 50
) => {
    const fetchInitial = async () => {
        const { data } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limitCount);
        
        if (data) {
            callback(data.map(item => ({
                id: item.id,
                userId: item.user_id,
                userName: item.user_name,
                type: item.type,
                action: item.action,
                details: item.details,
                timestamp: item.timestamp
            } as UserActivity)));
        }
    };

    fetchInitial();

    const channel = supabase
        .channel('public:user_activities')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE_NAME }, () => {
            fetchInitial();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

/**
 * Gets recent activities once (non-realtime)
 */
export const getRecentActivities = async (limitCount: number = 20): Promise<UserActivity[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limitCount);
        
        if (error) throw error;
        return (data || []).map(item => ({
            id: item.id,
            userId: item.user_id,
            userName: item.user_name,
            type: item.type,
            action: item.action,
            details: item.details,
            timestamp: item.timestamp
        } as UserActivity));
    } catch (error) {
        console.error('Error getting recent activities:', error);
        return [];
    }
};

// ========== RETENTION ANALYSIS ==========

export interface RetentionData {
    period: string; // "Janvier 2024"
    cohortSize: number;
    days: {
        day1: number; // Percentage
        day7: number;
        day30: number;
    };
}

/**
 * Calculates retention stats using Supabase data
 */
export const calculateRetentionStats = async (): Promise<RetentionData[]> => {
    try {
        // 1. Get all profiles to determine cohorts
        const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('id, created_at');
        
        if (userError || !users) throw userError || new Error('No users found');

        // 2. Get auth activities for login history
        const { data: logs, error: logError } = await supabase
            .from(TABLE_NAME)
            .select('user_id, timestamp')
            .eq('type', 'auth');

        if (logError || !logs) throw logError || new Error('No logs found');

        const activityLogs = logs.map(l => ({
            userId: l.user_id,
            timestamp: new Date(l.timestamp)
        }));

        // 3. Group users by Cohort (Month of creation)
        const cohorts: Record<string, string[]> = {}; 
        
        users.forEach(user => {
            const createdAt = new Date(user.created_at);
            const cohortKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;

            if (!cohorts[cohortKey]) cohorts[cohortKey] = [];
            cohorts[cohortKey].push(user.id);
        });

        // 4. Calculate Retention per Cohort
        const results: RetentionData[] = [];

        for (const [cohortKey, userIds] of Object.entries(cohorts)) {
            const [year, month] = cohortKey.split('-');
            const cohortDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            
            let retainedDay1 = 0;
            let retainedDay7 = 0;
            let retainedDay30 = 0;

            userIds.forEach(userId => {
                const userLogs = activityLogs.filter(l => l.userId === userId);
                const userProfile = users.find(u => u.id === userId);
                if (!userProfile) return;

                const signupDate = new Date(userProfile.created_at);

                if (userLogs.length > 0) {
                    const hasDay1 = userLogs.some(l => (l.timestamp.getTime() - signupDate.getTime()) > 24 * 60 * 60 * 1000);
                    const hasDay7 = userLogs.some(l => (l.timestamp.getTime() - signupDate.getTime()) > 7 * 24 * 60 * 60 * 1000);
                    const hasDay30 = userLogs.some(l => (l.timestamp.getTime() - signupDate.getTime()) > 30 * 24 * 60 * 60 * 1000);

                    if (hasDay1) retainedDay1++;
                    if (hasDay7) retainedDay7++;
                    if (hasDay30) retainedDay30++;
                }
            });

            results.push({
                period: cohortDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                cohortSize: userIds.length,
                days: {
                    day1: Math.round((retainedDay1 / userIds.length) * 100) || 0,
                    day7: Math.round((retainedDay7 / userIds.length) * 100) || 0,
                    day30: Math.round((retainedDay30 / userIds.length) * 100) || 0,
                }
            });
        }

        return results.sort((a, b) => b.period.localeCompare(a.period));

    } catch (error) {
        console.error("Error calculating retention:", error);
        return [];
    }
};
