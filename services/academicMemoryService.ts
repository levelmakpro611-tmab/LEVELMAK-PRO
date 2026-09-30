/**
 * AcademicMemoryService
 * Centralise et synthétise en temps réel la mémoire d'apprentissage de l'élève à 360° :
 * - Quiz & Examens (taux de réussite, points forts, points faibles)
 * - Flashcards & Mémorisation (decks, cartes révisées)
 * - Atelier d'écriture (textes écrits, thèmes travaillés)
 * - Résumés & Bibliothèque (notions consultées)
 * - Objectifs quotidiens & Série d'études (streak)
 */

export interface AcademicInsight {
  studentName: string;
  gradeClass: string;
  streakDays: number;
  hoursLearned: number;
  xp: number;
  league: string;
  
  // Quiz activity
  quizzesTaken: number;
  quizAverageScore: number; // 0-100%
  strongSubjects: string[];
  weakSubjects: string[];
  recentQuizTopics: string[];

  // Flashcards
  flashcardDecksCount: number;
  flashcardsTotalCount: number;

  // Writing & Summaries
  writtenStoriesCount: number;
  recentWritingTitles: string[];

  // Daily goals
  completedGoalsCount: number;
  totalGoalsCount: number;
}

export const academicMemoryService = {
  /**
   * Extrait et analyse l'ensemble des activités de l'élève à partir du stockage local et du profil
   */
  getStudentInsights(user: any): AcademicInsight {
    const userId = user?.id || '';
    const studentName = user?.name || 'Élève';
    const gradeClass = user?.education || user?.gradeClass || user?.level || 'Non précisé';
    const streakDays = user?.streak || user?.stats?.streak || 0;
    const hoursLearned = user?.stats?.hoursLearned || 0;
    const xp = user?.xp || 0;
    const league = user?.league || 'Bronze';

    // 1. Analyser les Quiz
    let quizzes: any[] = [];
    try {
      const raw = userId ? localStorage.getItem(`levelmak_${userId}_quizzes`) : null;
      if (raw) quizzes = JSON.parse(raw);
    } catch (_) {}

    const quizzesTaken = quizzes.length;
    let quizAverageScore = 0;
    const subjectScores: Record<string, { total: number; count: number; title: string }> = {};
    const recentQuizTopics: string[] = [];

    if (quizzes.length > 0) {
      let totalPercentage = 0;
      quizzes.slice(-15).forEach((q) => {
        const title = q.title || 'Général';
        const score = typeof q.score === 'number' ? q.score : (q.lastScore ?? 0);
        const maxScore = typeof q.totalQuestions === 'number' ? q.totalQuestions : (q.questions?.length || 10);
        const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
        totalPercentage += pct;

        const subjectKey = (q.subject || q.category || title).trim();
        if (!subjectScores[subjectKey]) {
          subjectScores[subjectKey] = { total: 0, count: 0, title: subjectKey };
        }
        subjectScores[subjectKey].total += pct;
        subjectScores[subjectKey].count += 1;

        if (recentQuizTopics.length < 4 && !recentQuizTopics.includes(title)) {
          recentQuizTopics.push(title);
        }
      });
      quizAverageScore = Math.round(totalPercentage / Math.min(quizzes.length, 15));
    }

    const strongSubjects: string[] = [];
    const weakSubjects: string[] = [];
    Object.values(subjectScores).forEach((sub) => {
      const avg = sub.total / sub.count;
      if (avg >= 75) strongSubjects.push(sub.title);
      else if (avg < 55) weakSubjects.push(sub.title);
    });

    // 2. Analyser les Flashcards
    let flashcardDecksCount = 0;
    let flashcardsTotalCount = 0;
    try {
      const decksRaw = userId ? localStorage.getItem(`levelmak_${userId}_decks`) : null;
      if (decksRaw) {
        const decks = JSON.parse(decksRaw);
        flashcardDecksCount = Array.isArray(decks) ? decks.length : 0;
      }
      const cardsRaw = userId ? localStorage.getItem(`levelmak_${userId}_flashcards`) : null;
      if (cardsRaw) {
        const cards = JSON.parse(cardsRaw);
        flashcardsTotalCount = Array.isArray(cards) ? cards.length : 0;
      }
    } catch (_) {}

    // 3. Analyser l'Atelier d'écriture & Résumés
    let writtenStoriesCount = 0;
    const recentWritingTitles: string[] = [];
    try {
      const storiesRaw = userId ? localStorage.getItem(`levelmak_${userId}_stories`) : null;
      if (storiesRaw) {
        const stories = JSON.parse(storiesRaw);
        if (Array.isArray(stories)) {
          writtenStoriesCount = stories.length;
          stories.slice(-3).forEach(s => {
            if (s.title) recentWritingTitles.push(s.title);
          });
        }
      }
    } catch (_) {}

    // 4. Analyser les Objectifs du jour
    let completedGoalsCount = 0;
    let totalGoalsCount = 3;
    try {
      const goalsRaw = userId ? localStorage.getItem(`levelmak_custom_goals_${userId}`) : null;
      if (goalsRaw) {
        const goals = JSON.parse(goalsRaw);
        if (Array.isArray(goals)) {
          totalGoalsCount = goals.length;
          completedGoalsCount = goals.filter((g: any) => g.completed).length;
        }
      }
    } catch (_) {}

    return {
      studentName,
      gradeClass,
      streakDays,
      hoursLearned: parseFloat(hoursLearned.toFixed(1)),
      xp,
      league,
      quizzesTaken,
      quizAverageScore,
      strongSubjects,
      weakSubjects,
      recentQuizTopics,
      flashcardDecksCount,
      flashcardsTotalCount,
      writtenStoriesCount,
      recentWritingTitles,
      completedGoalsCount,
      totalGoalsCount,
    };
  },

  /**
   * Construit un résumé textuel ultra-dense et contextualisé pour le prompt du Coach IA
   */
  buildPromptContext(user: any): string {
    const insight = this.getStudentInsights(user);

    const parts: string[] = [
      `PROFIL ÉLÈVE : ${insight.studentName} | Classe/Niveau : "${insight.gradeClass}" | Série d'étude : ${insight.streakDays} jours consécutifs | Temps total : ${insight.hoursLearned}h | Ligue : ${insight.league} | XP : ${insight.xp}.`,
    ];

    // Quiz details
    if (insight.quizzesTaken > 0) {
      let quizInfo = `ACTIVITÉ QUIZ : ${insight.quizzesTaken} quiz récents (Moyenne : ${insight.quizAverageScore}%).`;
      if (insight.strongSubjects.length > 0) {
        quizInfo += ` Points forts : [${insight.strongSubjects.join(', ')}].`;
      }
      if (insight.weakSubjects.length > 0) {
        quizInfo += ` Points à consolider/Faiblesses : [${insight.weakSubjects.join(', ')}].`;
      }
      if (insight.recentQuizTopics.length > 0) {
        quizInfo += ` Derniers thèmes testés : ${insight.recentQuizTopics.join(', ')}.`;
      }
      parts.push(quizInfo);
    } else {
      parts.push(`ACTIVITÉ QUIZ : L'élève débute ou n'a pas encore complété de quiz récent.`);
    }

    // Flashcards details
    if (insight.flashcardDecksCount > 0 || insight.flashcardsTotalCount > 0) {
      parts.push(`MÉMORISATION (FLASHCARDS) : ${insight.flashcardDecksCount} paquets créés / ${insight.flashcardsTotalCount} cartes au total.`);
    }

    // Writing atelier
    if (insight.writtenStoriesCount > 0) {
      parts.push(`ATELIER D'ÉCRITURE : ${insight.writtenStoriesCount} textes rédigés${insight.recentWritingTitles.length > 0 ? ` (Derniers écrits: ${insight.recentWritingTitles.join(', ')})` : ''}.`);
    }

    // Goals status
    parts.push(`OBJECTIFS QUOTIDIENS DU JOUR : ${insight.completedGoalsCount}/${insight.totalGoalsCount} objectifs complétés.`);

    parts.push(
      `CONSIGNES COACH OMNISCIENT : Tu es le tuteur personnel d'excellence de ${insight.studentName}. Tu connais parfaitement ses résultats ci-dessus. Utilise ces éléments pour adapter tes explications, l'encourager sur ses réussites et l'aider précisément sur ses matières fragiles. Si l'élève te demande d'évaluer son niveau ou de faire un bilan, base-toi rigoureusement sur ces données.`
    );

    return parts.join('\n');
  },
};
