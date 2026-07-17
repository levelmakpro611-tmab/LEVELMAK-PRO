import { supabase } from './supabase';
import { LocalNotifications } from '@capacitor/local-notifications';

export type AdminNotifType = 'new_comment' | 'new_teacher' | 'new_user' | 'new_rating' | 'system';

export interface AdminNotification {
    id: string;
    type: AdminNotifType;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionTab?: string; // e.g. 'comments', 'teachers', 'users'
    metadata?: any;
}

const STORAGE_KEY = 'levelmak_admin_notifications';

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadFromStorage(): AdminNotification[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveToStorage(notifications: AdminNotification[]) {
    try {
        // Keep last 50
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
    } catch {}
}

function createNotif(
    type: AdminNotifType,
    title: string,
    message: string,
    actionTab?: string,
    metadata?: any,
    id?: string
): AdminNotification {
    return {
        id: id || `admin_notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        actionTab,
        metadata
    };
}

// ── Main Service ──────────────────────────────────────────────────────────────

class AdminNotificationService {
    private static instance: AdminNotificationService;
    private subscribers: Array<(notifs: AdminNotification[]) => void> = [];
    private notifications: AdminNotification[] = loadFromStorage();
    private realtimeSubscriptions: any[] = [];

    private constructor() {
        this.initNativeNotifications();
    }

    private async initNativeNotifications() {
        try {
            const status = await LocalNotifications.checkPermissions();
            if (status.display !== 'granted') {
                await LocalNotifications.requestPermissions();
            }
        } catch (err) {
            console.warn('LocalNotifications permissions error:', err);
        }
    }

    public static getInstance(): AdminNotificationService {
        if (!AdminNotificationService.instance) {
            AdminNotificationService.instance = new AdminNotificationService();
        }
        return AdminNotificationService.instance;
    }

    // Subscribe to notification updates
    public subscribe(callback: (notifs: AdminNotification[]) => void): () => void {
        this.subscribers.push(callback);
        callback(this.notifications); // immediately deliver current state
        return () => {
            this.subscribers = this.subscribers.filter(s => s !== callback);
        };
    }

    private notify() {
        saveToStorage(this.notifications);
        this.subscribers.forEach(s => s([...this.notifications]));
    }

    public getAll(): AdminNotification[] {
        return this.notifications;
    }

    public getUnreadCount(): number {
        return this.notifications.filter(n => !n.read).length;
    }

    public markAsRead(id: string) {
        this.notifications = this.notifications.map(n => n.id === id ? { ...n, read: true } : n);
        this.notify();
    }

    public markAllAsRead() {
        this.notifications = this.notifications.map(n => ({ ...n, read: true }));
        this.notify();
    }

    public deleteNotification(id: string) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.notify();
    }

    public clearAllNotifications() {
        this.notifications = [];
        this.notify();
    }

    public addNotification(notif: AdminNotification) {
        // 1. Strict duplicate check by ID
        if (this.notifications.some(n => n.id === notif.id)) {
            return;
        }

        // 2. Secondary check: Avoid near-identical content within 15 seconds (prevents double Realtime events)
        const recentDuplicate = this.notifications.find(n =>
            n.type === notif.type &&
            n.message === notif.message &&
            (Date.now() - new Date(n.timestamp).getTime()) < 15000
        );
        if (recentDuplicate) return;

        this.notifications = [notif, ...this.notifications].slice(0, 50);
        this.triggerNativeNotification(notif);
        this.notify();
    }

    private async triggerNativeNotification(notif: AdminNotification) {
        try {
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: notif.title,
                        body: notif.message,
                        id: Math.floor(Math.random() * 1000000),
                        schedule: { at: new Date(Date.now() + 500) }, // slight delay for feel
                        sound: 'default',
                        attachments: [],
                        actionTypeId: '',
                        extra: { tab: notif.actionTab }
                    }
                ]
            });
        } catch (err) {
            console.warn('Failed to trigger native notification:', err);
        }
    }

    // ── Realtime Supabase Listeners ──────────────────────────────────────────

    public startListening() {
        this.stopListening();

        // Listen for new comments
        const commentChannel = supabase
            .channel('admin-new-comments')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'user_comments'
            }, (payload) => {
                const row = payload.new as any;
                if (row.category === 'password_reset') {
                    this.addNotification(createNotif(
                        'system',
                        '🔑 Récupération de compte',
                        `Demande d'aide : ${row.content}`,
                        'comments',
                        { commentId: row.id },
                        `comment_${row.id}`
                    ));
                } else {
                    this.addNotification(createNotif(
                        'new_comment',
                        '💬 Nouveau commentaire',
                        `${row.user_name || 'Un utilisateur'} a laissé un avis : "${(row.content || '').substring(0, 60)}${row.content?.length > 60 ? '...' : ''}"`,
                        'comments',
                        { commentId: row.id },
                        `comment_${row.id}`
                    ));
                }
            })
            .subscribe();

        // Listen for new teacher applications
        const teacherChannel = supabase
            .channel('admin-new-teachers')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'teachers'
            }, (payload) => {
                const row = payload.new as any;
                this.addNotification(createNotif(
                    'new_teacher',
                    '🎓 Nouvelle candidature professeur',
                    `${row.name || 'Un enseignant'} a soumis une candidature (${row.type === 'professional' ? 'Professionnel' : 'Bénévole'})`,
                    'teachers',
                    { teacherId: row.id },
                    `teacher_${row.id}`
                ));
            })
            .subscribe();

        // Listen for new users
        const userChannel = supabase
            .channel('admin-new-users')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'profiles'
            }, (payload) => {
                const row = payload.new as any;
                this.addNotification(createNotif(
                    'new_user',
                    '👤 Nouvel utilisateur inscrit',
                    `${row.name || 'Un nouvel élève'} vient de rejoindre LevelMak !`,
                    'users',
                    { userId: row.id },
                    `user_${row.id}`
                ));
            })
            .subscribe();

        // Listen for new ratings
        const ratingChannel = supabase
            .channel('admin-new-ratings')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'user_ratings'
            }, (payload) => {
                const row = payload.new as any;
                const stars = '⭐'.repeat(Math.min(row.overall || 5, 5));
                this.addNotification(createNotif(
                    'new_rating',
                    `${stars} Nouvelle évaluation`,
                    `${row.user_name || 'Un utilisateur'} a noté l'application ${row.overall || '?'}/5`,
                    'ratings',
                    { ratingId: row.id },
                    `rating_${row.id}`
                ));
            })
            .subscribe();

        this.realtimeSubscriptions = [commentChannel, teacherChannel, userChannel, ratingChannel];
    }

    public stopListening() {
        this.realtimeSubscriptions.forEach(channel => {
            supabase.removeChannel(channel);
        });
        this.realtimeSubscriptions = [];
    }

    // ── Initial Load from DB ─────────────────────────────────────────────────

    public async loadInitialNotifications() {
        try {
            // Load last 30 days of notifications to ensure the panel is populated
            const historyRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const [commentsRes, teachersRes, usersRes, ratingsRes] = await Promise.allSettled([
                supabase.from('user_comments').select('id, user_name, content, timestamp, category').gte('timestamp', historyRange).order('timestamp', { ascending: false }).limit(15),
                supabase.from('teachers').select('id, name, type, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
                supabase.from('profiles').select('id, name, created_at').gte('created_at', historyRange).order('created_at', { ascending: false }).limit(15),
                supabase.from('user_ratings').select('id, user_name, overall, timestamp').gte('timestamp', historyRange).order('timestamp', { ascending: false }).limit(10),
            ]);

            const generated: AdminNotification[] = [];

            if (commentsRes.status === 'fulfilled' && commentsRes.value.data) {
                commentsRes.value.data.forEach(row => {
                    if (row.category === 'password_reset') {
                        generated.push({
                            ...createNotif(
                                'system',
                                '🔑 Récupération de compte',
                                `Demande d'aide : ${row.content}`,
                                'comments',
                                { commentId: row.id },
                                `comment_${row.id}`
                            ),
                            timestamp: row.timestamp,
                            read: true // mark historical as read
                        });
                    } else {
                        generated.push({
                            ...createNotif(
                                'new_comment',
                                '💬 Commentaire reçu',
                                `${row.user_name || 'Utilisateur'} : "${(row.content || '').substring(0, 60)}${(row.content?.length || 0) > 60 ? '...' : ''}"`,
                                'comments',
                                { commentId: row.id },
                                `comment_${row.id}`
                            ),
                            timestamp: row.timestamp,
                            read: true // mark historical as read
                        });
                    }
                });
            }

            if (teachersRes.status === 'fulfilled' && teachersRes.value.data) {
                teachersRes.value.data.forEach(row => {
                    generated.push({
                        ...createNotif(
                            'new_teacher',
                            '🎓 Candidature en attente',
                            `${row.name} attend votre validation (${row.type === 'professional' ? 'Pro' : 'Bénévole'})`,
                            'teachers',
                            { teacherId: row.id },
                            `teacher_${row.id}`
                        ),
                        timestamp: row.created_at,
                        read: false // always unread for pending teachers
                    });
                });
            }

            if (usersRes.status === 'fulfilled' && usersRes.value.data) {
                usersRes.value.data.forEach(row => {
                    generated.push({
                        ...createNotif(
                            'new_user',
                            '👤 Nouvel utilisateur',
                            `${row.name || 'Utilisateur'} a rejoint LevelMak`,
                            'users',
                            { userId: row.id },
                            `user_${row.id}`
                        ),
                        timestamp: row.created_at,
                        read: true
                    });
                });
            }

            if (ratingsRes.status === 'fulfilled' && ratingsRes.value.data) {
                ratingsRes.value.data.forEach(row => {
                    const stars = '⭐'.repeat(Math.min(row.overall || 5, 5));
                    generated.push({
                        ...createNotif(
                            'new_rating',
                            `${stars} Évaluation de l'app`,
                            `${row.user_name || 'Utilisateur'} a noté l'application ${row.overall}/5`,
                            'ratings',
                            { ratingId: row.id },
                            `rating_${row.id}`
                        ),
                        timestamp: row.timestamp,
                        read: true
                    });
                });
            }

            // Sort all generated notifications by timestamp descending
            generated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            // Merge with existing local ones (local ones take priority if same id)
            const existingIds = new Set(this.notifications.map(n => n.id));
            const newOnes = generated.filter(n => !existingIds.has(n.id));
            this.notifications = [...this.notifications, ...newOnes]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 50);

            this.notify();
        } catch (err) {
            console.warn('adminNotificationService.loadInitialNotifications error:', err);
        }
    }
}

export const adminNotificationService = AdminNotificationService.getInstance();
