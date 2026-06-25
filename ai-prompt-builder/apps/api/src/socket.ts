import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config/index.js';
import { prisma } from './config/database.js';
import { AIService } from './services/ai.service.js';

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

  // Middleware: Socket එක connect වෙන්න කලින් token එක check කිරීම
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

  // Connections හැසිරවීම
  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    (socket as any).lastMessageTime = 0;
    console.log(`🔌 User connected via WebSocket: ${userId}`);

    // Chat Session එකට එකතු වීම (Room එකකට join වීම) සහ DB එකේ Session සෑදීම
    socket.on('join_session', async ({ sessionId }) => {
      try {
        socket.join(sessionId);
        
        // ChatSession එක DB එකේ exists දැයි පරීක්ෂා කිරීම
        let session = await prisma.chatSession.findUnique({
          where: { id: sessionId },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });

        // Session නැත්නම් නිර්මාණ කරන්න
        if (!session) {
          console.log(`📝 Creating new ChatSession: ${sessionId}`);
          session = await prisma.chatSession.create({
            data: {
              id: sessionId,
              userId,
              title: 'New Chat Session',
            },
            include: {
              messages: {
                orderBy: { createdAt: 'asc' },
              },
            },
          });
        }

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
          details: error.message 
        });
      }
    });

    // මැසේජ් එකක් ලැබුණු විට ක්‍රියාත්මක වන කොටස
    socket.on('send_message', async ({ sessionId, content, templateId, finalPrompt }) => {
      try {
        console.log(`📨 [${sessionId}] Received message from ${userId}:`, content.substring(0, 50));

        // per-connection rate limiting check (max 1 message per second)
        const now = Date.now();
        const lastTime = (socket as any).lastMessageTime || 0;
        if (now - lastTime < 1000) {
          console.warn(`⚠️ [send_message] Rate limit hit for user ${userId}. Request ignored.`);
          socket.emit('chat_error', { message: 'Too many requests. Please wait a moment.' });
          return;
        }
        (socket as any).lastMessageTime = now;

        if (!sessionId || !content) {
          socket.emit('chat_error', { message: 'Session ID and content are required' });
          return;
        }

        // Validate Gemini API Key
        if (!process.env.GEMINI_API_KEY) {
          console.error('❌ GEMINI_API_KEY is not configured');
          socket.emit('chat_error', { message: 'AI service is not configured. Please set GEMINI_API_KEY.' });
          return;
        }

        const promptToAI = finalPrompt || content;

        // 1. කලින් සිදුවූ කතාබහ (History) DB එකෙන් ලබාගැනීම (පෙර පණිවිඩ පමණක්)
        console.log(`📚 Fetching prior message history for session ${sessionId}`);
        const priorMessages = await prisma.message.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
          take: 20,
        });

        const previousMessages = priorMessages.filter((m) => m.role !== 'SYSTEM');

        const history = previousMessages.map((m: any) => ({
          role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
          content: m.content,
        }));

        // 2. User ගේ අලුත් message එක DB එකේ සේව් කිරීම
        console.log(`💾 Saving user message to database for session ${sessionId}`);
        await prisma.message.create({
          data: {
            sessionId,
            role: 'USER',
            content,
            finalPrompt: finalPrompt || null,
            templateId: templateId || null,
          },
        });

        console.log(`🤖 Calling Gemini API with ${history.length} history entries`);

        // 3. Gemini Stream එක ලබාගැනීම
        let stream;
        try {
          stream = await AIService.getChatStream(promptToAI, history);
        } catch (aiError: any) {
          console.error('❌ Gemini API Error:', aiError);
          socket.emit('chat_error', {
            message: 'Failed to call AI service',
            details: aiError?.message || String(aiError),
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

        // 5. AI එක උත්තරය දීලා ඉවර වුණාම සම්පූර්ණ උත්තරය DB එකේ සේව් කිරීම
        console.log(`💾 Saving AI response to database`);
        await prisma.message.create({
          data: {
            sessionId,
            role: 'ASSISTANT',
            content: completeAIResponse,
            modelUsed: 'gemini-2.5-flash',
          },
        });

        // Stream එක ඉවර බව දැනුම් දීම
        io.to(sessionId).emit('ai_stream_end', { completeResponse: completeAIResponse });
        console.log(`🎉 Response sent to session ${sessionId}`);

      } catch (error: any) {
        console.error('❌ [send_message] Socket Error:', error);
        console.error('Error stack:', error.stack);
        socket.emit('chat_error', { 
          message: 'Failed to process AI request',
          details: error.message 
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