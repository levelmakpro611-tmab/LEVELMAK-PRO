import { createWorker } from 'tesseract.js';

/**
 * Service pour l'OCR local via Tesseract.js
 */
export const ocrService = {
  /**
   * Extrait le texte d'une image (DataURL ou URL)
   * @param imageSource Source de l'image (base64 ou URL)
   * @param lang Langues à utiliser (ex: 'fra+eng')
   * @returns Texte extrait
   */
  async extractText(imageSource: string, lang: string = 'fra+eng'): Promise<string> {
    console.log('🚀 OCR: Démarrage de l\'extraction...');
    try {
      const worker = await createWorker(lang);
      const { data: { text } } = await worker.recognize(imageSource);
      await worker.terminate();
      console.log('✅ OCR: Extraction réussie.');
      return text;
    } catch (error) {
      console.error('❌ OCR: Erreur lors de l\'extraction:', error);
      throw new Error('Impossible d\'extraire le texte de l\'image. Assurez-vous que l\'image est claire.');
    }
  }
};
