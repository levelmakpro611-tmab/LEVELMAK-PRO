import { telemetryService, StudentAIInteraction } from './telemetryService';

export interface LogStudentInteractionParams {
  userId?: string;
  userName?: string;
  gradeClass?: string;
  subject: string;
  prompt: string;
  response: string;
  interactionType?: StudentAIInteraction['interactionType'];
  reasoningTimeSeconds?: number;
}

export const studentAiService = {
  /**
   * Safe helper to log AI interactions from any component or service
   */
  async logInteraction(params: LogStudentInteractionParams): Promise<StudentAIInteraction | null> {
    try {
      return await telemetryService.logInteraction({
        userId: params.userId || 'anon_student',
        userName: params.userName || 'Élève',
        gradeClass: params.gradeClass || 'Terminale',
        subject: params.subject,
        prompt: params.prompt,
        response: params.response,
        interactionType: params.interactionType || 'ai_chat',
        reasoningTimeSeconds: params.reasoningTimeSeconds || 0
      });
    } catch (error) {
      console.warn('[studentAiService] Silent logging warning:', error);
      return null;
    }
  },

  /**
   * Fetch all dataset records
   */
  async getDataset(): Promise<StudentAIInteraction[]> {
    return await telemetryService.getInteractions();
  },

  /**
   * Update curation status (approved/rejected)
   */
  async updateStatus(id: string, status: StudentAIInteraction['status']): Promise<void> {
    await telemetryService.updateStatus(id, status);
  },

  /**
   * Delete record
   */
  async deleteRecord(id: string): Promise<void> {
    await telemetryService.deleteInteraction(id);
  },

  /**
   * Export dataset to PC (.JSONL format for PyTorch / Unsloth / Ollama fine-tuning)
   */
  exportJSONL(dataset: StudentAIInteraction[], filename?: string): void {
    telemetryService.exportToPCJSONL(dataset, filename);
  },

  /**
   * Export dataset to PC (.JSON format)
   */
  exportJSON(dataset: StudentAIInteraction[], filename?: string): void {
    telemetryService.exportToPCJSON(dataset, filename);
  },

  /**
   * Purge cloud DB while keeping offline export safe
   */
  async purgeCloudStorage(): Promise<void> {
    await telemetryService.clearCloudDataset();
  }
};
