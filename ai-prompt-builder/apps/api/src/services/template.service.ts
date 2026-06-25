import { prisma } from '../config/database.js';

export class TemplateService {
  // 1. එක Template එකක් ලබාගැනීම
  static async getTemplateById(id: string) {
    if (!id) {
      throw new Error('Template ID is required');
    }

    return await prisma.template.findUnique({
      where: { id }
    });
  }
}