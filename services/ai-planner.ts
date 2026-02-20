import { geminiService } from './gemini';
import { StudyPlan, StudyTask } from '../types';

export const aiPlannerService = {
    async generatePlan(examDate: string, subjects: string[]): Promise<StudyPlan> {
        const prompt = `Génère un plan d'étude réaliste et structuré pour un étudiant préparant ses examens le ${examDate}.
Les matières à réviser sont : ${subjects.join(', ')}.

Retourne UNIQUEMENT un objet JSON valide avec la structure suivante :
{
  "title": "Nom du plan de révision",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "tasks": [
    {
      "id": "task_1",
      "title": "Titre explicite de la session",
      "subject": "Nom de la matière",
      "description": "Objectif précis de la révision",
      "duration": "Durée (ex: 2h)",
      "priority": "high" | "medium" | "low",
      "date": "YYYY-MM-DD"
    }
  ]
}

Assure-toi que les sessions sont réparties intelligemment de maintenant jusqu'à la veille de l'examen. Varie les matières et prévois des temps de pause.`;

        const response = await geminiService.generateText(prompt);

        try {
            // Nettoyer la réponse pour extraire le JSON si nécessaire
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Format JSON invalide');
        } catch (error) {
            console.error('Erreur lors de la génération du plan:', error);
            throw error;
        }
    },

    async generatePlanWithImages(examDate: string, subjects: string[], base64Images: string[]): Promise<StudyPlan> {
        return await geminiService.generatePlanWithImages(examDate, subjects, base64Images);
    }
};
