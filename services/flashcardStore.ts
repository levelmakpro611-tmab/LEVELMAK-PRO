import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { QuizQuestion } from '../types';

export interface LocalFlashcard {
  id: string;
  front: string; // La question
  back: string;  // La bonne réponse + explication
  subject: string;
  sourceQuizTitle: string;
  createdAt: number;
  nextReviewDate: number;
  easeFactor: number;
  repetitions: number;
}

interface FlashcardStore {
  cards: LocalFlashcard[];
  
  // Actions
  addFromErrors: (questions: QuizQuestion[], quizTitle: string, subject: string) => void;
  markAsMastered: (id: string) => void;
  reviewCard: (id: string, performanceRating: 0 | 1 | 2 | 3 | 4 | 5) => void;
  getCardsToReview: () => LocalFlashcard[];
  deleteCard: (id: string) => void;
}

export const useFlashcardStore = create<FlashcardStore>()(
  persist(
    (set, get) => ({
      cards: [],

      addFromErrors: (questions, quizTitle, subject) => {
        set((state) => {
          const newCards: LocalFlashcard[] = questions.map(q => ({
            id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            front: q.text,
            back: `**Réponse :** ${q.options[q.correctAnswer]} \n\n*${q.explanation}*`,
            subject,
            sourceQuizTitle: quizTitle,
            createdAt: Date.now(),
            nextReviewDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // Décalé d'une semaine comme demandé par l'utilisateur
            easeFactor: 2.5,
            repetitions: 0,
          }));

          // Avoid duplicates (same question text)
          const existingFronts = new Set(state.cards.map(c => c.front));
          const filteredNewCards = newCards.filter(c => !existingFronts.has(c.front));

          return { cards: [...state.cards, ...filteredNewCards] };
        });
      },

      markAsMastered: (id) => {
        // Just delete it if the user manually says "I know this forever"
        get().deleteCard(id);
      },

      deleteCard: (id) => {
        set((state) => ({
          cards: state.cards.filter(c => c.id !== id)
        }));
      },

      reviewCard: (id, performanceRating) => {
        // Basé sur l'algorithme SuperMemo-2, avec une base de 7 jours minimum
        set((state) => {
          const newCards = state.cards.map(card => {
            if (card.id !== id) return card;

            let { easeFactor, repetitions } = card;
            let interval = 7; // base interval in days (une semaine)

            if (performanceRating >= 3) {
              // Correct response
              if (repetitions === 0) interval = 7; // Renvoyer dans 1 semaine
              else if (repetitions === 1) interval = 14; // Renvoyer dans 2 semaines
              else interval = Math.round(card.repetitions * easeFactor * 7); // Espacement progressif très long

              repetitions += 1;
              easeFactor = easeFactor + (0.1 - (5 - performanceRating) * (0.08 + (5 - performanceRating) * 0.02));
            } else {
              // Incorrect response
              repetitions = 0;
              interval = 7; // On maintient un minimum d'une semaine pour ne pas spammer
              easeFactor = Math.max(1.3, easeFactor - 0.2);
            }

            // Calculate next review in MS
            const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

            return {
              ...card,
              easeFactor,
              repetitions,
              nextReviewDate,
            };
          });

          return { cards: newCards };
        });
      },

      getCardsToReview: () => {
        const now = Date.now();
        return get().cards.filter(c => c.nextReviewDate <= now);
      }
    }),
    {
      name: 'levelmak-flashcards-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
