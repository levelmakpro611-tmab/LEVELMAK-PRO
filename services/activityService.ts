import { db } from './firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';

export type ActivityType = 'auth' | 'quiz' | 'library' | 'social' | 'system' | 'creative';

export interface UserActivity {
    id?: string;
    userId: string;
    userName: string;
    type: ActivityType;
    action: string;
    details?: any;
    timestamp: string; // ISO string for easy sorting/display
    createdAt?: Timestamp; // Firestore Timestamp
    metadata?: {
        device?: string;
        location?: string;
        ip?: string;
    };
}

const COLLECTION_NAME = 'user_activities';

/**
 * Logs a user activity to Firestore
 */
export const logUserActivity = async (
    userId: string,
    userName: string,
    type: ActivityType,
    action: string,
    details: any = {}
) => {
    try {
        const activity: UserActivity = {
            userId,
            userName,
            type,
            action,
            details,
            timestamp: new Date().toISOString()
        };

        await addDoc(collection(db, COLLECTION_NAME), {
            ...activity,
            createdAt: Timestamp.now()
        });

    } catch (error) {
        console.error('Error logging activity:', error);
        // Silent fail to not disrupt user experience
    }
};

/**
 * Subscribes to the latest activities for real-time monitoring
 */
export const subscribeToActivities = (
    callback: (activities: UserActivity[]) => void,
    limitCount: number = 50
) => {
    const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
        const activities = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as UserActivity));
        callback(activities);
    });
};

/**
 * Gets recent activities once (non-realtime)
 */
export const getRecentActivities = async (limitCount: number = 20) => {
    // Implementation if needed for static views
};

// ========== RETENTION ANALYSIS ==========

export interface RetentionData {
    period: string; // "Jan 2024"
    cohortSize: number;
    days: {
        day1: number; // Percentage
        day7: number;
        day30: number;
    };
}

export const calculateRetentionStats = async (): Promise<RetentionData[]> => {
    try {
        // 1. Get all users to determine cohorts (Registration Date)
        const usersSnapshot = await import('firebase/firestore').then(mod => mod.getDocs(mod.collection(db, 'users')));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        // 2. Get all 'auth' activities for login history
        // Note: In a real app with millions of logs, this would be done via aggregation queries or BigQuery.
        // For now, we fetch recent logs or all logs if feasible, but to prevent explosion we might limit or use a different strategy.
        // optimization: query only 'auth' type.
        const logsSnapshot = await import('firebase/firestore').then(mod =>
            mod.getDocs(mod.query(mod.collection(db, COLLECTION_NAME), mod.where('type', '==', 'auth')))
        );

        const logs = logsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                userId: data.userId,
                timestamp: data.timestamp ? new Date(data.timestamp) : (data.createdAt as Timestamp).toDate()
            };
        });

        // 3. Group users by Cohort (Month of creation)
        const cohorts: Record<string, string[]> = {}; // "2023-10": [userId1, userId2]
        const userCohortMap: Record<string, string> = {};

        users.forEach(user => {
            const createdAt = user.streak?.lastLogin ? new Date(user.streak.lastLogin) : new Date(); // Fallback if no creation date
            // Better fallback: user.createdAt if it existed, for now we assume they are recent or use lastLogin as proxy for "active" cohort if data missing
            // Ideally we need a 'createdAt' field on User. Let's assume we use what we have.
            const cohortKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;

            if (!cohorts[cohortKey]) cohorts[cohortKey] = [];
            cohorts[cohortKey].push(user.id);
            userCohortMap[user.id] = cohortKey;
        });

        // 4. Calculate Retention per Cohort
        const results: RetentionData[] = [];

        for (const [cohortKey, userIds] of Object.entries(cohorts)) {
            const cohortDate = new Date(`${cohortKey}-01`);
            let retainedDay1 = 0;
            let retainedDay7 = 0;
            let retainedDay30 = 0;

            userIds.forEach(userId => {
                const userLogs = logs.filter(l => l.userId === userId);
                // Check if user has activity >= 1 day after cohort start (simple approximation)
                // A better retention is: did they come back X days AFTER their SPECIFIC signup date? 
                // Since we lack precise signup date in this mock, we use the cohort month logic or simplified "active later" logic.

                // Let's refine: Did they have an activity > 24h after their approximate signup?
                // We'll search for logs.
                if (userLogs.length > 1) { // At least 2 logs implies returning
                    const firstLog = userLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
                    if (firstLog) {
                        const hasDay1 = userLogs.some(l => (l.timestamp.getTime() - firstLog.timestamp.getTime()) > 24 * 60 * 60 * 1000);
                        const hasDay7 = userLogs.some(l => (l.timestamp.getTime() - firstLog.timestamp.getTime()) > 7 * 24 * 60 * 60 * 1000);
                        const hasDay30 = userLogs.some(l => (l.timestamp.getTime() - firstLog.timestamp.getTime()) > 30 * 24 * 60 * 60 * 1000);

                        if (hasDay1) retainedDay1++;
                        if (hasDay7) retainedDay7++;
                        if (hasDay30) retainedDay30++;
                    }
                }
            });

            results.push({
                period: cohortDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                cohortSize: userIds.length,
                days: {
                    day1: Math.round((retainedDay1 / userIds.length) * 100),
                    day7: Math.round((retainedDay7 / userIds.length) * 100),
                    day30: Math.round((retainedDay30 / userIds.length) * 100),
                }
            });
        }

        // Sort by date desc
        return results.sort((a, b) => b.period.localeCompare(a.period));

    } catch (error) {
        console.error("Error calculating retention:", error);
        return [];
    }
};
