import { supabase } from './supabase';
import { Quiz, Story, FlashcardDeck, Flashcard } from '../types';

export const contentService = {
  // --- QUIZZES ---
  async saveQuiz(userId: string, quiz: Quiz): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_quizzes')
        .upsert({
          id: quiz.id,
          user_id: userId,
          title: quiz.title,
          subject: quiz.subject,
          questions: quiz.questions,
          summary: quiz.summary,
          created_at: quiz.createdAt || new Date().toISOString()
        })
        .select()
        .single();
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async deleteQuiz(quizId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user_quizzes')
        .delete()
        .eq('id', quizId);
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  },

  async getUserQuizzes(userId: string): Promise<{ data: Quiz[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_quizzes')
        .select('*')
        .eq('user_id', userId);

      if (error) return { data: null, error };

      const quizzes: Quiz[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        subject: row.subject,
        questions: row.questions,
        summary: row.summary,
        createdAt: row.created_at
      }));

      return { data: quizzes, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  // --- STORIES ---
  async saveStory(userId: string, story: Story): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_stories')
        .upsert({
          id: story.id,
          user_id: userId,
          title: story.title,
          content: story.content,
          category: story.category,
          likes: story.likes || 0,
          is_public: story.isPublic || false,
          created_at: story.createdAt || new Date().toISOString()
        })
        .select()
        .single();
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async deleteStory(storyId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user_stories')
        .delete()
        .eq('id', storyId);
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  },

  async getUserStories(userId: string): Promise<{ data: Story[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_stories')
        .select('*')
        .eq('user_id', userId);

      if (error) return { data: null, error };

      const stories: Story[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        authorId: userId,
        authorName: '', // Loaded dynamically or cached in component
        category: row.category || '',
        likes: row.likes || 0,
        isPublic: row.is_public || false,
        createdAt: row.created_at
      }));

      return { data: stories, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  // --- FLASHCARD DECKS AND CARDS ---
  async saveFlashcardDeck(userId: string, deck: FlashcardDeck, cards: Flashcard[]): Promise<{ error: any }> {
    try {
      // 1. Save the deck
      const { error: deckError } = await supabase
        .from('user_flashcard_decks')
        .upsert({
          id: deck.id,
          user_id: userId,
          title: deck.title,
          subject: deck.subject,
          card_count: deck.cardCount || cards.length,
          created_at: deck.createdAt || new Date().toISOString()
        });

      if (deckError) return { error: deckError };

      // 2. Save all associated cards
      if (cards.length > 0) {
        const mappedCards = cards.map(card => ({
          id: card.id,
          user_id: userId,
          deck_id: deck.id,
          front: card.front,
          back: card.back,
          interval: card.interval || 0,
          ease_factor: card.easeFactor || 2.5,
          repetitions: card.repetitions || 0,
          created_at: new Date().toISOString()
        }));

        const { error: cardsError } = await supabase
          .from('user_flashcards')
          .upsert(mappedCards);

        if (cardsError) return { error: cardsError };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },

  async deleteFlashcardDeck(deckId: string): Promise<{ error: any }> {
    try {
      // Deleting a deck will automatically cascade delete its cards due to FOREIGN KEY ON DELETE CASCADE
      const { error } = await supabase
        .from('user_flashcard_decks')
        .delete()
        .eq('id', deckId);
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  },

  async getUserDecks(userId: string): Promise<{ data: { decks: FlashcardDeck[]; cards: Flashcard[] } | null; error: any }> {
    try {
      // 1. Fetch all user's decks
      const { data: decksData, error: decksError } = await supabase
        .from('user_flashcard_decks')
        .select('*')
        .eq('user_id', userId);

      if (decksError) return { data: null, error: decksError };

      // 2. Fetch all user's flashcards
      const { data: cardsData, error: cardsError } = await supabase
        .from('user_flashcards')
        .select('*')
        .eq('user_id', userId);

      if (cardsError) return { data: null, error: cardsError };

      const decks: FlashcardDeck[] = (decksData || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        subject: row.subject,
        cardCount: row.card_count,
        createdAt: row.created_at
      }));

      const cards: Flashcard[] = (cardsData || []).map((row: any) => ({
        id: row.id,
        front: row.front,
        back: row.back,
        deckId: row.deck_id,
        interval: row.interval,
        easeFactor: Number(row.ease_factor || 2.5),
        repetitions: row.repetitions
      }));

      return { data: { decks, cards }, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
};
