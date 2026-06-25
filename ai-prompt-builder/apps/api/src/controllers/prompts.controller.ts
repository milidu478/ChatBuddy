import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { z } from 'zod';
import { PromptService } from '../services/prompt.service.js';
import { TemplateService } from '../services/template.service.js';

const buildPromptSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  userInput: z.record(z.string()).optional(),
});

export const buildPromptHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = buildPromptSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ 
        status: 'error',
        message: 'Invalid request data'
      });
      return;
    }

    const { templateId, userInput } = validation.data;

    // 1. Template එක Database එකෙන් හොයාගැනීම
    const template = await TemplateService.getTemplateById(templateId);
    if (!template) {
      res.status(404).json({ status: 'error', message: 'Template not found' });
      return;
    }

    // 2. Service එක හරහා Prompt එක හැදීම
    const finalPrompt = PromptService.buildPrompt(template.promptText, userInput || {});

    res.status(200).json({ 
      status: 'success', 
      data: { finalPrompt } 
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};