export type NotificationType =
    | 'study_reminder'
    | 'mission_available'
    | 'exam_approaching'
    | 'streak_risk'
    | 'achievement';

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionUrl?: string;
}

class NotificationService {
    private static instance: NotificationService;
    private permission: NotificationPermission = 'default';

    private constructor() {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    public async requestPermission(): Promise<boolean> {
        if (typeof window === 'undefined' || !('Notification' in window)) return false;

        const result = await Notification.requestPermission();
        this.permission = result;
        return result === 'granted';
    }

    public send(title: string, options?: NotificationOptions) {
        if (this.permission === 'granted') {
            new Notification(title, {
                icon: '/logo.png',
                ...options
            });
        }

        // Sound is handled by usage of audioService.playNotification() in useStore.addNotification
    }

    public createLocalNotification(type: NotificationType, title: string, message: string): AppNotification {
        return {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            title,
            message,
            timestamp: new Date().toISOString(),
            read: false
        };
    }
}

export const notificationService = NotificationService.getInstance();
