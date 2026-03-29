import { openrouterService } from './openrouter';
import { StudyPlan, StudyTask } from '../types';

export const aiPlannerService = {
    async generatePlan(examDate: string, subjects: string[]): Promise<StudyPlan> {
        const prompt = `Génère un plan d'étude réaliste et structuré pour un étudiant préparant ses examens le ${examDate}.
Les matières à réviser sont : ${subjects.join(', ')}.

Retourne UNIQUEMENT un objet JSON valide avec la structure suivante :
{
  "title": "Nom du plan de révision",
  "startDate": "${new Date().toISOString().split('T')[0]}",
  "endDate": "${examDate}",
  "tasks": [
    {
      "id": "task_1",
      "title": "Titre explicite de la session",
      "subject": "Nom de la matière",
      "description": "Objectif précis de la révision",
      "duration": "Durée (ex: 2h)",
      "priority": "high",
      "date": "YYYY-MM-DD"
    }
  ]
}

Assure-toi que les sessions sont réparties intelligemment jusqu'à la veille de l'examen. Varie les matières et prévois des temps de pause.`;

        console.log("🚀 Envoi requête Plan Textuel à OpenRouter...");
        const response = await openrouterService.generateText(prompt);
        console.log("📥 Réponse brute reçue:", response.substring(0, 100) + "...");

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
        return await openrouterService.generatePlanWithImages(examDate, subjects, base64Images);
    }
};
