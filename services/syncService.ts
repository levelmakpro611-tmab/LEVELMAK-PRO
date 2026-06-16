import { contentService } from './contentService';
import { Quiz, Story, FlashcardDeck, Flashcard } from '../types';

export const syncService = {
  /**
   * Performs a bi-directional sync of user content (quizzes, stories, flashcards)
   * between LocalStorage and Supabase.
   */
  async syncUserContent(userId: string): Promise<{ success: boolean; error?: any }> {
    if (!userId || userId.includes('anon')) {
      return { success: false, error: 'User is anonymous or not logged in' };
    }

    // Ephemeral mode check for free/gratuit users: skip database sync
    try {
      const storedUser = localStorage.getItem('levelmak_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser.is_premium) {
          console.log('[Sync] Skipping Supabase sync for Free/Gratuit user (quizzes/decks remain ephemeral)');
          return { success: true };
        }
      }
    } catch (e) {
      console.warn('[Sync] Failed to parse local user profile for premium check:', e);
    }

    try {
      console.log(`[Sync] Starting synchronization for user: ${userId}`);
      
      const quizKey = `levelmak_${userId}_quizzes`;
      const storiesKey = `levelmak_${userId}_stories`;
      const deckKey = `levelmak_${userId}_decks`;
      const fcKey = `levelmak_${userId}_flashcards`;

      // 1. Sync Quizzes
      const { data: dbQuizzes, error: quizError } = await contentService.getUserQuizzes(userId);
      if (quizError) console.warn('[Sync] Failed to fetch quizzes from DB:', quizError);
      
      const localQuizzesRaw = localStorage.getItem(quizKey);
      let localQuizzes: Quiz[] = localQuizzesRaw ? JSON.parse(localQuizzesRaw) : [];
      
      // Separate custom and default quizzes
      const customLocalQuizzes = localQuizzes.filter(q => !q.id.startsWith('quiz_default_'));
      const defaultLocalQuizzes = localQuizzes.filter(q => q.id.startsWith('quiz_default_'));
      const customDbQuizzes = dbQuizzes || [];

      // Push custom local quizzes not in DB
      for (const localQ of customLocalQuizzes) {
        if (!customDbQuizzes.some(dbQ => dbQ.id === localQ.id)) {
          console.log(`[Sync] Pushing new local quiz: ${localQ.title}`);
          await contentService.saveQuiz(userId, localQ);
        }
      }

      // Merge: Union of local and DB quizzes
      const mergedCustomQuizzes = [...customLocalQuizzes];
      for (const dbQ of customDbQuizzes) {
        if (!mergedCustomQuizzes.some(lq => lq.id === dbQ.id)) {
          mergedCustomQuizzes.push(dbQ);
        }
      }

      // Save back to local storage
      const finalQuizzes = [...defaultLocalQuizzes, ...mergedCustomQuizzes];
      localStorage.setItem(quizKey, JSON.stringify(finalQuizzes));

      // 2. Sync Stories
      const { data: dbStories, error: storyError } = await contentService.getUserStories(userId);
      if (storyError) console.warn('[Sync] Failed to fetch stories from DB:', storyError);

      const localStoriesRaw = localStorage.getItem(storiesKey);
      let localStories: Story[] = localStoriesRaw ? JSON.parse(localStoriesRaw) : [];
      const dbStoriesList = dbStories || [];

      // Push local stories not in DB
      for (const localS of localStories) {
        if (!dbStoriesList.some(dbS => dbS.id === localS.id)) {
          console.log(`[Sync] Pushing new local story: ${localS.title}`);
          await contentService.saveStory(userId, localS);
        }
      }

      // Merge stories
      const mergedStories = [...localStories];
      for (const dbS of dbStoriesList) {
        if (!mergedStories.some(ls => ls.id === dbS.id)) {
          mergedStories.push(dbS);
        }
      }
      localStorage.setItem(storiesKey, JSON.stringify(mergedStories));

      // 3. Sync Flashcards and Decks
      const { data: dbDecksAndCards, error: decksError } = await contentService.getUserDecks(userId);
      if (decksError) console.warn('[Sync] Failed to fetch decks from DB:', decksError);

      const localDecksRaw = localStorage.getItem(deckKey);
      const localCardsRaw = localStorage.getItem(fcKey);
      let localDecks: FlashcardDeck[] = localDecksRaw ? JSON.parse(localDecksRaw) : [];
      let localCards: Flashcard[] = localCardsRaw ? JSON.parse(localCardsRaw) : [];

      const customLocalDecks = localDecks.filter(d => !d.id.startsWith('deck_default_'));
      const defaultLocalDecks = localDecks.filter(d => d.id.startsWith('deck_default_'));
      const customLocalCards = localCards.filter(c => !c.id.startsWith('fc_'));
      const defaultLocalCards = localCards.filter(c => c.id.startsWith('fc_'));

      const dbDecks = dbDecksAndCards?.decks || [];
      const dbCards = dbDecksAndCards?.cards || [];

      // Push local decks and their cards to DB
      for (const localD of customLocalDecks) {
        if (!dbDecks.some(dbD => dbD.id === localD.id)) {
          console.log(`[Sync] Pushing new local deck: ${localD.title}`);
          const deckCards = customLocalCards.filter(c => c.deckId === localD.id);
          await contentService.saveFlashcardDeck(userId, localD, deckCards);
        }
      }

      // Merge decks
      const mergedCustomDecks = [...customLocalDecks];
      for (const dbD of dbDecks) {
        if (!mergedCustomDecks.some(ld => ld.id === dbD.id)) {
          mergedCustomDecks.push(dbD);
        }
      }
      const finalDecks = [...defaultLocalDecks, ...mergedCustomDecks];
      localStorage.setItem(deckKey, JSON.stringify(finalDecks));

      // Merge cards
      const mergedCustomCards = [...customLocalCards];
      for (const dbC of dbCards) {
        if (!mergedCustomCards.some(lc => lc.id === dbC.id)) {
          mergedCustomCards.push(dbC);
        }
      }
      const finalCards = [...defaultLocalCards, ...mergedCustomCards];
      localStorage.setItem(fcKey, JSON.stringify(finalCards));

      console.log('[Sync] Bi-directional sync completed successfully');
      localStorage.setItem('levelmak_last_sync', Date.now().toString());
      return { success: true };
    } catch (e) {
      console.error('[Sync] Error during sync:', e);
      return { success: false, error: e };
    }
  }
};
