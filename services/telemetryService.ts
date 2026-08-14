import { supabase } from './supabase';

export interface StudentAIInteraction {
  id: string;
  userId: string;
  userName: string;
  gradeClass: string;
  subject: string;
  prompt: string;
  response: string;
  interactionType: 'ai_chat' | 'quiz' | 'flashcard' | 'study_plan' | 'ai_lab';
  reasoningTimeSeconds?: number;
  qualityRating?: number; // 1 to 5
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const LOCAL_STORAGE_KEY = 'levelmak_student_ai_interactions_dataset';

export const telemetryService = {
  /**
   * Log an interaction silently (saves to Supabase & localStorage fallback)
   */
  async logInteraction(params: {
    userId: string;
    userName: string;
    gradeClass?: string;
    subject: string;
    prompt: string;
    response: string;
    interactionType?: StudentAIInteraction['interactionType'];
    reasoningTimeSeconds?: number;
  }): Promise<StudentAIInteraction> {
    const interaction: StudentAIInteraction = {
      id: `telemetry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: params.userId || 'anon_user',
      userName: params.userName || 'Élève Anonyme',
      gradeClass: params.gradeClass || 'Non précisé',
      subject: params.subject || 'Général',
      prompt: params.prompt.trim(),
      response: params.response.trim(),
      interactionType: params.interactionType || 'ai_chat',
      reasoningTimeSeconds: params.reasoningTimeSeconds || 0,
      qualityRating: 5,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // 1. Save to local storage cache
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing: StudentAIInteraction[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [interaction, ...existing].slice(0, 1000); // Keep last 1000 locally
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[TelemetryService] Local cache save skipped', e);
    }

    // 2. Async save to Supabase (silently ignore network failures)
    if (params.userId && !params.userId.includes('anon')) {
      supabase.from('student_ai_interactions').insert([{
        id: interaction.id,
        user_id: interaction.userId,
        user_name: interaction.userName,
        grade_class: interaction.gradeClass,
        subject: interaction.subject,
        prompt: interaction.prompt,
        response: interaction.response,
        interaction_type: interaction.interactionType,
        reasoning_time_seconds: interaction.reasoningTimeSeconds,
        quality_rating: interaction.qualityRating,
        status: interaction.status,
        created_at: interaction.createdAt
      }]).then(({ error }) => {
        if (error) {
          // If table doesn't exist yet, fallback to user_events log
          supabase.from('user_events').insert([{
            user_id: interaction.userId,
            user_name: interaction.userName,
            event_title: `Télémétrie IA - ${interaction.subject}`,
            event_type: 'telemetry_dataset',
            payload: interaction
          }]).then();
        }
      }).catch(e => console.warn('[TelemetryService Sync Silent Exception]', e));
    }

    return interaction;
  },

  /**
   * Get all interactions (merging Supabase DB + local cache)
   */
  async getInteractions(): Promise<StudentAIInteraction[]> {
    let remoteInteractions: StudentAIInteraction[] = [];

    try {
      const { data, error } = await supabase
        .from('student_ai_interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (!error && data && data.length > 0) {
        remoteInteractions = data.map(item => ({
          id: item.id,
          userId: item.user_id,
          userName: item.user_name || 'Élève',
          gradeClass: item.grade_class || 'Terminale',
          subject: item.subject || 'Général',
          prompt: item.prompt || '',
          response: item.response || '',
          interactionType: item.interaction_type || 'ai_chat',
          reasoningTimeSeconds: item.reasoning_time_seconds || 0,
          qualityRating: item.quality_rating || 5,
          status: item.status || 'pending',
          createdAt: item.created_at
        }));
      } else {
        // Fallback to user_events if table doesn't exist
        const { data: eventData } = await supabase
          .from('user_events')
          .select('*')
          .eq('event_type', 'telemetry_dataset')
          .order('created_at', { ascending: false })
          .limit(1000);

        if (eventData && eventData.length > 0) {
          remoteInteractions = eventData.map(e => e.payload as StudentAIInteraction).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn('[TelemetryService] Remote fetch fallback', e);
    }

    // Merge with local storage
    let localInteractions: StudentAIInteraction[] = [];
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (existingStr) {
        localInteractions = JSON.parse(existingStr);
      }
    } catch (e) {
      console.warn('[TelemetryService] Local fetch error', e);
    }

    // Deduplicate by ID and sanitize fields
    const map = new Map<string, StudentAIInteraction>();
    [...remoteInteractions, ...localInteractions].forEach(raw => {
      if (raw && raw.id) {
        const item: StudentAIInteraction = {
          id: String(raw.id),
          userId: String(raw.userId || 'anon_user'),
          userName: typeof raw.userName === 'string' ? raw.userName : String(raw.userName || 'Élève'),
          gradeClass: typeof raw.gradeClass === 'string' ? raw.gradeClass : String(raw.gradeClass || 'Terminale'),
          subject: typeof raw.subject === 'string' ? raw.subject : String(raw.subject || 'Général'),
          prompt: typeof raw.prompt === 'string' ? raw.prompt : (typeof raw.prompt === 'object' ? JSON.stringify(raw.prompt) : String(raw.prompt || '')),
          response: typeof raw.response === 'string' ? raw.response : (typeof raw.response === 'object' ? JSON.stringify(raw.response) : String(raw.response || '')),
          interactionType: raw.interactionType || 'ai_chat',
          reasoningTimeSeconds: Number(raw.reasoningTimeSeconds) || 0,
          qualityRating: Number(raw.qualityRating) || 5,
          status: raw.status || 'pending',
          createdAt: String(raw.createdAt || new Date().toISOString())
        };
        map.set(item.id, item);
      }
    });

    const all = Array.from(map.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return all;
  },

  /**
   * Update interaction status (approved/rejected)
   */
  async updateStatus(id: string, status: StudentAIInteraction['status']): Promise<void> {
    // 1. Local update
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (existingStr) {
        const existing: StudentAIInteraction[] = JSON.parse(existingStr);
        const updated = existing.map(item => item.id === id ? { ...item, status } : item);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn(e);
    }

    // 2. Remote update
    try {
      await supabase.from('student_ai_interactions').update({ status }).eq('id', id);
    } catch (e) {
      console.warn(e);
    }
  },

  /**
   * Delete an interaction
   */
  async deleteInteraction(id: string): Promise<void> {
    // Local
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (existingStr) {
        const existing: StudentAIInteraction[] = JSON.parse(existingStr);
        const updated = existing.filter(item => item.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn(e);
    }

    // Remote
    try {
      await supabase.from('student_ai_interactions').delete().eq('id', id);
    } catch (e) {
      console.warn(e);
    }
  },

  /**
   * Clear all synced dataset records from cloud (Keep cloud storage clean)
   */
  async clearCloudDataset(): Promise<void> {
    try {
      await supabase.from('student_ai_interactions').delete().neq('id', '0');
    } catch (e) {
      console.warn(e);
    }
  },

  /**
   * Export dataset to PC file (.JSONL format for PyTorch / Unsloth / Ollama fine-tuning)
   */
  exportToPCJSONL(interactions: StudentAIInteraction[], filename = 'levelmak_student_ai_dataset.jsonl') {
    const lines = interactions.map(item => JSON.stringify({
      messages: [
        { role: 'system', content: `Tu es Levelmak AI, l'assistant pédagogique spécialisé pour la classe de ${item.gradeClass} en ${item.subject}.` },
        { role: 'user', content: item.prompt },
        { role: 'assistant', content: item.response }
      ],
      metadata: {
        id: item.id,
        subject: item.subject,
        gradeClass: item.gradeClass,
        reasoningTimeSeconds: item.reasoningTimeSeconds,
        createdAt: item.createdAt
      }
    }));

    const blob = new Blob([lines.join('\n')], { type: 'application/x-jsonlines' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Export dataset to PC file (.JSON format)
   */
  exportToPCJSON(interactions: StudentAIInteraction[], filename = 'levelmak_student_ai_dataset.json') {
    const jsonStr = JSON.stringify(interactions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
