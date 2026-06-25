import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
}

interface ChatState {
  socket: Socket | null;
  messages: Message[];
  isStreaming: boolean;
  isSessionReady: boolean;
  errorMessage: string | null;
  lastSentAt: number | null;
  connectSocket: (token: string, sessionId: string) => void;
  sendMessage: (sessionId: string, content: string, templateId?: string, finalPrompt?: string) => void;
  disconnectSocket: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  messages: [],
  isStreaming: false,
  isSessionReady: false,
  errorMessage: null,
  lastSentAt: null,

  // Socket එක හරහා Backend එකට සම්බන්ධ වීම
  connectSocket: (token: string, sessionId: string) => {
    const existingSocket = get().socket;
    
    if (existingSocket) {
      // ✅ FIX: සොකට් එක දැනටමත් active (සම්බන්ධ වෙමින් හෝ සම්බන්ධ වී) නම්, සෙෂන් එකත් සමාන නම් රී-කනෙක්ට් වීම වළක්වයි
      if (existingSocket.active && (existingSocket as any)._token === token && (existingSocket as any)._sessionId === sessionId) {
        console.log('🔌 Socket already active (connecting/connected), skipping refresh');
        return;
      }
      
      // වෙනත් ටෝකන් එකක් හෝ සෙෂන් එකක් ආවොත් පමණක් පරණ එක අයින් කරයි
      console.log('🔄 Cleaning up old socket connection before creating new one');
      existingSocket.off();
      existingSocket.disconnect();
    }

    const socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 3,
      timeout: 10000,
    });

    // සොකට් එකට අයිඩෙන්ටිටි එකක් දීම
    (socket as any)._token = token;
    (socket as any)._sessionId = sessionId;

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket Server');
      console.log(`📤 Joining session: ${sessionId}`);
      socket.emit('join_session', { sessionId });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connect error:', error);
      const errorMsg = typeof error === 'string' ? error : error?.message || 'Socket connect error';
      set({ isStreaming: false, isSessionReady: false, errorMessage: errorMsg });
    });

    socket.on('session_ready', ({ sessionId: readySessionId, success, messages }) => {
      if (success) {
        console.log('✅ Session is ready for messaging', readySessionId);
        set({ isSessionReady: true, errorMessage: null, messages: messages || [] });
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Socket Connection Error:', error);
      const errorMsg = typeof error === 'string' ? error : error?.message || 'Connection error';
      set({ isStreaming: false, errorMessage: errorMsg });
    });

    socket.on('chat_error', (error) => {
      console.error('❌ Socket Chat Error:', error);
      const errorMsg = typeof error === 'string' ? error : error?.message || 'Chat error occurred';
      set({ isStreaming: false, errorMessage: errorMsg });
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected', reason);
      set({ isStreaming: false, isSessionReady: false });
    });

    // AI එකෙන් කෑලි කෑලි (Chunks) එද්දී මැසේජ් එකට එකතු කිරීම
    socket.on('ai_chunk', ({ text }) => {
      console.log(`📨 Received chunk (${text.length} chars)`);
      set((state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        
        // අන්තිම මැසේජ් එක ASSISTANT ගේ නම්, ඒකටම අලුත් ටෙක්ස්ට් එක එකතු කරනවා
        if (lastMessage && lastMessage.role === 'ASSISTANT') {
          const updatedMessages = [...state.messages];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            content: lastMessage.content + text,
          };
          return { messages: updatedMessages, isStreaming: true, errorMessage: null };
        }

        // නැත්නම් අලුත්ම ASSISTANT මැසේජ් එකක් ලිස්ට් එකට දානවා
        return {
          messages: [...state.messages, { id: Math.random().toString(), role: 'ASSISTANT', content: text }],
          isStreaming: true,
          errorMessage: null,
        };
      });
    });

    // AI ස්ට්‍රීම් එක ඉවර වුණාම ක්‍රියාත්මක වේ
    socket.on('ai_stream_end', ({ completeResponse }) => {
      console.log(`✅ AI stream ended (${completeResponse.length} chars total)`);
      set({ isStreaming: false });
    });

    set({ socket, isSessionReady: false, errorMessage: null });
  },

  // මැසේජ් එකක් Backend එකට යැවීම
  sendMessage: (sessionId: string, content: string, templateId?: string, finalPrompt?: string) => {
    const { socket, isSessionReady, lastSentAt, isStreaming } = get();
    const now = Date.now();

    if (!socket) {
      set({ errorMessage: 'Socket not connected' });
      return;
    }

    if (!isSessionReady) {
      set({ errorMessage: 'Session not ready. Please wait a moment...' });
      return;
    }

    if (isStreaming) {
      set({ errorMessage: 'Please wait for the current AI response to finish.' });
      return;
    }

    // ක්ලයන්ට් සයිඩ් රේට් ලිමිට් (තත්පර භාගයකට වඩා වේගයෙන් ක්ලික් කරොත් බ්ලොක් කරයි)
    if (lastSentAt && now - lastSentAt < 500) {
      set({ errorMessage: 'Please wait a moment before sending another message.' });
      return;
    }

    console.log(`📤 Sending message (${content.length} chars)`);

    const userMessage: Message = { id: Math.random().toString(), role: 'USER', content };
    
    set((state) => ({ 
      messages: [...state.messages, userMessage], 
      isStreaming: true, 
      lastSentAt: now, 
      errorMessage: null 
    }));

    socket.emit('send_message', { sessionId, content, templateId, finalPrompt });
  },

  // සම්පූර්ණයෙන්ම සොකට් එක වසා දැමීම
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      console.log('🔌 Disconnecting socket cleanly...');
      socket.off();
      socket.disconnect();
      set({ 
        socket: null, 
        messages: [], 
        isStreaming: false, 
        isSessionReady: false, 
        errorMessage: null, 
        lastSentAt: null 
      });
    }
  },
}));