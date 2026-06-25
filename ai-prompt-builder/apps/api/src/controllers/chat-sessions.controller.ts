import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { prisma } from '../config/database.js';
import { MessageRole } from '@prisma/client';

function deriveTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'New Chat';
  return trimmed.length <= 50 ? trimmed : `${trimmed.slice(0, 47)}...`;
}

async function getOwnedSession(sessionId: string, userId: string) {
  return prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });
}

export const listChatSessionsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ status: 'success', data: sessions });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createChatSessionHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const title = typeof req.body?.title === 'string' && req.body.title.trim()
      ? req.body.title.trim()
      : 'New Chat';

    const session = await prisma.chatSession.create({
      data: { userId, title },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({ status: 'success', data: session });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getSessionMessagesHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const session = await getOwnedSession(id, userId);
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Chat session not found' });
      return;
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: id, role: { not: 'SYSTEM' } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    res.status(200).json({ status: 'success', data: messages });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createSessionMessageHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { role, content } = req.body ?? {};

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    if (!content || typeof content !== 'string') {
      res.status(400).json({ status: 'error', message: 'Message content is required' });
      return;
    }

    const normalizedRole = String(role ?? '').toUpperCase();
    if (normalizedRole !== 'USER' && normalizedRole !== 'ASSISTANT') {
      res.status(400).json({ status: 'error', message: 'Role must be USER or ASSISTANT' });
      return;
    }

    const session = await getOwnedSession(id, userId);
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Chat session not found' });
      return;
    }

    const message = await prisma.chatMessage.create({
      data: {
        sessionId: id,
        role: normalizedRole as MessageRole,
        content,
      },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    if (normalizedRole === 'USER' && (session.title === 'New Chat' || !session.title)) {
      await prisma.chatSession.update({
        where: { id },
        data: { title: deriveTitle(content) },
      });
    } else {
      await prisma.chatSession.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
    }

    res.status(201).json({ status: 'success', data: message });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteChatSessionHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    const session = await getOwnedSession(id, userId);
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Chat session not found' });
      return;
    }

    await prisma.chatSession.delete({ where: { id } });

    res.status(200).json({ status: 'success', message: 'Chat session deleted' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteAllChatSessionsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'User not authenticated' });
      return;
    }

    await prisma.chatSession.deleteMany({ where: { userId } });

    res.status(200).json({ status: 'success', message: 'All chat sessions deleted' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
