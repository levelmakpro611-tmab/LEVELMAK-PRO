/**
 * Service d'IA Centralisé pour Levelmak Pro
 * Propulsé par Google Gemini 1.5 Flash (Direct API)
 */

import { geminiService } from './geminiService';
import { DAILY_VOCAB, DAILY_MOTIVATION } from '../utils/dailyContent';
import { supabase } from './supabase';
import { 
  COACH_SYSTEM_PROMPT, 
  SEARCH_BOOKS_SYSTEM, 
  SEARCH_BOOKS_USER, 
  FLASHCARDS_SYSTEM, 
  FLASHCARDS_USER, 
  VOCABULARY_SYSTEM, 
  MOTIVATION_SYSTEM, 
  WRITING_ANALYZE_SYSTEM, 
  WRITING_ANALYZE_USER, 
  WRITING_COACH_REVIEW_SYSTEM, 
  WRITING_COACH_HELP_SYSTEM, 
  SCIENTIFIC_SOLVER_SYSTEM, 
  SCIENTIFIC_CHECKER_SYSTEM, 
  HISTORY_SYSTEM_PROMPT, 
  FEYNMAN_SYSTEM_PROMPT, 
  BATTLE_QUIZ_USER_PROMPT 
} from './aiPrompts';


async function getHistoricalWords(lang: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('daily_content')
      .select('id, data')
      .like('id', `vocabulary_${lang}%`);
    
    if (error || !data) return [];
    
    const words: string[] = [];
    data.forEach((row: any) => {
      if (Array.isArray(row.data)) {
        row.data.forEach((item: any) => {
          if (item?.word) {
            words.push(item.word.toLowerCase().trim());
          }
        });
      }
    });
    return words;
  } catch (e) {
    console.error('Error fetching historical words:', e);
    return [];
  }
}

async function getHistoricalQuotes(lang: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('daily_content')
      .select('id, data')
      .like('id', `motivation_${lang}%`);
    
    if (error || !data) return [];
    
    const quotes: string[] = [];
    data.forEach((row: any) => {
      if (row.data && row.data.quote) {
        quotes.push(row.data.quote.toLowerCase().trim());
      }
    });
    return quotes;
  } catch (e) {
    console.error('Error fetching historical quotes:', e);
    return [];
  }
}

/**
 * Appelle l'IA de manière ultra rapide et stable (100% direct)
 */
async function callGemini(messages: any[], jsonMode: boolean = false) {
  try {
    return await geminiService.generateContent(messages, jsonMode);
  } catch (error: any) {
    console.error("⚠️ Échec du service d'intelligence artificielle:", error.message);
    throw new Error(
      "Échec de chargement Levelmak. Veuillez vérifier votre connexion Internet."
    );
  }
}

/**
 * Générateur de Quiz de Secours (100% Hors-ligne)
 * Garantit que l'utilisateur reçoit toujours un quiz de qualité supérieure même sans connexion ou en cas d'erreur de l'IA.
 */
function generateOfflineQuizFallback(subject: string, difficulty: string, manualText: string): any {
  const cleanSubject = subject || "Culture Générale";
  
  // Modèles pédagogiques de haute qualité pré-configurés
  const templates: Record<string, {text: string, options: string[], correctAnswer: number, explanation: string}[]> = {
    "math": [
      { text: "Quelle est la dérivée de f(x) = x² ?", options: ["2x", "x", "2", "x²"], correctAnswer: 0, explanation: "La formule de dérivation de x^n est n*x^(n-1). Pour x², cela donne 2x." },
      { text: "Que vaut la racine carrée de 144 ?", options: ["10", "11", "12", "14"], correctAnswer: 2, explanation: "12 multiplié par 12 vaut 144." },
      { text: "Si un triangle a des côtés de 3cm, 4cm et 5cm, quelle est sa nature ?", options: ["Triangle isocèle", "Triangle rectangle", "Triangle équilatéral", "Triangle quelconque"], correctAnswer: 1, explanation: "Selon le théorème de Pythagore, 3² + 4² = 9 + 16 = 25 = 5². C'est donc un triangle rectangle." },
      { text: "Quelle est la valeur approchée de Pi (π) ?", options: ["3,12", "3,14", "3,16", "3,18"], correctAnswer: 1, explanation: "Pi est une constante valant approximativement 3,14159." }
    ],
    "histoire": [
      { text: "Qui était le premier empereur des Français ?", options: ["Louis XIV", "Napoléon Ier", "Charlemagne", "Henri IV"], correctAnswer: 1, explanation: "Napoléon Bonaparte a été sacré empereur le 2 décembre 1804 sous le nom de Napoléon Ier." },
      { text: "En quelle année s'est déroulée la Révolution Française ?", options: ["1789", "1492", "1914", "1815"], correctAnswer: 0, explanation: "La Révolution Française a débuté en 1789, marquée notamment par la prise de la Bastille le 14 juillet." },
      { text: "Quel pharaon a fait construire la Grande Pyramide de Gizeh ?", options: ["Ramsès II", "Khéops", "Toutânkhamon", "Akhenaton"], correctAnswer: 1, explanation: "La pyramide de Khéops est la plus grande des pyramides de Gizeh, construite sous la IVe dynastie." },
      { text: "Quelle bataille a marqué la fin définitive de l'Empire de Napoléon ?", options: ["Bataille de Waterloo", "Bataille d'Austerlitz", "Bataille de Verdun", "Bataille de Marignan"], correctAnswer: 0, explanation: "La défaite de Waterloo le 18 juin 1815 marque la fin de l'épopée napoléonienne." }
    ],
    "sciences": [
      { text: "Quelle est la formule chimique de l'eau ?", options: ["CO2", "H2O", "NaCl", "O2"], correctAnswer: 1, explanation: "L'eau est composée de deux atomes d'hydrogène et d'un atome d'oxygène (H2O)." },
      { text: "Quelle planète est connue comme la Planète Rouge ?", options: ["Mars", "Vénus", "Jupiter", "Saturne"], correctAnswer: 0, explanation: "Mars doit sa couleur rouge caractéristique à l'abondance d'oxyde de fer (rouille) à sa surface." },
      { text: "Quel est l'organe principal du système circulatoire humain ?", options: ["Le poumon", "Le foie", "Le cœur", "Le cerveau"], correctAnswer: 2, explanation: "Le cœur pompe le sang à travers tout l'organisme." },
      { text: "Quel gaz est essentiel à la respiration des êtres humains ?", options: ["Le diazote", "Le dioxyde de carbone", "Le dioxygène", "L'hélium"], correctAnswer: 2, explanation: "Les humains respirent du dioxygène (O2) pour alimenter leurs cellules en énergie." }
    ]
  };

  // Recherche d'un modèle correspondant
  let chosenQuestions = templates.sciences;
  const lowerSubject = cleanSubject.toLowerCase();
  if (lowerSubject.includes("math") || lowerSubject.includes("algebre") || lowerSubject.includes("calcul") || lowerSubject.includes("equation")) {
    chosenQuestions = templates.math;
  } else if (lowerSubject.includes("hist") || lowerSubject.includes("pharaon") || lowerSubject.includes("guerre") || lowerSubject.includes("revolution")) {
    chosenQuestions = templates.histoire;
  } else if (lowerSubject.includes("science") || lowerSubject.includes("physique") || lowerSubject.includes("chimie") || lowerSubject.includes("bio")) {
    chosenQuestions = templates.sciences;
  } else {
    // Génération dynamique intelligente si un long texte est présent
    if (manualText && manualText.length > 20) {
      const sentences = manualText.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 15);
      if (sentences.length >= 3) {
        chosenQuestions = sentences.slice(0, 5).map((sentence, idx) => {
          const words = sentence.split(" ");
          const missingWordIdx = Math.floor(words.length / 2);
          const correctAnswer = words[missingWordIdx] || "concept";
          const wrongAnswers = ["analyse", "théorie", "méthode", "résolution"].filter(w => w.toLowerCase() !== correctAnswer.toLowerCase());
          
          const options = [correctAnswer, ...wrongAnswers].slice(0, 4);
          const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
          const correctIdx = shuffledOptions.indexOf(correctAnswer);
          
          return {
            text: `D'après le document, complétez l'énoncé : "... ${shuffledOptions.map((o, i) => i === correctIdx ? "_____" : "").filter(Boolean)[0] || "_____"} ..." dans la phrase : "${sentence.replace(correctAnswer, "______")}"`,
            options: shuffledOptions,
            correctAnswer: correctIdx >= 0 ? correctIdx : 0,
            explanation: `Le cours mentionne précisément : "${sentence}"`
          };
        });
      }
    }
  }

  // Fallback général par défaut si pas assez de questions
  if (!chosenQuestions || chosenQuestions.length < 3) {
    chosenQuestions = [
      { text: "Quelle est la capitale de la France ?", options: ["Londres", "Paris", "Berlin", "Madrid"], correctAnswer: 1, explanation: "Paris est la capitale et la plus grande ville de France." },
      { text: "Combien de continents compte la Terre ?", options: ["5", "6", "7", "8"], correctAnswer: 2, explanation: "Il y a généralement 7 continents reconnus : Asie, Afrique, Amérique du Nord, Amérique du Sud, Antarctique, Europe et Océanie." },
      { text: "Qui a peint la Joconde ?", options: ["Léonard de Vinci", "Pablo Picasso", "Claude Monet", "Vincent van Gogh"], correctAnswer: 0, explanation: "La Joconde a été peinte par Léonard de Vinci entre 1503 et 1506." },
      { text: "Quel est l'océan le plus vaste du globe terrestre ?", options: ["Océan Atlantique", "Océan Indien", "Océan Pacifique", "Océan Arctique"], correctAnswer: 2, explanation: "L'océan Pacifique est le plus grand et le plus profond des océans." },
      { text: "Quel instrument sert à mesurer la température ?", options: ["Le baromètre", "Le thermomètre", "L'anémomètre", "Le télescope"], correctAnswer: 1, explanation: "Le thermomètre sert à mesurer la température corporelle ou ambiante." }
    ];
  }

  // Expansion à 10 questions pour un QCM complet
  let finalQuestions = [...chosenQuestions];
  while (finalQuestions.length < 10) {
    finalQuestions = [...finalQuestions, ...chosenQuestions.map(q => ({
      ...q,
      text: `${q.text} (Variante)`
    }))];
  }
  finalQuestions = finalQuestions.slice(0, 10);

  return {
    title: `Entraînement : ${cleanSubject}`,
    summary: `Ce quiz d'assimilation active a été généré instantanément d'après tes notions clés de : ${cleanSubject}.`,
    keyPoints: [
      `Assimilation et mémorisation active sur le thème : ${cleanSubject}.`,
      `Entraînement basé sur la répétition et l'auto-évaluation immédiate.`,
      `Correction instantanée avec explications détaillées intégrées.`,
      `Moteur de génération hors-ligne autonome ultra-sécurisé.`
    ],
    definitions: [
      { term: cleanSubject, definition: "Sujet d'étude principal sélectionné pour cette session d'apprentissage actif." },
      { term: "Auto-évaluation", definition: "Processus d'apprentissage consistant à tester ses propres connaissances pour renforcer l'ancrage mnésique." }
    ],
    questions: finalQuestions
  };
}

/**
 * Générateur de Flashcards de Secours (100% Hors-ligne)
 */
function generateOfflineFlashcardsFallback(subject: string, manualText: string): any[] {
  const cleanSubject = subject || "Mémorisation";
  
  const baseCards = [
    { front: `Quel est le but de la mémorisation active sur ${cleanSubject} ?`, back: `Stimuler le cerveau pour ancrer les informations de manière permanente grâce à l'auto-évaluation constante.` },
    { front: `Comment optimiser la révision du sujet : ${cleanSubject} ?`, back: `En révisant régulièrement en mode flashcards et en ciblant spécifiquement les erreurs commises pendant les quiz.` },
    { front: `Qu'est-ce que l'espacement progressif (SRS) ?`, back: `Une technique d'apprentissage qui consiste à réviser une information juste avant de l'oublier, en espaçant les séances de plus en plus.` }
  ];

  if (manualText && manualText.length > 20) {
    const sentences = manualText.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 15);
    if (sentences.length >= 3) {
      return sentences.slice(0, 15).map((s, idx) => ({
        front: `Expliquez le point clé ${idx + 1} du document (${cleanSubject}) :`,
        back: s
      }));
    }
  }

  let cards = [...baseCards];
  while (cards.length < 15) {
    cards = [...cards, ...baseCards.map(c => ({
      front: `${c.front} (Approfondissement ${cards.length + 1})`,
      back: c.back
    }))];
  }
  return cards.slice(0, 15);
}

/**
 * Centralized AI Service for Levelmak Pro.
 * Provides interaction methods for generating quizzes, flashcards, coaching, Feynman laboratory,
 * scientific problem solving, writing review, and plagiarism checking using Google Gemini API.
 */
export const aiService = {
  /**
   * Génère un examen surprise IA basé sur l'historique des discussions avec le coach.
   * 
   * @param {string} subject - Le sujet de l'examen.
   * @param {any[]} [coachSessions] - Liste des sessions de coaching de l'élève.
   * @param {string} [lang] - La langue cible ('fr', 'en', 'ar').
   */
  async generateAISurpriseExam(subject: string, coachSessions: any[] = [], lang: string = 'fr') {
    // 1. Extraire le contexte des sessions de coaching correspondant au sujet
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normSubject = normalize(subject);
    
    let relevantDialogues = "";
    let count = 0;
    
    // Trier par date de mise à jour décroissante
    const sortedSessions = [...coachSessions].sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
    
    for (const session of sortedSessions) {
      const titleMatches = normalize(session.title || "").includes(normSubject);
      let sessionText = "";
      let hasSubjectKeywords = false;
      
      if (session.messages) {
        for (const msg of session.messages) {
          const text = msg.text || "";
          sessionText += `${msg.role === 'user' ? 'Élève' : 'Coach'}: ${text}\n`;
          if (normalize(text).includes(normSubject)) {
            hasSubjectKeywords = true;
          }
        }
      }
      
      if (titleMatches || hasSubjectKeywords) {
        relevantDialogues += `--- Discussion Session: ${session.title || 'Discussion'} ---\n${sessionText}\n`;
        count++;
        if (count >= 3) break;
      }
    }
    
    // Si aucun dialogue spécifique n'est trouvé, prendre les discussions générales récentes
    if (!relevantDialogues && sortedSessions.length > 0) {
      let generalText = "";
      for (const session of sortedSessions.slice(0, 2)) {
        if (session.messages) {
          for (const msg of session.messages) {
            generalText += `${msg.role === 'user' ? 'Élève' : 'Coach'}: ${msg.text || ""}\n`;
          }
        }
      }
      relevantDialogues = `--- Discussions Générales Récentes ---\n${generalText}\n`;
    }

    try {
      const messages = [
        {
          role: "system",
          content: `Tu es le tuteur d'élite Levelmak Pro de TMAB GROUP. Ton rôle est de concevoir un examen surprise personnalisé de 10 questions sous forme de QCM.
          Cet examen doit porter en priorité SUR CE QUE L'ÉLÈVE A APPRIS ET SURTOUT LES SUJETS DISCUTÉS DANS L'HISTORIQUE DE SES SESSIONS DE COACHING (ci-dessous), en insistant sur ses erreurs, exercices ou explications scientifiques.
          Retourne UNIQUEMENT un objet JSON.`
        },
        {
          role: "user",
          content: `Matière principale : ${subject}
          Langue : ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}
          
          === HISTORIQUE DE SES INTERACTIONS / DISCUSSIONS AVEC LE COACH ===
          ${relevantDialogues || "Aucune discussion récente pour cette matière. Base-toi sur les notions clés du programme standard de : " + subject}
          ==================================================================
          
          Règles ABSOLUES :
          1. Génère exactement 10 questions de type QCM adaptées au niveau de l'élève. Basé sur les concepts abordés ou les éventuelles fautes de la discussion s'il y en a.
          2. Chaque question doit comporter 4 options, un index de bonne réponse (0, 1, 2 ou 3) et une explication pédagogique détaillée reprenant les explications du coach.
          3. Génère un JSON structuré :
             - "title": Titre accrocheur de l'examen (ex: "Examen Surprise IA : [Sujet]").
             - "summary": Résumé de 2-3 phrases sur les performances/concepts vus par l'élève dans ses discussions.
             - "keyPoints": 5 points clés validés par cet examen.
             - "definitions": [{ "term": "...", "definition": "..." }] (2-3 définitions importantes).
             - "questions": Tableau de 10 questions : { "text": "...", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": 0, "explanation": "..." }.
             - "subject": "${subject}"
          
          RÈGLE D'OR ABSOLUE:
          RETOURNE UNIQUEMENT L'OBJET JSON. AUCUN TEXTE AVANT ou APRÈS. PAS DE BALISES MARKDOWN COMME \`\`\`json. Assure-toi que la syntaxe JSON est PARFAITE (virgules et guillemets).`
        }
      ];

      const responseText = await callGemini(messages, true);

      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```/, "").replace(/```$/, "").trim();
      }
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : cleanedText;
      const data = JSON.parse(jsonStr);
      if (data.questions) {
        data.questions = data.questions.map((q: any, idx: number) => ({
          ...q,
          id: `surprise_q_${Date.now()}_${idx}`
        }));
      }
      return data;
    } catch (err) {
      console.warn("⚠️ Échec de la génération de l'examen surprise en ligne, activation du fallback hors-ligne...", err);
      const offlineQuiz = generateOfflineQuizFallback(subject, 'Intermédiaire', '');
      if (offlineQuiz.questions) {
        offlineQuiz.questions = offlineQuiz.questions.map((q: any, idx: number) => ({
          ...q,
          id: `surprise_q_${Date.now()}_${idx}`
        }));
      }
      return offlineQuiz;
    }
  },

  /**
   * Génère un quiz à partir de sources textuelles ou visuelles
   */
  async generateMultimodalQuiz(sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], subject: string, difficulty: string = 'Intermédiaire', lang: string = 'fr') {
    let textContent = "";
    sources.forEach(source => {
      if (source.type === 'text') {
        textContent += "\n\n" + source.data;
      }
    });

    try {
      const messages = [
        {
          role: "system",
          content: `Tu es un expert en pédagogie d'élite. Ton rôle est de concevoir un quiz rigoureusement basé SUR LE DOCUMENT fourni.
          Retourne UNIQUEMENT un objet JSON.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Sujet général: ${subject}
              Difficulté: ${difficulty}
              Langue de réponse: ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}
              
              Règles ABSOLUES :
              1. Ton quiz DOIT porter exclusivement sur le contenu des documents/images qui suivent. Si l'image est floue, fais de ton mieux pour déduire le sujet, mais retourne TOUJOURS un JSON valide, sans blabla.
              2. ADAPTE TON NIVEAU DE DIFFICULTÉ STRICTEMENT :
                 - Si "Facile" : Pose des questions très simples, basiques, dont la réponse est évidente dans le texte.
                 - Si "Intermédiaire" : Pose des questions demandant un peu de réflexion et d'analyse.
                 - Si "Expert" : Pose des questions complexes, pointues, avec des pièges subtils dans les réponses.
              3. ADAPTE TON LANGAGE AU NIVEAU DE L'ÉLÈVE.
              4. Génère un JSON structuré :
                 - "title": Titre accrocheur.
                 - "summary": Résumé de 3-4 phrases.
                 - "keyPoints": 5-7 points clés d'après le document.
                 - "definitions": [{ "term": "...", "definition": "..." }].
                 - "questions": Entre 10 et 15 questions QCM avec la structure: { "text": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..." }.
              
              RÈGLE D'OR ABSOLUE:
              RETOURNE UNIQUEMENT L'OBJET JSON. AUCUN TEXTE AVANT. AUCUN TEXTE APRÈS. PAS DE BALISES MARKDOWN COMME \`\`\`json. UNIQUEMENT L'ACCOLADE D'OUVERTURE ET DE FERMETURE. Assure-toi que la syntaxe JSON est PARFAITE (virgules et guillemets).`
            }
          ]
        }
      ];

      sources.forEach(source => {
        if (source.type === 'image') {
          const base64Data = source.data.includes(',') ? source.data : `data:image/jpeg;base64,${source.data}`;
          (messages[1].content as any[]).push({ type: "image_url", image_url: { url: base64Data } });
        }
      });

      if (textContent.trim() !== "") {
        (messages[1].content as any[]).push({ 
          type: "text", 
          text: `\n\n=== CONTENU DU DOCUMENT À ANALYSER ===\n${textContent}\n=======================================================\n\nMaintenant, génère le JSON complet exclusivement basé sur ce contenu.`
        });
      }

      const responseText = await callGemini(messages, true);

      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```/, "").replace(/```$/, "").trim();
      }
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : cleanedText;
      const data = JSON.parse(jsonStr);
      if (data.questions) {
        data.questions = data.questions.map((q: any, idx: number) => ({
          ...q,
          id: `q_${Date.now()}_${idx}`
        }));
      }
      return data;
    } catch (err) {
      console.warn("⚠️ Échec de la génération en ligne, activation du moteur de quiz hors-ligne résilient...", err);
      const offlineQuiz = generateOfflineQuizFallback(subject, difficulty, textContent);
      if (offlineQuiz.questions) {
        offlineQuiz.questions = offlineQuiz.questions.map((q: any, idx: number) => ({
          ...q,
          id: `q_${Date.now()}_${idx}`
        }));
      }
      return offlineQuiz;
    }
  },

  async coachChat(message: string, history: { role: 'user' | 'bot'; text: string }[], userContext: string, base64Image?: string, lang: string = 'fr') {
    const systemPrompt = COACH_SYSTEM_PROMPT(lang);

    const recentHistory = history.slice(-10).map(msg => ({
      role: msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.text
    }));

    const currentMessageContent: any[] = [{ type: "text", text: message || "Analyse cette image." }];
    if (base64Image) {
      const imgData = base64Image.includes(',') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
      currentMessageContent.push({ type: "image_url", image_url: { url: imgData } });
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...recentHistory,
      { role: "user", content: currentMessageContent }
    ];

    return await callGemini(messages, false);
  },

  async searchBooks(query: string, lang: string = 'fr') {
    const messages = [
      { role: "system", content: SEARCH_BOOKS_SYSTEM },
      { role: "user", content: SEARCH_BOOKS_USER(query, lang) }
    ];

    const text = await callGemini(messages, true);
    const data = JSON.parse(text);
    return {
      text: `Voici les ressources pour : "${query}"`,
      links: (data.recommendations || []).map((rec: any) => ({
        ...rec,
        uri: `https://www.google.com/search?q=${encodeURIComponent(rec.title + " " + rec.authors + " pdf")}`,
        thumbnail: `https://placehold.co/300x450/1e293b/FFFFFF/png?text=${encodeURIComponent(rec.title)}`,
        isGeminiFallback: true
      }))
    };
  },

  async generateMultimodalFlashcards(sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], subject: string, lang: string = 'fr') {
    let textContent = "";
    sources.forEach(source => {
      if (source.type === 'text') {
        textContent += "\n\n" + source.data;
      }
    });

    try {
      const messages = [
        { 
          role: "system", 
          content: FLASHCARDS_SYSTEM 
        },
        { 
          role: "user", 
          content: [
            {
              type: "text",
              text: FLASHCARDS_USER(subject, lang)
            }
          ]
        }
      ];

      sources.forEach(source => {
        if (source.type === 'image') {
          const base64Data = source.data.includes(',') ? source.data : `data:image/jpeg;base64,${source.data}`;
          (messages[1].content as any[]).push({ type: "image_url", image_url: { url: base64Data } });
        }
      });

      if (textContent.trim() !== "") {
        (messages[1].content as any[]).push({ 
          type: "text", 
          text: `\n\n=== CONTENU DU COURS ===\n${textContent}\n========================`
        });
      }

      const text = await callGemini(messages, true);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      return (data.cards || []).map((card: any, idx: number) => ({
        ...card,
        id: `fc_${Date.now()}_${idx}`,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0
      }));
    } catch (error) {
      console.warn("⚠️ Échec de la génération en ligne, activation du moteur de flashcards hors-ligne résilient...", error);
      const offlineCards = generateOfflineFlashcardsFallback(subject, textContent);
      return offlineCards.map((card: any, idx: number) => ({
        ...card,
        id: `fc_${Date.now()}_${idx}`,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0
      }));
    }
  },

  async generateFlashcards(content: string, subject: string, lang: string = 'fr') {
    return this.generateMultimodalFlashcards([{ type: 'text', data: content }], subject, lang);
  },

  async getDailyVocabulary(seenWords: string[] = [], lang: string = 'fr') {
    try {
      const dbHistoricalWords = await getHistoricalWords(lang);
      const allExcludedWords = Array.from(new Set([
        ...seenWords.map(w => w.toLowerCase().trim()),
        ...dbHistoricalWords
      ])).filter(Boolean);

      const languageName = lang === 'ar' ? 'arabe' : (lang === 'en' ? 'anglais' : 'français');
      const messages = [
        {
          role: "system",
          content: VOCABULARY_SYSTEM(languageName, allExcludedWords)
        },
        {
          role: "user",
          content: "Génère deux nouveaux mots de vocabulaire uniques selon la structure JSON demandée."
        }
      ];

      const responseText = await callGemini(messages, true);
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      if (Array.isArray(data) && data.length >= 2 && data[0]?.word && data[0]?.explanation) {
        return data;
      }
      throw new Error("Invalid format generated by Gemini");
    } catch (error) {
      console.warn('⚠️ Échec de génération de vocabulaire par l\'IA, utilisation du vocabulaire statique déterministe:', error);
      const langKey = DAILY_VOCAB[lang] ? lang : 'fr';
      const wordsList = DAILY_VOCAB[langKey];
      const day = new Date().getDate(); // 1 to 31
      const index = (day - 1) % wordsList.length;
      return wordsList[index];
    }
  },

  async getDailyMotivation(seenMotivations: string[] = [], lang: string = 'fr') {
    try {
      const dbHistoricalQuotes = await getHistoricalQuotes(lang);
      const allExcludedQuotes = Array.from(new Set([
        ...seenMotivations.map(q => q.toLowerCase().trim()),
        ...dbHistoricalQuotes
      ])).filter(Boolean);

      const languageName = lang === 'ar' ? 'arabe' : (lang === 'en' ? 'anglais' : 'français');
      const messages = [
        {
          role: "system",
          content: MOTIVATION_SYSTEM(languageName, allExcludedQuotes)
        },
        {
          role: "user",
          content: "Génère une nouvelle citation de motivation unique selon la structure JSON demandée."
        }
      ];

      const responseText = await callGemini(messages, true);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      if (data && data.quote && data.author) {
        return data;
      }
      throw new Error("Invalid format generated by Gemini");
    } catch (error) {
      console.warn('⚠️ Échec de génération de motivation par l\'IA, utilisation de la citation statique déterministe:', error);
      const langKey = DAILY_MOTIVATION[lang] ? lang : 'fr';
      const quoteList = DAILY_MOTIVATION[langKey];
      const day = new Date().getDate(); // 1 to 31
      const index = (day - 1) % quoteList.length;
      return quoteList[index];
    }
  },

  async analyzeWriting(text: string, title: string, lang: string = 'fr') {
    const systemPrompt = WRITING_ANALYZE_SYSTEM;
    const langName = lang === 'ar' ? 'arabe' : (lang === 'en' ? 'anglais' : 'français');
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: WRITING_ANALYZE_USER(text, title, langName) }
    ];
    const response = await callGemini(messages, true);
    return JSON.parse(response);
  },

  async writingCoachChat(mode: 'review' | 'help', text: string, title: string, lang: string = 'fr') {
    let systemPrompt = "";
    const langName = lang === 'ar' ? 'arabe' : (lang === 'en' ? 'anglais' : 'français');
    if (mode === 'review') {
      systemPrompt = WRITING_COACH_REVIEW_SYSTEM(title, langName);
    } else {
      systemPrompt = WRITING_COACH_HELP_SYSTEM(title, langName);
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Voici mon texte :\nTitre : "${title}"\nContenu : "${text}"` }
    ];
    return await callGemini(messages, false);
  },

  async solveScientificProblem(problem: string, context?: string, base64Image?: string, lang: string = 'fr') {
    const systemPrompt = SCIENTIFIC_SOLVER_SYSTEM;
    const userContent: any[] = [{ type: "text", text: `Problème : ${problem}` }];
    if (base64Image) {
      const imgData = base64Image.includes(',') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
      userContent.push({ type: "image_url", image_url: { url: imgData } });
    }
    const response = await callGemini([{ role: "system", content: systemPrompt }, { role: "user", content: userContent }], true);
    return JSON.parse(response);
  },

  async verifyScientificSolution(problemContext: string, studentSolutionBase64: string, lang: string = 'fr') {
    const systemPrompt = SCIENTIFIC_CHECKER_SYSTEM;
    const imgData = studentSolutionBase64.includes(',') ? studentSolutionBase64 : `data:image/jpeg;base64,${studentSolutionBase64}`;
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: [{ type: "text", text: `Énoncé: ${problemContext}` }, { type: "image_url", image_url: { url: imgData } }]}
    ];
    const response = await callGemini(messages, true);
    return JSON.parse(response);
  },

  async historyChat(message: string, history: { role: 'user' | 'assistant'; content: string }[], character: string, era: string, dates: string, bio: string, lang: string = 'fr', base64Image?: string) {
    const systemPrompt = HISTORY_SYSTEM_PROMPT(character, dates, era, bio, lang);
    
    const userContent: any[] = [{ type: "text", text: message || "Regarde cette image." }];
    if (base64Image) {
      const imgData = base64Image.includes(',') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
      userContent.push({ type: "image_url", image_url: { url: imgData } });
    }

    const messages = [
      { role: "system", content: systemPrompt }, 
      ...history, 
      { role: "user", content: userContent }
    ];
    return await callGemini(messages, false);
  },

  async feynmanChat(message: string, history: { role: 'user' | 'assistant'; content: string }[], topic: string, lang: string = 'fr', base64Image?: string) {
    const systemPrompt = FEYNMAN_SYSTEM_PROMPT(topic, lang);
    
    const userContent: any[] = [{ type: "text", text: message || "Qu'est-ce que c'est sur cette image ?" }];
    if (base64Image) {
      const imgData = base64Image.includes(',') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
      userContent.push({ type: "image_url", image_url: { url: imgData } });
    }

    const messages = [
      { role: "system", content: systemPrompt }, 
      ...history, 
      { role: "user", content: userContent }
    ];
    return await callGemini(messages, false);
  },

  async getBattleQuiz(lang: string = 'fr') {
    try {
      const prompt = BATTLE_QUIZ_USER_PROMPT(lang);
      const text = await callGemini([{ role: "user", content: prompt }], true);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        return data.questions.map((q: any, idx: number) => ({ ...q, id: `battle_q_${Date.now()}_${idx}` }));
      }
    } catch (err) {
      console.warn("⚠️ Échec de la génération IA du duel, utilisation des questions de secours autonomes:", err);
    }
    return [
      { id: 'b_q_1', text: "Quelle est la vitesse approximative de la lumière dans le vide ?", options: ["300 000 km/s", "150 000 km/s", "1 000 000 km/s", "30 000 km/s"], correctAnswer: 0, explanation: "La lumière se déplace à environ 299 792 km/s dans le vide." },
      { id: 'b_q_2', text: "Quel est l'élément chimique représenté par le symbole 'O' ?", options: ["Or", "Oxygène", "Osmium", "Ozone"], correctAnswer: 1, explanation: "L'Oxygène est l'élément chimique de numéro atomique 8, de symbole O." },
      { id: 'b_q_3', text: "Combien de continents compte la Terre ?", options: ["5", "6", "7", "8"], correctAnswer: 2, explanation: "On compte généralement 7 continents : Asie, Afrique, Amérique du Nord, Amérique du Sud, Antarctique, Europe et Océanie." },
      { id: 'b_q_4', text: "Qui a formulé la théorie de la relativité générale ?", options: ["Isaac Newton", "Albert Einstein", "Nikola Tesla", "Galilée"], correctAnswer: 1, explanation: "Albert Einstein a publié la théorie de la relativité générale en 1915." },
      { id: 'b_q_5', text: "Quel est le plus grand océan de la Terre ?", options: ["Océan Atlantique", "Océan Pacifique", "Océan Indien", "Océan Arctique"], correctAnswer: 1, explanation: "L'océan Pacifique couvre environ 165 millions de km²." },
      { id: 'b_q_6', text: "Quelle planète est surnommée la Planète Rouge ?", options: ["Vénus", "Jupiter", "Mars", "Saturne"], correctAnswer: 2, explanation: "Mars doit sa couleur rouge aux oxydes de fer présents à sa surface." },
      { id: 'b_q_7', text: "Quelle est la capitale de la France ?", options: ["Lyon", "Paris", "Marseille", "Bordeaux"], correctAnswer: 1, explanation: "Paris est la capitale et le chef-lieu de la région Île-de-France." },
      { id: 'b_q_8', text: "Quel organe pompe le sang dans le corps humain ?", options: ["Le poumon", "Le cerveau", "Le cœur", "Le foie"], correctAnswer: 2, explanation: "Le cœur est un muscle creux qui assure la circulation du sang." },
      { id: 'b_q_9', text: "Combien d'octets y a-t-il dans un kilooctet (Ko) en informatique standard ?", options: ["1000 octets", "1024 octets", "512 octets", "2048 octets"], correctAnswer: 1, explanation: "Un kilooctet équivaut à 1024 octets en binaire." },
      { id: 'b_q_10', text: "Quel est le plus grand désert du monde ?", options: ["Le Sahara", "L'Antarctique", "Le désert de Gobi", "Le désert d'Atacama"], correctAnswer: 1, explanation: "L'Antarctique est considéré comme le plus grand désert froid du monde." }
    ];
  },

  /**
   * Génère du texte libre — utilisé par ai-planner.ts et d'autres services
   */
  async generateText(prompt: string): Promise<string> {
    return await callGemini([{ role: "user", content: prompt }], false);
  },

  /**
   * Alias de generateMultimodalQuiz pour la compatibilité avec AISummary
   */
  async generateQuiz(content: string, title: string, difficulty: string = 'Intermédiaire', lang: string = 'fr') {
    return this.generateMultimodalQuiz([{ type: 'text', data: content }], title, difficulty, lang);
  },

  /**
   * Génère un plan d'étude avec images — utilisé par StudyPlanner
   */
  async generatePlanWithImages(examDate: string, subjects: string[], base64Images: string[]) {
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en planification pédagogique. Génère un plan d'étude structuré au format JSON: { "title", "startDate", "endDate", "tasks": [{ "id", "title", "subject", "description", "duration", "priority", "date" }] }.`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Génère un plan d'étude pour l'examen du ${examDate}. Matières : ${subjects.join(', ')}. Analyse les images de cours ci-jointes pour adapter le contenu.`
          },
          ...base64Images.map(img => ({
            type: "image_url",
            image_url: { url: img.includes(',') ? img : `data:image/jpeg;base64,${img}` }
          }))
        ]
      }
    ];
    const text = await callGemini(messages, true);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  },

  /**
   * Génère un plan d'étude multimodal complet
   */
  async generatePlanMultimodal(examDate: string, subjects: string[], sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], lang: string = 'fr') {
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en planification pédagogique d'élite.
Ton but est de concevoir un plan d'étude réaliste, sur-mesure et structuré pour un étudiant préparant ses examens pour le ${examDate}.
Les matières principales sont : ${subjects.join(', ')}.
Langue de réponse : ${lang === 'ar' ? 'Arabe' : (lang === 'en' ? 'Anglais' : 'Français')}.

Retourne UNIQUEMENT un objet JSON valide avec la structure suivante :
{
  "title": "Nom du plan de révision stratégique",
  "startDate": "${new Date().toISOString().split('T')[0]}",
  "endDate": "${examDate}",
  "tasks": [
    {
      "id": "task_1",
      "title": "Titre explicite de la session (ex: Maitriser les forces de Newton)",
      "subject": "Nom de la matière correspondante",
      "description": "Objectif précis de la révision basé sur les documents fournis",
      "duration": "Durée (ex: 2h)",
      "priority": "high",
      "date": "YYYY-MM-DD"
    }
  ],
  "extractedTopics": ["Sujet clé 1", "Sujet clé 2"]
}`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Génère le plan d'étude en analysant attentivement le contenu des documents de révision ci-joints.`
          }
        ]
      }
    ];

    let textContent = "";
    sources.forEach(source => {
      if (source.type === 'text') {
        textContent += "\n\n" + source.data;
      } else if (source.type === 'image') {
        const base64Data = source.data.includes(',') ? source.data : `data:image/jpeg;base64,${source.data}`;
        (messages[1].content as any[]).push({ type: "image_url", image_url: { url: base64Data } });
      }
    });

    if (textContent.trim() !== "") {
      (messages[1].content as any[]).push({ 
        type: "text", 
        text: `\n\n=== TEXTE EXTRAIT DES DOCUMENTS ===\n${textContent}\n====================================`
      });
    }

    const text = await callGemini(messages, true);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  },

  /**
   * Résumé multimodal corrigé — structure de message correcte
   */
  async summarizeMultimodal(sources: { type: 'text' | 'image' | 'pdf' | 'word', data: string }[], subject: string = 'Inconnu', lang: string = 'fr') {
    const userContent: any[] = [
      { type: "text", text: `Sujet: ${subject}. Langue: ${lang}. Génère une synthèse complète basée sur le contenu fourni.` }
    ];

    let textContent = "";
    sources.forEach(source => {
      if (source.type === 'text') {
        textContent += "\n" + source.data;
      } else if (source.type === 'image') {
        const base64Data = source.data.includes(',') ? source.data : `data:image/jpeg;base64,${source.data}`;
        userContent.push({ type: "image_url", image_url: { url: base64Data } });
      }
    });

    if (textContent.trim()) {
      userContent.push({ type: "text", text: `\n\n=== CONTENU ===\n${textContent}\n===============` });
    }

    const messages = [
      { role: "system", content: "Expert en synthèse pédagogique. Retourne JSON: { \"title\", \"mainSummary\", \"keyPoints\", \"definitions\", \"estimatedReadingTime\", \"difficulty\" }." },
      { role: "user", content: userContent }
    ];

    const text = await callGemini(messages, true);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  },

  /**
   * Vérifie si un écrit de l'atelier d'écriture est plagié ou généré par IA
   */
  async checkWritingPlagiarismAndAI(text: string, title: string, existingTitles: string[] = []): Promise<{
    isPlagiarizedOrAI: boolean;
    aiConfidence: number;
    plagiarismConfidence: number;
    reason: string;
  }> {
    try {
      const messages = [
        {
          role: "system",
          content: `Tu es un expert en détection de plagiat et de textes générés par intelligence artificielle (détecteur IA/LLM).
Analyse le texte et le titre soumis par l'élève.
Compare le titre avec la liste des titres déjà existants dans la base de données : ${JSON.stringify(existingTitles)}.

Détermine :
1. Si le texte a de fortes chances d'être plagié (copie intégrale de sources connues ou d'autres écrits de la liste).
2. Si le texte est généré à 100% par un modèle d'IA (style trop formel, structure robotique typique de ChatGPT/Gemini, expressions récurrentes d'IA).

Retourne UNIQUEMENT un objet JSON valide avec la structure suivante :
{
  "isPlagiarizedOrAI": true ou false,
  "aiConfidence": score entre 0 et 100,
  "plagiarismConfidence": score entre 0 et 100,
  "reason": "Explication claire et bienveillante en français de l'infraction détectée (ex: Le texte présente 95% de similitudes avec un modèle d'IA ou le titre existe déjà)."
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Titre soumis : "${title}"
Texte soumis :
"${text}"`
            }
          ]
        }
      ];

      const responseText = await callGemini(messages, true);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      return {
        isPlagiarizedOrAI: !!result.isPlagiarizedOrAI,
        aiConfidence: Number(result.aiConfidence) || 0,
        plagiarismConfidence: Number(result.plagiarismConfidence) || 0,
        reason: result.reason || ""
      };
    } catch (error) {
      console.error("Error checking plagiarism/AI:", error);
      // Fallback local en cas d'erreur réseau/API
      const titleExists = existingTitles.some(t => t.toLowerCase().trim() === title.toLowerCase().trim());
      const lowerText = text.toLowerCase();
      // Heuristiques simples de détection IA locales (mots de transition typiques IA)
      const aiMarkers = ["en conclusion,", "tout d'abord,", "il est important de noter", "il est essentiel de", "en fin de compte", "dans ce cadre"];
      let markerCount = 0;
      aiMarkers.forEach(marker => {
        if (lowerText.includes(marker)) markerCount++;
      });

      const isLocalFlag = titleExists || (markerCount >= 3) || (text.length > 200 && lowerText.includes("en conclusion") && lowerText.includes("de plus"));

      return {
        isPlagiarizedOrAI: isLocalFlag,
        aiConfidence: titleExists ? 0 : (markerCount >= 3 ? 80 : 0),
        plagiarismConfidence: titleExists ? 100 : 0,
        reason: titleExists 
          ? "Ce titre d'écrit existe déjà dans la base de données (plagiat potentiel)."
          : "Le texte contient des structures de transition trop caractéristiques d'une génération par IA."
      };
    }
  }
};

