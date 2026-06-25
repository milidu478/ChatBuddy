import { Server as HttpServer } from 'http';

import { Server, Socket } from 'socket.io';

import jwt from 'jsonwebtoken';

import { config } from './config/index.js';

import { prisma } from './config/database.js';

import { AIService } from './services/ai.service.js';



function deriveTitle(content: string): string {

  const trimmed = content.trim().replace(/\s+/g, ' ');

  if (!trimmed) return 'New Chat';

  return trimmed.length <= 50 ? trimmed : `${trimmed.slice(0, 47)}...`;

}



export const initSocketServer = (httpServer: HttpServer) => {

  const io = new Server(httpServer, {

    cors: {

      origin: config.env === 'production' 

        ? process.env.FRONTEND_URL || 'https://yourdomain.com'

        : 'http://localhost:3000',

      methods: ['GET', 'POST'],

      credentials: true,

      allowedHeaders: ['Content-Type', 'Authorization'],

    },

  });



  io.use((socket: Socket, next) => {

    const token = socket.handshake.auth.token;

    if (!token) {

      return next(new Error('Authentication error: Token missing'));

    }



    try {

      const decoded = jwt.verify(token, config.jwtSecret) as { id: string };

      (socket as any).userId = decoded.id;

      next();

    } catch (err) {

      next(new Error('Authentication error: Invalid token'));

    }

  });



  io.on('connection', (socket: Socket) => {

    const userId = (socket as any).userId;

    (socket as any).lastMessageTime = 0;

    console.log(`🔌 User connected via WebSocket: ${userId}`);



    socket.on('join_session', async ({ sessionId }) => {

      try {

        if (!sessionId) {

          socket.emit('chat_error', { message: 'Session ID is required', fatal: true });

          return;

        }



        let session = await prisma.chatSession.findUnique({

          where: { id: sessionId },

          include: {

            messages: {

              where: { role: { not: 'SYSTEM' } },

              orderBy: { createdAt: 'asc' },

            },

          },

        });



        if (!session) {

          console.log(`📝 Creating chat session on join: ${sessionId}`);

          session = await prisma.chatSession.create({

            data: {

              id: sessionId,

              userId,

              title: 'New Chat',

            },

            include: {

              messages: {

                where: { role: { not: 'SYSTEM' } },

                orderBy: { createdAt: 'asc' },

              },

            },

          });

        }



        if (session.userId !== userId) {

          socket.emit('chat_error', { message: 'Unauthorized access to this session', fatal: true });

          return;

        }



        socket.join(sessionId);

        console.log(`👤 User joined session room: ${sessionId}`);



        const formattedMessages = (session.messages || []).map((m) => ({

          id: m.id,

          role: m.role,

          content: m.content,

        }));



        socket.emit('session_ready', { sessionId, success: true, messages: formattedMessages });

      } catch (error: any) {

        console.error('❌ Error joining session:', error);

        socket.emit('chat_error', { 

          message: 'Failed to join session',

          details: error.message,

          fatal: true,

        });

      }

    });



    socket.on('send_message', async ({ sessionId, content, templateId, finalPrompt }) => {

      try {

        console.log(`📨 [${sessionId}] Received message from ${userId}:`, content.substring(0, 50));



        const now = Date.now();

        const lastTime = (socket as any).lastMessageTime || 0;

        if (now - lastTime < 1000) {

          console.warn(`⚠️ [send_message] Rate limit hit for user ${userId}. Request ignored.`);

          socket.emit('chat_error', { message: 'Too many requests. Please wait a moment.', fatal: false });

          return;

        }

        (socket as any).lastMessageTime = now;



        if (!sessionId || !content) {

          socket.emit('chat_error', { message: 'Session ID and content are required', fatal: false });

          return;

        }



        const session = await prisma.chatSession.findFirst({

          where: { id: sessionId, userId },

        });



        if (!session) {

          socket.emit('chat_error', { message: 'Session not found or unauthorized', fatal: true });

          return;

        }



        const user = await prisma.user.findUnique({

          where: { id: userId },

          select: { geminiApiKey: true },

        });



        const resolvedApiKey = user?.geminiApiKey || process.env.GEMINI_API_KEY;

        if (!resolvedApiKey) {

          socket.emit('chat_error', {

            message: 'No Gemini API key configured. Add one in Prompt Manager settings.',

            fatal: false,

          });

          return;

        }



        const promptToAI = finalPrompt || content;



        console.log(`📚 Fetching prior message history for session ${sessionId}`);

        const priorMessages = await prisma.chatMessage.findMany({

          where: { sessionId },

          orderBy: { createdAt: 'desc' },

          take: 20,

        });



        const previousMessages = priorMessages

          .filter((m) => m.role !== 'SYSTEM')

          .reverse();



        const history = previousMessages.map((m: any) => ({

          role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',

          content: m.content,

        }));



        console.log(`💾 Saving user message to database for session ${sessionId}`);

        const userMessage = await prisma.chatMessage.create({

          data: {

            sessionId,

            role: 'USER',

            content,

            finalPrompt: finalPrompt || null,

            templateId: templateId || null,

          },

        });



        if (session.title === 'New Chat') {

          await prisma.chatSession.update({

            where: { id: sessionId },

            data: { title: deriveTitle(content) },

          });

        }



        console.log(`🤖 Calling Gemini API with ${history.length} history entries`);



        let stream;

        try {

          stream = await AIService.getChatStream(promptToAI, history, resolvedApiKey);

        } catch (aiError: any) {

          console.error('❌ Gemini API Error:', aiError);

          await prisma.chatMessage.delete({ where: { id: userMessage.id } }).catch(() => {});

          const details = aiError?.message || String(aiError);

          const isQuota =
            details.toLowerCase().includes('rate limit') ||
            details.toLowerCase().includes('quota') ||
            details.toLowerCase().includes('limit: 0');

          socket.emit('chat_error', {

            message: isQuota ? details : 'Failed to call AI service',

            details,

            fatal: false,

          });

          return;

        }



        let completeAIResponse = '';

        let chunkCount = 0;



        console.log(`⚡ Starting to stream AI response to session ${sessionId}`);

        for await (const chunk of stream) {

          let text = '';

          try {

            text = typeof chunk.text === 'function' ? chunk.text() : '';

          } catch (err) {

            text = (chunk as any).candidates?.[0]?.content?.parts?.[0]?.text || '';

          }

          if (!text) continue;



          completeAIResponse += text;

          chunkCount++;

          io.to(sessionId).emit('ai_chunk', { text });

        }



        console.log(`✅ Stream completed. Total chunks: ${chunkCount}, Total length: ${completeAIResponse.length}`);



        console.log(`💾 Saving AI response to database`);

        await prisma.chatMessage.create({

          data: {

            sessionId,

            role: 'ASSISTANT',

            content: completeAIResponse,

            modelUsed: process.env.GEMINI_MODEL || 'gemini-2.5-flash',

          },

        });



        await prisma.chatSession.update({

          where: { id: sessionId },

          data: { updatedAt: new Date() },

        });



        io.to(sessionId).emit('ai_stream_end', { completeResponse: completeAIResponse });

        console.log(`🎉 Response sent to session ${sessionId}`);



      } catch (error: any) {

        console.error('❌ [send_message] Socket Error:', error);

        socket.emit('chat_error', { 

          message: 'Failed to process AI request',

          details: error.message,

          fatal: false,

        });

      }

    });



    socket.on('disconnect', () => {

      console.log('❌ User disconnected from WebSocket');

    });



    socket.on('error', (error: any) => {

      console.error('❌ Socket Error:', error);

    });

  });



  io.on('error', (error: any) => {

    console.error('❌ IO Server Error:', error);

  });



  return io;

};


