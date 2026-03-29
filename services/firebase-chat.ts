import { supabase } from './supabase';

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: any;
    read: boolean;
    attachments?: string[];
    reactions?: { [emoji: string]: string[] };
}

export interface LearningStory {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    content: string;
    imageUrl?: string;
    backgroundColor?: string; // For text-only statuses
    type: 'achievement' | 'update' | 'quiz_score' | 'text';
    timestamp: any;
    expiresAt: any;
    views?: string[]; // Array of user IDs who viewed
    reactions?: { [emoji: string]: string[] };
}

export interface Conversation {
    id: string;
    participants: string[];
    participantNames: { [userId: string]: string };
    participantAvatars: { [userId: string]: string };
    lastMessage?: {
        text: string;
        senderId: string;
        timestamp: any;
    };
    lastUpdated: any;
    unreadCount: { [userId: string]: number };
    isGroup?: boolean;
    groupName?: string;
    groupAdmin?: string;
}

export interface Call {
    id: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    receiverId: string;
    receiverName?: string;
    receiverAvatar?: string;
    status: 'idle' | 'calling' | 'ongoing' | 'ended' | 'rejected';
    type: 'audio' | 'video';
    roomName: string;
    sdpOffer?: any;
    sdpAnswer?: any;
    timestamp: any;
}

export interface SocialPost {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    content: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    likes: string[]; // Array of user IDs who liked
    comments: {
        id: string;
        userId: string;
        userName: string;
        userAvatar: string;
        text: string;
        timestamp: any;
    }[];
    timestamp: any;
}

export interface UserPresence {
    userId: string;
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'away';
    lastSeen: any;
    typing?: { [conversationId: string]: boolean };
}

export const chatService = {
    /**
     * Initialiser la présence de l'utilisateur
     */
    async initUserPresence(userId: string, name: string, avatar: string) {
        const { error } = await supabase.from('profiles').update({
            status: 'online',
            last_active: new Date().toISOString()
        }).eq('id', userId);
        if (error) console.error('Error init presence:', error);
    },

    /**
     * Mettre à jour le statut de l'utilisateur
     */
    async updateUserStatus(userId: string, status: 'online' | 'offline' | 'away') {
        const { error } = await supabase.from('profiles').update({
            status,
            last_active: new Date().toISOString()
        }).eq('id', userId);
        if (error) console.error('Error update status:', error);
    },

    /**
     * Rechercher des utilisateurs
     */
    async searchUsers(searchTerm: string, currentUserId: string): Promise<UserPresence[]> {
      try {
        // Try full select first, fallback to minimal if columns don't exist
        let data: any[] | null = null;
        
        const fullQuery = await supabase
            .from('profiles')
            .select('id, name, avatar_config, status, last_active')
            .ilike('name', `%${searchTerm}%`)
            .neq('id', currentUserId)
            .limit(20);

        if (fullQuery.error) {
            console.warn('[Community] Full search query failed, trying minimal:', fullQuery.error?.message);
            // Fallback: minimal columns only
            const minimalQuery = await supabase
                .from('profiles')
                .select('id, name, avatar_config')
                .ilike('name', `%${searchTerm}%`)
                .neq('id', currentUserId)
                .limit(20);
            if (minimalQuery.error) {
                console.error('[Community] Search completely failed:', JSON.stringify(minimalQuery.error));
                return [];
            }
            data = minimalQuery.data;
        } else {
            data = fullQuery.data;
        }

        return (data || []).map((u: any) => ({
            userId: u.id,
            name: u.name || 'Utilisateur',
            avatar: u.avatar_config?.image || u.avatar_config?.baseColor || '#3B82F6',
            status: (u.status || 'offline') as any,
            lastSeen: u.last_active || null,
            online: u.status === 'online'
        }));
      } catch (err) {
        console.error('[Community] searchUsers crashed:', err);
        return [];
      }
    },

    /**
     * Récupérer tous les utilisateurs
     */
    async getAllUsers(currentUserId: string): Promise<UserPresence[]> {
      try {
        console.log('[Community] Fetching all users for discovery...');
        let data: any[] | null = null;

        // Try full select first
        const fullQuery = await supabase
            .from('profiles')
            .select('id, name, avatar_config, status, last_active')
            .neq('id', currentUserId)
            .limit(100);

        if (fullQuery.error) {
            console.warn('[Community] Full query failed:', fullQuery.error?.message, '— trying minimal query...');
            // Fallback: query with only guaranteed columns
            const minimalQuery = await supabase
                .from('profiles')
                .select('id, name, avatar_config')
                .neq('id', currentUserId)
                .limit(100);

            if (minimalQuery.error) {
                console.error('[Community] ALL queries failed:', JSON.stringify(minimalQuery.error));
                return [];
            }
            data = minimalQuery.data;
        } else {
            data = fullQuery.data;
        }

        console.log(`[Community] Found ${data?.length || 0} users`);

        const users: UserPresence[] = (data || []).map((u: any) => ({
            userId: u.id,
            name: u.name || 'Utilisateur',
            avatar: u.avatar_config?.image || u.avatar_config?.baseColor || '#3B82F6',
            status: (u.status || 'offline') as any,
            lastSeen: u.last_active || null,
            online: u.status === 'online'
        }));

        // Sort: online first, then by name
        return users.sort((a, b) => {
            if (a.status === 'online' && b.status !== 'online') return -1;
            if (a.status !== 'online' && b.status === 'online') return 1;
            return a.name.localeCompare(b.name);
        });
      } catch (err) {
        console.error('[Community] getAllUsers crashed:', err);
        return [];
      }
    },

    /**
     * Envoyer une demande d'ami
     */
    async sendFriendRequest(fromUserId: string, toUserId: string) {
        // En Supabase, on pourrait utiliser une table 'friendships' ou un champ JSONB
        // Pour rester simple et compatible avec l'existant, on met à jour profiles.friend_requests
        const { data: profile } = await supabase.from('profiles').select('friend_requests').eq('id', toUserId).single();
        const requests = profile?.friend_requests || [];
        if (!requests.includes(fromUserId)) {
            await supabase.from('profiles').update({
                friend_requests: [...requests, fromUserId]
            }).eq('id', toUserId);
        }
    },

    /**
     * Accepter une demande d'ami
     */
    async acceptFriendRequest(userId: string, friendId: string) {
        // Update user
        const { data: userProfile } = await supabase.from('profiles').select('friends, friend_requests').eq('id', userId).single();
        const userFriends = userProfile?.friends || [];
        const userRequests = userProfile?.friend_requests || [];

        await supabase.from('profiles').update({
            friends: [...userFriends, friendId],
            friend_requests: userRequests.filter((id: string) => id !== friendId)
        }).eq('id', userId);

        // Update friend
        const { data: friendProfile } = await supabase.from('profiles').select('friends').eq('id', friendId).single();
        const friendFriends = friendProfile?.friends || [];

        await supabase.from('profiles').update({
            friends: [...friendFriends, userId]
        }).eq('id', friendId);
    },

    async getOrCreateConversation(userId1: string, userId2: string, userName1: string, userName2: string, avatar1: string, avatar2: string): Promise<string> {
        // Trier les participants pour assurer l'ordre et l'unicité
        const sortedIds = [userId1, userId2].sort();
        
        // Chercher une conversation existante (individuelle)
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select('id')
            .eq('is_group', false)
            .contains('participants', sortedIds);

        if (error) {
            console.error('Error fetching conversation:', error);
        }

        if (conversations && conversations.length > 0) {
            return conversations[0].id;
        }

        // Si pas de conversation, en créer une
        const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({
                participants: sortedIds,
                participant_names: {
                    [userId1]: userName1,
                    [userId2]: userName2
                },
                participant_avatars: {
                    [userId1]: avatar1,
                    [userId2]: avatar2
                },
                last_updated: new Date().toISOString(),
                unread_count: {
                    [userId1]: 0,
                    [userId2]: 0
                },
                is_group: false
            })
            .select()
            .single();

        if (createError) {
            console.error('[Community] Error creating conversation:', JSON.stringify(createError));
            throw new Error(createError.message || 'Erreur DB');
        }

        if (!newConv) throw new Error("La conversation n'a pas pu être créée");

        return newConv.id;
    },

    /**
     * Créer une conversation de groupe
     */
    async createGroupConversation(adminId: string, groupName: string, participants: UserPresence[]): Promise<string> {
        const participantIds = [adminId, ...participants.map(p => p.userId)];
        const participantNames: { [key: string]: string } = {};
        const participantAvatars: { [key: string]: string } = {};
        const unreadCount: { [key: string]: number } = {};

        // Récupérer le nom et avatar de l'admin
        const { data: adminData } = await supabase.from('profiles').select('name, avatar_config').eq('id', adminId).single();

        participantNames[adminId] = adminData?.name || 'Admin';
        participantAvatars[adminId] = adminData?.avatar_config?.baseColor || '#3B82F6';
        unreadCount[adminId] = 0;

        participants.forEach(p => {
            participantNames[p.userId] = p.name;
            participantAvatars[p.userId] = p.avatar;
            unreadCount[p.userId] = 0;
        });

        const { data: newGroup, error } = await supabase
            .from('conversations')
            .insert({
                participants: participantIds,
                participant_names: participantNames,
                participant_avatars: participantAvatars,
                group_name: groupName,
                group_admin: adminId,
                is_group: true,
                last_updated: new Date().toISOString(),
                unread_count: unreadCount
            })
            .select()
            .single();

        if (error) throw error;
        return newGroup.id;
    },

    /**
     * Envoyer un message (texte et/ou image)
     */
    async sendMessage(conversationId: string, senderId: string, senderName: string, text: string, imageUrl?: string) {
        // Ajouter le message
        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                sender_name: senderName,
                text,
                image_url: imageUrl || null,
                read: false,
                attachments: imageUrl ? [imageUrl] : [],
                timestamp: new Date().toISOString()
            });

        if (msgError) throw msgError;

        // Mettre à jour la conversation
        const { data: convData } = await supabase.from('conversations').select('participants, unread_count').eq('id', conversationId).single();
        const participants = convData?.participants || [];
        const unreadCount = convData?.unread_count || {};

        participants.forEach((id: string) => {
            if (id !== senderId) {
                unreadCount[id] = (unreadCount[id] || 0) + 1;
            }
        });

        await supabase.from('conversations').update({
            last_message: {
                text: imageUrl ? '📷 Photo' : text,
                sender_id: senderId,
                timestamp: new Date().toISOString()
            },
            last_updated: new Date().toISOString(),
            unread_count: unreadCount
        }).eq('id', conversationId);
    },

    /**
     * Upload an image for a chat message
     */
    async uploadChatMessageImage(file: File, userId: string): Promise<string> {
        const timestamp = Date.now();
        const fileName = `chats/${userId}/${timestamp}_${file.name}`;

        const { data, error } = await supabase.storage
            .from('assets')
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('assets')
            .getPublicUrl(data.path);

        return publicUrl;
    },

    /**
     * Marquer les messages comme lus
     */
    async markAsRead(conversationId: string, userId: string) {
        const { data: conv } = await supabase.from('conversations').select('unread_count').eq('id', conversationId).single();
        const unreadCount = conv?.unread_count || {};
        unreadCount[userId] = 0;

        await supabase.from('conversations').update({
            unread_count: unreadCount
        }).eq('id', conversationId);

        // Optionnel: mettre à jour tous les messages comme lus pour cet utilisateur
        // await supabase.from('messages').update({ read: true }).eq('conversation_id', conversationId).neq('sender_id', userId);
    },

    /**
     * Écouter les conversations en temps réel
     */
    listenToConversations(userId: string, callback: (conversations: Conversation[]) => void) {
        // Fetch initial data
        const fetchConversations = async () => {
            const { data } = await supabase
                .from('conversations')
                .select('*')
                .contains('participants', [userId])
                .order('last_updated', { ascending: false });

            if (data) {
                callback(data.map(c => ({
                    id: c.id,
                    participants: c.participants,
                    participantNames: c.participant_names,
                    participantAvatars: c.participant_avatars,
                    lastMessage: c.last_message,
                    lastUpdated: c.last_updated,
                    unreadCount: c.unread_count,
                    isGroup: c.is_group,
                    groupName: c.group_name,
                    groupAdmin: c.group_admin
                } as Conversation)));
            }
        };

        fetchConversations();

        // Subscribe to changes
        const channel = supabase
            .channel(`public:conversations:participants=cs.{${userId}}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'conversations',
                filter: `participants=cs.{${userId}}`
            }, () => {
                fetchConversations();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Écouter les messages d'une conversation
     */
    listenToMessages(conversationId: string, callback: (messages: ChatMessage[]) => void) {
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('timestamp', { ascending: true });

            if (data) {
                callback(data.map(m => ({
                    id: m.id,
                    senderId: m.sender_id,
                    senderName: m.sender_name,
                    text: m.text,
                    timestamp: m.timestamp,
                    read: m.read,
                    attachments: m.attachments,
                    reactions: m.reactions
                } as ChatMessage)));
            }
        };

        fetchMessages();

        const channel = supabase
            .channel(`public:messages:conversation_id=eq.${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, () => {
                fetchMessages();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Écouter la présence d'un utilisateur
     */
    listenToUserPresence(userId: string, callback: (presence: UserPresence | null) => void) {
        const fetchPresence = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, name, avatar_config, status, last_active, typing')
                .eq('id', userId)
                .single();

            if (data) {
                callback({
                    userId: data.id,
                    name: data.name,
                    avatar: data.avatar_config?.baseColor || '#3B82F6',
                    status: data.status as any,
                    lastSeen: data.last_active,
                    typing: data.typing
                });
            }
        };

        fetchPresence();

        const channel = supabase
            .channel(`public:profiles:id=eq.${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${userId}`
            }, () => {
                fetchPresence();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Mettre à jour l'état "en train d'écrire"
     */
    async setTyping(userId: string, conversationId: string, isTyping: boolean) {
        const { data: profile } = await supabase.from('profiles').select('typing').eq('id', userId).single();
        const typing = profile?.typing || {};
        typing[conversationId] = isTyping;

        await supabase.from('profiles').update({
            typing: typing
        }).eq('id', userId);
    },

    /**
     * Obtenir les amis de l'utilisateur
     */
    async getFriends(userId: string): Promise<UserPresence[]> {
        const { data: profile } = await supabase.from('profiles').select('friends').eq('id', userId).single();
        const friendIds = profile?.friends || [];

        if (friendIds.length === 0) return [];

        const { data: friendsData } = await supabase
            .from('profiles')
            .select('id, name, avatar_config, status, last_active')
            .in('id', friendIds);

        return (friendsData || []).map(u => ({
            userId: u.id,
            name: u.name,
            avatar: u.avatar_config?.baseColor || '#3B82F6',
            status: u.status as any,
            lastSeen: u.last_active
        }));
    },

    /**
     * Démarrer un appel
     */
    async startCall(callerId: string, callerName: string, callerAvatar: string, receiverId: string, receiverName: string, receiverAvatar: string, type: 'audio' | 'video'): Promise<{ id: string; roomName: string }> {
        const roomName = `levelmak_${Math.random().toString(36).substring(7)}`;

        const { data, error } = await supabase
            .from('calls')
            .insert({
                caller_id: callerId,
                caller_name: callerName,
                caller_avatar: callerAvatar,
                receiver_id: receiverId,
                receiver_name: receiverName,
                receiver_avatar: receiverAvatar,
                status: 'calling',
                type,
                room_name: roomName,
                timestamp: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return { id: data.id, roomName };
    },

    /**
     * Répondre à un appel
     */
    async acceptCall(callId: string) {
        await supabase.from('calls').update({
            status: 'ongoing'
        }).eq('id', callId);
    },

    /**
     * Refuser ou terminer un appel
     */
    async endCall(callId: string, status: 'ended' | 'rejected' = 'ended', duration?: number) {
        const { data: callData, error: fetchError } = await supabase.from('calls').select('*').eq('id', callId).single();
        if (fetchError || !callData) return;

        await supabase.from('calls').update({
            status,
            // duration: duration || 0 // Assuming duration column exists if needed
        }).eq('id', callId);

        // Create a call message in the conversation
        try {
            const { data: conversations } = await supabase
                .from('conversations')
                .select('id, participants, unread_count')
                .contains('participants', [callData.caller_id, callData.receiver_id])
                .eq('is_group', false);

            const conversation = conversations?.[0];

            if (conversation) {
                const text = `Appel ${callData.type === 'video' ? 'vidéo' : 'vocal'}`;

                await supabase.from('messages').insert({
                    conversation_id: conversation.id,
                    type: 'call',
                    call_type: callData.type,
                    call_status: status,
                    call_duration: duration || 0,
                    sender_id: callData.caller_id,
                    sender_name: callData.caller_name,
                    text,
                    timestamp: new Date().toISOString()
                });

                // Update last message in conversation
                const unreadCount = conversation.unread_count || {};
                // If the call was rejected, maybe the caller missed it
                if (status === 'rejected') {
                    // Update unread count for the one who missed it (usually the receiver if rejected by them? 
                    // No, usually missed calls increase unread count for receiver)
                }

                await supabase.from('conversations').update({
                    last_message: {
                        text,
                        sender_id: callData.caller_id,
                        timestamp: new Date().toISOString()
                    },
                    last_updated: new Date().toISOString()
                }).eq('id', conversation.id);
            }
        } catch (error) {
            console.error('Error creating call message:', error);
        }
    },

    /**
     * Écouter les appels entrants
     */
    listenForIncomingCalls(userId: string, callback: (call: Call | null) => void) {
        const fetchIncomingCalls = async () => {
            const { data } = await supabase
                .from('calls')
                .select('*')
                .eq('receiver_id', userId)
                .eq('status', 'calling')
                .order('timestamp', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                const c = data[0];
                callback({
                    id: c.id,
                    callerId: c.caller_id,
                    callerName: c.caller_name,
                    callerAvatar: c.caller_avatar,
                    receiverId: c.receiver_id,
                    receiverName: c.receiver_name,
                    receiverAvatar: c.receiver_avatar,
                    status: c.status as any,
                    type: c.type as any,
                    roomName: c.room_name,
                    sdpOffer: c.sdp_offer,
                    sdpAnswer: c.sdp_answer,
                    timestamp: c.timestamp
                });
            } else {
                callback(null);
            }
        };

        fetchIncomingCalls();

        const channel = supabase
            .channel(`public:calls:receiver_id=eq.${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'calls',
                filter: `receiver_id=eq.${userId}`
            }, () => {
                fetchIncomingCalls();
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'calls',
                filter: `receiver_id=eq.${userId}`
            }, () => {
                fetchIncomingCalls();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Écouter le statut d'un appel spécifique
     */
    listenToCall(callId: string, callback: (call: Call | null) => void) {
        const fetchCall = async () => {
            const { data } = await supabase.from('calls').select('*').eq('id', callId).single();
            if (data) {
                callback({
                    id: data.id,
                    callerId: data.caller_id,
                    callerName: data.caller_name,
                    callerAvatar: data.caller_avatar,
                    receiverId: data.receiver_id,
                    receiverName: data.receiver_name,
                    receiverAvatar: data.receiver_avatar,
                    status: data.status as any,
                    type: data.type as any,
                    roomName: data.room_name,
                    sdpOffer: data.sdp_offer,
                    sdpAnswer: data.sdp_answer,
                    timestamp: data.timestamp
                });
            } else {
                callback(null);
            }
        };

        fetchCall();

        const channel = supabase
            .channel(`public:calls:id=eq.${callId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'calls',
                filter: `id=eq.${callId}`
            }, () => {
                fetchCall();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Mettre à jour le SDP (Offer ou Answer) pour WebRTC
     */
    async updateCallSDP(callId: string, sdp: any, type: 'offer' | 'answer') {
        const column = type === 'offer' ? 'sdp_offer' : 'sdp_answer';
        await supabase.from('calls').update({
            [column]: sdp
        }).eq('id', callId);
    },

    /**
     * Ajouter un ICE Candidate
     */
    async addCallIceCandidate(callId: string, candidate: any, type: 'caller' | 'receiver') {
        // Since we don't have separate sub-collections, we can use a JSONB column or a separate table
        // Let's use a separate table for cleaner signals if possible, or just a JSONB array in calls.
        // For simplicity and to avoid schema changes, let's assume we use a table 'call_candidates'
        await supabase.from('messages').insert({
            conversation_id: callId, // Using callId as a temporary "conversation" for signaling? 
            // Better: use a dedicated signal table.
            type: 'signal',
            text: JSON.stringify({ candidate, type }),
            sender_id: type === 'caller' ? 'caller' : 'receiver' as any, // Dummy
            timestamp: new Date().toISOString()
        });
    },

    /**
     * Écouter les ICE Candidates distants
     */
    listenForIceCandidates(callId: string, type: 'caller' | 'receiver', callback: (candidate: any) => void) {
        // This is tricky with Supabase without a dedicated signals table.
        // For a real production app, I'd use Supabase Realtime Broadcast.
        const channel = supabase.channel(`call_signals_${callId}`)
            .on('broadcast', { event: 'candidate' }, ({ payload }) => {
                if (payload.type !== type) {
                    callback(payload.candidate);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Version Broadcast pour envoyer des candidats (plus performant que DB pour signalisation)
     */
    async sendIceCandidate(callId: string, candidate: any, type: 'caller' | 'receiver') {
        const channel = supabase.channel(`call_signals_${callId}`);
        await channel.send({
            type: 'broadcast',
            event: 'candidate',
            payload: { candidate, type }
        });
    },

    /**
     * Ajouter une réaction à un message
     */
    async addReaction(conversationId: string, messageId: string, userId: string, emoji: string) {
        const { data: message } = await supabase.from('messages').select('reactions').eq('id', messageId).single();
        const reactions = message?.reactions || {};
        const emojiReactions = reactions[emoji] || [];

        if (emojiReactions.includes(userId)) {
            reactions[emoji] = emojiReactions.filter((id: string) => id !== userId);
        } else {
            reactions[emoji] = [...emojiReactions, userId];
        }

        await supabase.from('messages').update({
            reactions: reactions
        }).eq('id', messageId);
    },

    /**
     * Publier une story (status d'apprentissage)
     */
    async postStory(userId: string, userName: string, userAvatar: string, content: string, type: 'achievement' | 'update' | 'quiz_score' | 'text', imageUrl?: string, backgroundColor?: string) {
        console.log("🚀 postStory starting...", { userId, type });
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log("📡 Calling Supabase insert on 'stories_social'...");
        try {
            const { data, error } = await supabase
                .from('stories_social')
                .insert({
                    user_id: userId,
                    user_name: userName,
                    user_avatar: userAvatar,
                    content,
                    image_url: imageUrl || null,
                    background_color: backgroundColor || null,
                    type,
                    timestamp: new Date().toISOString(),
                    expires_at: tomorrow.toISOString(),
                    views: [],
                    reactions: {}
                });

            console.log("✅ Supabase insert response received", { error });
            if (error) throw error;
        } catch (e) {
            console.error("❌ Exception in postStory:", e);
            throw e;
        }
    },

    /**
     * Marquer une story comme vue
     */
    async viewStory(storyId: string, userId: string) {
        const { data: story } = await supabase.from('stories_social').select('views').eq('id', storyId).single();
        const views = story?.views || [];
        if (!views.includes(userId)) {
            await supabase.from('stories_social').update({
                views: [...views, userId]
            }).eq('id', storyId);
        }
    },

    /**
     * Réagir à une story
     */
    async reactToStory(storyId: string, userId: string, emoji: string) {
        const { data: story } = await supabase.from('stories_social').select('reactions').eq('id', storyId).single();
        const reactions = story?.reactions || {};
        const emojiReactions = reactions[emoji] || [];
        if (!emojiReactions.includes(userId)) {
            reactions[emoji] = [...emojiReactions, userId];
            await supabase.from('stories_social').update({
                reactions: reactions
            }).eq('id', storyId);
        }
    },

    /**
     * Écouter les stories actives (moins de 24h)
     */
    listenToStories(callback: (stories: LearningStory[]) => void) {
        console.log("👂 listenToStories started");
        const fetchStories = async () => {
            console.log("📡 fetchStories: calling Supabase select...");
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from('stories_social')
                .select('*')
                .gt('expires_at', now)
                .order('expires_at', { ascending: false })
                .limit(50);

            if (data) {
                callback(data.map(s => ({
                    id: s.id,
                    userId: s.user_id,
                    userName: s.user_name,
                    userAvatar: s.user_avatar,
                    content: s.content,
                    imageUrl: s.image_url,
                    backgroundColor: s.background_color,
                    type: s.type as any,
                    timestamp: s.timestamp,
                    expiresAt: s.expires_at,
                    views: s.views,
                    reactions: s.reactions
                } as LearningStory)));
            }
        };

        fetchStories();

        const channel = supabase
            .channel('public:stories_social')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stories_social' }, () => {
                fetchStories();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Obtenir le classement mondial (Leaderboard)
     */
    async getGlobalLeaderboard(): Promise<UserPresence[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, avatar_config, status, last_active, total_xp')
            .order('total_xp', { ascending: false })
            .limit(10);

        if (error) return [];

        return (data || []).map(u => ({
            userId: u.id,
            name: u.name,
            avatar: u.avatar_config?.baseColor || '#3B82F6',
            status: u.status as any,
            lastSeen: u.last_active,
            totalXp: u.total_xp
        } as any as UserPresence));
    },

    /**
     * Upload une image pour une story
     */
    async uploadStoryImage(file: File, userId: string): Promise<string> {
        const timestamp = Date.now();
        const fileName = `stories/${userId}/${timestamp}_${file.name}`;
        const { data, error } = await supabase.storage.from('assets').upload(fileName, file);
        if (error) throw error;
        return supabase.storage.from('assets').getPublicUrl(data.path).data.publicUrl;
    },

    /**
     * Upload une image/vidéo pour un post social
     */
    async uploadPostMedia(file: File, userId: string): Promise<string> {
        const timestamp = Date.now();
        const fileName = `posts/${userId}/${timestamp}_${file.name}`;
        const { data, error } = await supabase.storage.from('assets').upload(fileName, file);
        if (error) throw error;
        return supabase.storage.from('assets').getPublicUrl(data.path).data.publicUrl;
    },

    /**
     * Créer un post social
     */
    async createPost(userId: string, userName: string, userAvatar: string, content: string, mediaUrl?: string, mediaType?: 'image' | 'video') {
        const { error } = await supabase.from('social_posts').insert({
            user_id: userId,
            user_name: userName,
            user_avatar: userAvatar,
            content,
            media_url: mediaUrl || null,
            media_type: mediaType || null,
            likes: [],
            comments: [],
            timestamp: new Date().toISOString()
        });
        if (error) throw error;
    },

    /**
     * Liker/unliker un post
     */
    async likePost(postId: string, userId: string) {
        const { data: post } = await supabase.from('social_posts').select('likes').eq('id', postId).single();
        const likes = post?.likes || [];

        if (likes.includes(userId)) {
            await supabase.from('social_posts').update({
                likes: likes.filter((id: string) => id !== userId)
            }).eq('id', postId);
        } else {
            await supabase.from('social_posts').update({
                likes: [...likes, userId]
            }).eq('id', postId);
        }
    },

    /**
     * Ajouter un commentaire à un post
     */
    async addComment(postId: string, userId: string, userName: string, userAvatar: string, text: string) {
        const { data: post } = await supabase.from('social_posts').select('comments').eq('id', postId).single();
        const comments = post?.comments || [];

        const comment = {
            id: `comment_${Date.now()}`,
            userId,
            userName,
            userAvatar,
            text,
            timestamp: new Date().toISOString()
        };

        await supabase.from('social_posts').update({
            comments: [...comments, comment]
        }).eq('id', postId);
    },

    /**
     * Écouter les posts sociaux
     */
    listenToPosts(callback: (posts: SocialPost[]) => void) {
        const fetchPosts = async () => {
            const { data } = await supabase
                .from('social_posts')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(20);

            if (data) {
                callback(data.map(p => ({
                    id: p.id,
                    userId: p.user_id,
                    userName: p.user_name,
                    userAvatar: p.user_avatar,
                    content: p.content,
                    mediaUrl: p.media_url,
                    mediaType: p.media_type,
                    likes: p.likes,
                    comments: p.comments,
                    timestamp: p.timestamp
                } as SocialPost)));
            }
        };

        fetchPosts();

        const channel = supabase
            .channel('public:social_posts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => {
                fetchPosts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Écouter l'historique des appels de l'utilisateur
     */
    listenToCallsHistory(userId: string, callback: (calls: Call[]) => void) {
        const fetchCalls = async () => {
            const { data } = await supabase
                .from('calls')
                .select('*')
                .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
                .order('timestamp', { ascending: false })
                .limit(30);

            if (data) {
                callback(data.map(c => ({
                    id: c.id,
                    callerId: c.caller_id,
                    callerName: c.caller_name,
                    callerAvatar: c.caller_avatar,
                    receiverId: c.receiver_id,
                    receiverName: c.receiver_name,
                    receiverAvatar: c.receiver_avatar,
                    status: c.status as any,
                    type: c.type as any,
                    roomName: c.room_name,
                    timestamp: c.timestamp
                } as Call)));
            }
        };

        fetchCalls();

        const channel = supabase
            .channel(`public:calls_history:${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'calls',
                filter: `caller_id=eq.${userId}`
            }, () => fetchCalls())
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'calls',
                filter: `receiver_id=eq.${userId}`
            }, () => fetchCalls())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Supprimer un post social
     */
    async deletePost(postId: string) {
        await supabase.from('social_posts').delete().eq('id', postId);
    }
};
