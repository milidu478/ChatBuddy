import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { prisma } from '../config/database.js';
import { AIService } from '../services/ai.service.js';

export const getMeHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        createdAt: true 
      }
    });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: user });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getApiKeySettingsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { geminiApiKey: true },
    });

    const hasUserKey = Boolean(user?.geminiApiKey);
    const hasServerKey = Boolean(process.env.GEMINI_API_KEY);

    res.status(200).json({
      status: 'success',
      data: {
        hasUserKey,
        hasServerKey,
        isConfigured: hasUserKey || hasServerKey,
        keyHint: user?.geminiApiKey ? `...${user.geminiApiKey.slice(-4)}` : null,
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const saveGeminiApiKeyHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    if (!apiKey) {
      res.status(400).json({ status: 'error', message: 'API key is required' });
      return;
    }

    await AIService.validateApiKey(apiKey);

    await prisma.user.update({
      where: { id: userId },
      data: { geminiApiKey: apiKey },
    });

    res.status(200).json({
      status: 'success',
      message: 'Gemini API key saved',
      data: { keyHint: `...${apiKey.slice(-4)}` },
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const deleteGeminiApiKeyHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { geminiApiKey: null },
    });

    res.status(200).json({ status: 'success', message: 'Gemini API key removed' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const validateGeminiApiKeyHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    if (!apiKey) {
      res.status(400).json({ status: 'error', message: 'API key is required' });
      return;
    }

    await AIService.validateApiKey(apiKey);
    res.status(200).json({ status: 'success', message: 'API key is valid' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};
