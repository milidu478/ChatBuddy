import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../lib/apiConfig';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
}

function parseSocketError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const payload = error as { message?: string; details?: string };
    if (payload.message && payload.details) {
      return `${payload.message}: ${payload.details}`;
    }
    if (payload.message) return payload.message;
    if (payload.details) return payload.details;
  }
  return 'Chat error occurred';
}

function nextMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
  setMessages: (messages: Message[]) => void;
  clearChatView: () => void;
  waitForSessionReady: (timeoutMs?: number) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  messages: [],
  isStreaming: false,
  isSessionReady: false,
  errorMessage: null,
  lastSentAt: null,

  connectSocket: (token: string, sessionId: string) => {
    const existingSocket = get().socket;
    
    if (existingSocket) {
      if (existingSocket.active && (existingSocket as any)._token === token && (existingSocket as any)._sessionId === sessionId) {
        console.log('🔌 Socket already active (connecting/connected), skipping refresh');
        return;
      }
      
      console.log('🔄 Cleaning up old socket connection before creating new one');
      existingSocket.removeAllListeners();
      existingSocket.disconnect();
    }

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 3,
      timeout: 10000,
    });

    (socket as any)._token = token;
    (socket as any)._sessionId = sessionId;

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket Server');
      console.log(`📤 Joining session: ${sessionId}`);
      socket.emit('join_session', { sessionId });
    });

    socket.on('connect_error', (error) => {
      const errorMsg = parseSocketError(error);
      console.warn('Socket connect error:', errorMsg);
      set({ isStreaming: false, isSessionReady: false, errorMessage: errorMsg });
    });

    socket.on('session_ready', ({ sessionId: readySessionId, success, messages }) => {
      if (success) {
        console.log('✅ Session is ready for messaging', readySessionId);
        set({ isSessionReady: true, errorMessage: null, messages: messages || [] });
      }
    });

    socket.on('error', (error) => {
      const errorMsg = parseSocketError(error);
      console.warn('Socket connection error:', errorMsg);
      set({ isStreaming: false, isSessionReady: false, errorMessage: errorMsg });
    });

    socket.on('chat_error', (error) => {
      const payload = error as { message?: string; details?: string; fatal?: boolean };
      const errorMsg = parseSocketError(error);
      console.warn('Socket chat error:', errorMsg);

      if (payload.fatal) {
        set({ isStreaming: false, isSessionReady: false, errorMessage: errorMsg });
        return;
      }

      set((state) => {
        const messages = [...state.messages];
        const last = messages[messages.length - 1];
        if (last?.role === 'USER') {
          messages.pop();
        }
        return { messages, isStreaming: false, errorMessage: errorMsg };
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected', reason);
      set({ isStreaming: false, isSessionReady: false });
    });

    socket.on('ai_chunk', ({ text }) => {
      set((state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        
        if (lastMessage && lastMessage.role === 'ASSISTANT') {
          const updatedMessages = [...state.messages];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            content: lastMessage.content + text,
          };
          return { messages: updatedMessages, isStreaming: true, errorMessage: null };
        }

        return {
          messages: [...state.messages, { id: nextMessageId(), role: 'ASSISTANT', content: text }],
          isStreaming: true,
          errorMessage: null,
        };
      });
    });

    socket.on('ai_stream_end', ({ completeResponse }) => {
      console.log(`✅ AI stream ended (${completeResponse.length} chars total)`);
      set({ isStreaming: false });
    });

    set({ socket, isSessionReady: false, errorMessage: null });
  },

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

    if (lastSentAt && now - lastSentAt < 500) {
      set({ errorMessage: 'Please wait a moment before sending another message.' });
      return;
    }

    console.log(`📤 Sending message (${content.length} chars)`);

    const userMessage: Message = { id: nextMessageId(), role: 'USER', content };
    
    set((state) => ({ 
      messages: [...state.messages, userMessage], 
      isStreaming: true, 
      lastSentAt: now, 
      errorMessage: null 
    }));

    socket.emit('send_message', { sessionId, content, templateId, finalPrompt });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      console.log('🔌 Disconnecting socket cleanly...');
      socket.removeAllListeners();
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

  setMessages: (messages) => {
    set({ messages });
  },

  clearChatView: () => {
    set({ messages: [], errorMessage: null, isStreaming: false });
  },

  waitForSessionReady: (timeoutMs = 15000) => {
    if (get().isSessionReady) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Timed out connecting to chat session. Is the API server running?'));
      }, timeoutMs);

      const unsubscribe = useChatStore.subscribe((state) => {
        if (state.isSessionReady) {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
          return;
        }

        if (state.errorMessage) {
          clearTimeout(timeout);
          unsubscribe();
          reject(new Error(state.errorMessage));
        }
      });

      if (get().isSessionReady) {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      }
    });
  },
}));
