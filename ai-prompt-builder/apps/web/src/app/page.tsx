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
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

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
      <div className="h-screen flex items-center justify-center bg-[#090d16] text-cyan-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-x-auto overflow-y-hidden bg-[#090d16]">
      {/* Left sidebar — deep panel */}
      <div className="flex-shrink-0 h-full border-r border-slate-800/40">
        <CascadingPromptSidebar resetTrigger={resetTrigger} onSelectTemplate={handleSelectTemplate} />
      </div>

      {/* Center workspace — elevated surface */}
      <div className="flex-1 h-full flex flex-col overflow-hidden min-w-0 bg-gradient-to-b from-[#121829] via-[#0f1524] to-[#0d1220] relative">
        {/* Subtle ambient glow */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.06),transparent)]"
          aria-hidden="true"
        />

        {/* Header */}
        <header className="relative z-10 px-6 py-4 border-b border-slate-800/40 flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm text-slate-100 tracking-tight truncate">
              AI Real-time Workspace
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {activeSessionId ? 'Active session' : 'New conversation'}
            </span>
          </div>
          {isStreaming && (
            <span className="ml-auto text-xs font-medium text-cyan-400/90 animate-pulse flex-shrink-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Streaming…
            </span>
          )}
        </header>

        {/* Messages — extra bottom padding clears the floating input */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-32 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-5 select-none">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full bg-cyan-500/5 blur-2xl scale-150"
                  aria-hidden="true"
                />
                <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900/40 border border-slate-800/50">
                  <Bot className="w-10 h-10 text-slate-500/70 stroke-[1.25]" />
                </div>
              </div>
              <div className="text-center max-w-md space-y-2">
                <p className="text-base font-medium text-slate-400/90 tracking-tight">
                  Your workspace is ready
                </p>
                <p className="text-sm text-slate-500/70 leading-relaxed px-4">
                  Start a new chat or pick a session from history. Select a template from the
                  sidebar or type a message below.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl md:max-w-3xl mx-auto w-full space-y-5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex gap-3 max-w-[85%] p-4 rounded-2xl ${
                      msg.role === 'USER'
                        ? 'bg-cyan-950/30 border border-cyan-800/30 flex-row-reverse shadow-lg shadow-cyan-950/10'
                        : 'bg-slate-900/50 border border-slate-800/50 shadow-lg shadow-black/10'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ${
                        msg.role === 'USER'
                          ? 'bg-cyan-600/70 ring-cyan-500/30'
                          : 'bg-indigo-600/70 ring-indigo-500/30'
                      }`}
                    >
                      {msg.role === 'USER' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300/95">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Floating command-center input — pinned & centered in center pane */}
        <div className="absolute bottom-0 left-0 right-0 z-20 w-full flex justify-center p-4 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent pointer-events-none">
          <form
            onSubmit={handleSend}
            className="w-full max-w-2xl md:max-w-3xl pointer-events-auto space-y-3"
          >
            {errorMessage && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-200/90 backdrop-blur-sm">
                {errorMessage}
              </div>
            )}

            {activeSessionId && !isSessionReady && !errorMessage && (
              <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-400 flex items-center gap-2 backdrop-blur-sm">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400 flex-shrink-0" />
                Connecting to chat session…
              </div>
            )}

            <div className="w-full max-w-2xl md:max-w-3xl mx-auto rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-slate-800 p-4 shadow-2xl flex flex-col relative transition-all duration-200 focus-within:border-cyan-500/40">
              <div className="flex items-end gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    activeSessionId && !isSessionReady
                      ? 'Waiting for session…'
                      : 'Select a template or type your prompt here…'
                  }
                  rows={Math.min(8, Math.max(3, input.split('\n').length))}
                  className="flex-1 bg-transparent border-none outline-none text-[15px] leading-relaxed px-1 py-1.5 text-slate-200 placeholder-slate-500/80 resize-none min-h-[72px] max-h-[200px]"
                  disabled={isStreaming || isSending || Boolean(activeSessionId && !isSessionReady)}
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  className="flex-shrink-0 flex items-center justify-center w-11 h-11 bg-cyan-500 hover:bg-cyan-400 p-2.5 rounded-full shadow-md text-slate-950 transition-all duration-200 disabled:opacity-30 disabled:hover:bg-cyan-500 hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:hover:scale-100 mb-0.5"
                  title={!canSend ? 'Cannot send right now' : 'Send message'}
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" strokeWidth={2.25} />
                  )}
                </button>
              </div>
              <p className="mt-2 px-1 text-[11px] text-slate-600 font-medium">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Right sidebar — deep panel */}
      <div className="flex-shrink-0 h-full border-l border-slate-800/40">
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
    </div>
  );
}
