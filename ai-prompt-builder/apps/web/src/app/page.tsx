'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useChatStore } from './stores/chatStore';
import CascadingPromptSidebar from './components/CascadingPromptSidebar';
import ChatHistorySidebar from './components/ChatHistorySidebar';
import {
  fetchChatSessions,
  createChatSession,
  deleteChatSession,
  deleteAllChatSessions,
  fetchSessionMessages,
  deriveSessionTitle,
  type ChatSessionSummary,
} from './lib/chatSessionsApi';
import { Send, Bot, User, Loader2 } from 'lucide-react';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const isSessionReady = useChatStore((state) => state.isSessionReady);
  const errorMessage = useChatStore((state) => state.errorMessage);

  const connectSocket = useChatStore((state) => state.connectSocket);
  const disconnectSocket = useChatStore((state) => state.disconnectSocket);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const clearChatView = useChatStore((state) => state.clearChatView);
  const waitForSessionReady = useChatStore((state) => state.waitForSessionReady);

  const [input, setInput] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const token = (session as any)?.accessToken;

  const connectedTokenRef = useRef<string | null>(null);
  const connectedSessionIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionsLoadingRef = useRef(false);

  const loadChatSessions = useCallback(async () => {
    if (!token || sessionsLoadingRef.current) return;
    sessionsLoadingRef.current = true;
    setHistoryLoading(true);
    try {
      const sessions = await fetchChatSessions(token);
      setChatSessions(sessions);
    } catch (err) {
      console.error('Failed to load chat sessions', err);
    } finally {
      setHistoryLoading(false);
      sessionsLoadingRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (token) {
      loadChatSessions();
    }
  }, [token, status, router, loadChatSessions]);

  useEffect(() => {
    if (status === 'unauthenticated' || !token || !activeSessionId) return;

    if (
      connectedTokenRef.current !== token ||
      connectedSessionIdRef.current !== activeSessionId
    ) {
      connectedTokenRef.current = token;
      connectedSessionIdRef.current = activeSessionId;
      connectSocket(token, activeSessionId);
    }
  }, [token, status, connectSocket, activeSessionId]);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isStreaming && activeSessionId) {
      loadChatSessions();
    }
  }, [isStreaming, activeSessionId, loadChatSessions]);

  const handleSelectTemplate = useCallback((promptText: string) => {
    setInput(promptText);
  }, []);

  const handleNewChat = () => {
    connectedSessionIdRef.current = null;
    disconnectSocket();
    setActiveSessionId(null);
    clearChatView();
    setInput('');
    setResetTrigger((prev) => prev + 1);
  };

  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === activeSessionId || !token) return;

    connectedSessionIdRef.current = null;
    disconnectSocket();
    clearChatView();
    setActiveSessionId(sessionId);

    try {
      const msgs = await fetchSessionMessages(token, sessionId);
      useChatStore.getState().setMessages(
        msgs.map((m) => ({ id: m.id, role: m.role, content: m.content }))
      );
    } catch (err) {
      console.error('Failed to load session messages', err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!token) return;

    try {
      await deleteChatSession(token, sessionId);
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
      await loadChatSessions();
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  const handleClearAllHistory = async () => {
    if (!token) return;

    try {
      await deleteAllChatSessions(token);
      handleNewChat();
      await loadChatSessions();
    } catch (err) {
      console.error('Failed to clear all sessions', err);
    }
  };

  const handleClearChat = () => {
    clearChatView();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || isSending || !token) return;

    const content = input.trim();
    setIsSending(true);

    try {
      let sessionId = activeSessionId;

      if (!sessionId) {
        const created = await createChatSession(token, deriveSessionTitle(content));
        sessionId = created.id;
        connectedSessionIdRef.current = null;
        setActiveSessionId(sessionId);
        setChatSessions((prev) => [created, ...prev]);
        useChatStore.setState({ errorMessage: null, isSessionReady: false });
        await waitForSessionReady();
      } else if (!isSessionReady) {
        useChatStore.setState({ errorMessage: null });
        await waitForSessionReady();
      }

      sendMessage(sessionId, content);
      setInput('');
    } catch (err) {
      console.error('Failed to send message', err);
      useChatStore.setState({
        errorMessage: err instanceof Error ? err.message : 'Failed to send message',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const canSend = Boolean(
    input.trim() &&
    !isStreaming &&
    !isSending &&
    token &&
    (activeSessionId ? isSessionReady : true)
  );

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-cyan-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-x-auto overflow-y-hidden bg-slate-950">
      <CascadingPromptSidebar resetTrigger={resetTrigger} onSelectTemplate={handleSelectTemplate} />

      <div className="flex-1 h-full flex flex-col overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 min-w-0">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center gap-2">
          <Bot className="text-cyan-400 flex-shrink-0" />
          <span className="font-semibold text-sm text-slate-200 truncate">AI Real-time Workspace</span>
          {isStreaming && (
            <span className="text-xs text-cyan-400 animate-pulse flex-shrink-0">(streaming response...)</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <Bot className="w-12 h-12 stroke-1" />
              <p className="text-sm text-center px-4">
                Start a new chat or pick a session from history. Select a template or type a message below.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex gap-3 max-w-2xl p-4 rounded-2xl ${
                      msg.role === 'USER'
                        ? 'bg-cyan-950/40 border border-cyan-800/50 flex-row-reverse'
                        : 'bg-slate-900/80 border border-slate-800/80'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'USER' ? 'bg-cyan-600/80' : 'bg-indigo-600/80'
                      }`}
                    >
                      {msg.role === 'USER' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} aria-hidden="true" />
            </>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          {errorMessage && (
            <div className="max-w-2xl mx-auto bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          {activeSessionId && !isSessionReady && !errorMessage && (
            <div className="max-w-2xl mx-auto bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-sm text-blue-200">
              Connecting to chat session...
            </div>
          )}

          <div className="max-w-3xl mx-auto flex items-end bg-slate-800/80 rounded-2xl p-4 border border-slate-700 focus-within:border-cyan-500 transition relative shadow-lg shadow-slate-950/20">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeSessionId && !isSessionReady
                  ? 'Waiting for session...'
                  : 'Select a template or type/edit your prompt here...'
              }
              rows={Math.min(8, Math.max(4, input.split('\n').length))}
              className="flex-1 bg-transparent border-none outline-none text-lg px-2 pr-14 py-2 text-slate-200 placeholder-slate-500 resize-none min-h-[100px]"
              disabled={isStreaming || isSending || Boolean(activeSessionId && !isSessionReady)}
            />
            <button
              type="submit"
              disabled={!canSend}
              className="absolute right-4 bottom-4 p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-40 flex-shrink-0 cursor-pointer"
              title={!canSend ? 'Cannot send right now' : 'Send message'}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>

      <ChatHistorySidebar
        sessions={chatSessions}
        activeSessionId={activeSessionId}
        loading={historyLoading}
        canClearChat={messages.length > 0}
        onNewChat={handleNewChat}
        onClearChat={handleClearChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAllHistory}
      />
    </div>
  );
}
