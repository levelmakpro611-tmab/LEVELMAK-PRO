import { supabase } from './supabase';
import { Story } from '../types';

export const CONV_ID = 'c4ca4238-a0b9-3ad1-d9f5-08f397300001';

export interface DbStoryPayload {
    title: string;
    category: string;
    content: string;
    publishedContent?: string;
    likes: string[]; // User IDs who liked the story
    comments: {
        id: string;
        author: string;
        text: string;
        date: string;
    }[];
    coverImage?: string;
}

export interface ExtendedStory extends Story {
    likesArray: string[];
    commentsArray: {
        id: string;
        author: string;
        text: string;
        date: string;
    }[];
}

// Simple UUID generator compatible with browsers & Capacitor
export const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const writingService = {
    /**
     * S'assure que la conversation de groupe pour le feed public existe
     */
    async ensurePublicFeedConversation(): Promise<void> {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select('id')
                .eq('id', CONV_ID)
                .maybeSingle();

            if (error) {
                console.error('[WritingService] Error checking conversation:', error);
                return;
            }

            if (!data) {
                console.log('[WritingService] Public feed conversation does not exist. Creating it...');
                const { error: insertError } = await supabase
                    .from('conversations')
                    .insert({
                        id: CONV_ID,
                        participants: ['system'],
                        participant_names: { 'system': 'Système' },
                        participant_avatars: { 'system': '' },
                        is_group: true,
                        group_name: 'Creative Writing Public Feed',
                        last_updated: new Date().toISOString(),
                        unread_count: { 'system': 0 }
                    });

                if (insertError) {
                    console.error('[WritingService] Failed to create public feed conversation:', insertError);
                } else {
                    console.log('[WritingService] Public feed conversation created successfully');
                }
            }
        } catch (e) {
            console.error('[WritingService] ensurePublicFeedConversation crashed:', e);
        }
    },

    /**
     * Récupère tous les écrits du feed public
     */
    async fetchPublicStories(): Promise<ExtendedStory[]> {
        try {
            await this.ensurePublicFeedConversation();

            const { data: messages, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', CONV_ID)
                .order('timestamp', { ascending: false });

            if (error) {
                console.error('[WritingService] Error fetching public stories:', error);
                return [];
            }

            const stories: ExtendedStory[] = [];
            for (const msg of messages || []) {
                try {
                    const payload: DbStoryPayload = JSON.parse(msg.text);
                    stories.push({
                        id: msg.id, // Primary key of message table is a UUID
                        title: payload.title || 'Sans titre',
                        content: payload.content || '',
                        publishedContent: payload.publishedContent || payload.content || '',
                        authorId: msg.sender_id,
                        authorName: msg.sender_name || 'Écrivain anonyme',
                        category: payload.category || 'story',
                        likes: payload.likes ? payload.likes.length : 0,
                        isPublic: true,
                        createdAt: msg.timestamp || new Date().toISOString(),
                        coverImage: payload.coverImage || undefined,
                        likesArray: payload.likes || [],
                        commentsArray: payload.comments || []
                    });
                } catch (jsonErr) {
                    console.warn('[WritingService] Failed to parse message text as JSON:', msg.text, jsonErr);
                }
            }
            return stories;
        } catch (e) {
            console.error('[WritingService] fetchPublicStories crashed:', e);
            return [];
        }
    },

    /**
     * Publie une nouvelle histoire ou met à jour une histoire existante sur Supabase
     */
    async publishStory(story: Story, likesArray: string[] = [], commentsArray: any[] = []): Promise<ExtendedStory | null> {
        try {
            await this.ensurePublicFeedConversation();

            // Validate that we have a valid UUID. If not, generate one.
            let storyId = story.id;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(storyId)) {
                storyId = generateUUID();
                console.log(`[WritingService] Local ID is not a UUID, generated new UUID: ${storyId}`);
            }

            const storyPayload: DbStoryPayload = {
                title: story.title,
                category: story.category,
                content: story.content,
                publishedContent: story.publishedContent || story.content,
                likes: likesArray,
                comments: commentsArray,
                coverImage: story.coverImage || undefined
            };

            // Sender ID in messages must be a valid UUID. Check if user's ID is a valid UUID, otherwise use a fallback
            let senderId = story.authorId;
            if (!uuidRegex.test(senderId)) {
                senderId = '00000000-0000-0000-0000-000000000002'; // fallback UUID
            }

            // We upsert into messages by checking if a message with this ID already exists.
            // If it does, we update it. If not, we insert it.
            const { data: existingMsg } = await supabase
                .from('messages')
                .select('id')
                .eq('id', storyId)
                .maybeSingle();

            if (existingMsg) {
                // Update
                const { error: updateErr } = await supabase
                    .from('messages')
                    .update({
                        text: JSON.stringify(storyPayload),
                        sender_name: story.authorName,
                        timestamp: new Date().toISOString()
                    })
                    .eq('id', storyId);

                if (updateErr) {
                    console.error('[WritingService] Error updating story message:', updateErr);
                    return null;
                }
            } else {
                // Insert
                const { error: insertErr } = await supabase
                    .from('messages')
                    .insert({
                        id: storyId,
                        conversation_id: CONV_ID,
                        sender_id: senderId,
                        sender_name: story.authorName,
                        text: JSON.stringify(storyPayload),
                        read: false,
                        attachments: [],
                        timestamp: new Date().toISOString()
                    });

                if (insertErr) {
                    console.error('[WritingService] Error inserting story message:', insertErr);
                    return null;
                }
            }

            // Return the extended story format
            return {
                ...story,
                id: storyId,
                isPublic: true,
                likes: likesArray.length,
                likesArray,
                commentsArray
            };
        } catch (e) {
            console.error('[WritingService] publishStory crashed:', e);
            return null;
        }
    },

    /**
     * Supprime une histoire de Supabase
     */
    async deleteStory(storyId: string): Promise<boolean> {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(storyId)) {
                console.warn('[WritingService] Cannot delete non-UUID story from database:', storyId);
                return false;
            }

            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', storyId);

            if (error) {
                console.error('[WritingService] Error deleting story message:', error);
                return false;
            }
            return true;
        } catch (e) {
            console.error('[WritingService] deleteStory crashed:', e);
            return false;
        }
    },

    /**
     * Écoute en temps réel les changements sur la table messages
     */
    subscribeToStories(onUpdate: () => void) {
        const channel = supabase
            .channel(`public:writing_feed:conversation_id=eq.${CONV_ID}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${CONV_ID}`
            }, () => {
                console.log('[WritingService] Realtime change detected in creative writing feed!');
                onUpdate();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
};
