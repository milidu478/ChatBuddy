'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useChatStore } from './stores/chatStore';
import CascadingPromptSidebar from './components/CascadingPromptSidebar';
import { Send, Bot, User, Loader2, Plus } from 'lucide-react';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // States selectors
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const isSessionReady = useChatStore((state) => state.isSessionReady);
  const errorMessage = useChatStore((state) => state.errorMessage);
  
  // Actions selectors
  const connectSocket = useChatStore((state) => state.connectSocket);
  const disconnectSocket = useChatStore((state) => state.disconnectSocket);
  
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(() => 'chat-session-' + Math.random().toString(36).substring(2, 11));
  const [resetTrigger, setResetTrigger] = useState(0);
  const token = (session as any)?.accessToken;

  // Connection Guard
  const connectedTokenRef = useRef<string | null>(null);
  const connectedSessionIdRef = useRef<string | null>(null);

  // සොකට් එක සම්බන්ධ කිරීම
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (token && (connectedTokenRef.current !== token || connectedSessionIdRef.current !== sessionId)) {
      connectedTokenRef.current = token;
      connectedSessionIdRef.current = sessionId;
      connectSocket(token, sessionId);
    }
  }, [token, status, connectSocket, router, sessionId]);

  // ඩිස්කනෙක්ට් වීම
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  // 🔄 🛠️ FIX: ටෙම්ප්ලේට් එකක් ක්ලික් කරපු ගමන් සෙන්ඩ් නොකර, ඉන්පුට් බොක්ස් එකට ලෝඩ් කිරීම
  const handleSelectTemplate = useCallback((promptText: string) => {
    console.log("📝 [ChatPage] Template loaded into input box for editing.");
    
    // මෙතනදී කෙලින්ම sendMessage කරන්නේ නැතුව, යූසර්ට එඩිට් කරන්න input එකට දානවා
    setInput(promptText); 
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !isSessionReady) return;

    console.log("📤 [ChatPage] Sending edited prompt to AI.");
    useChatStore.getState().sendMessage(sessionId, input);
    setInput(''); // සෙන්ඩ් කරාට පස්සේ ඉන්පුට් එක හිස් කරනවා
  };

  const handleNewChat = () => {
    console.log("➕ [ChatPage] Starting a new chat session.");
    
    // 1. Clear the active messages state array
    useChatStore.setState({ messages: [], errorMessage: null, isStreaming: false });
    
    // 2. Reset all 5 cascading dropdowns back to default by triggering the reset
    setResetTrigger((prev) => prev + 1);
    
    // 3. Clear any existing text inside the textarea
    setInput('');
    
    // 4. Reset any chat session IDs, starting a completely blank session
    const newSessionId = 'chat-session-' + Math.random().toString(36).substring(2, 11);
    setSessionId(newSessionId);
  };

  // එන්ටර් එක එබුවම සෙන්ඩ් වෙන්න (හැබැයි Shift + Enter එබුවොත් නිව් ලයින් එකක් වැටෙන්න)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-cyan-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      
      {/* LHS Sidebar (Prompt Selector & Branding & SignOut) */}
      <CascadingPromptSidebar resetTrigger={resetTrigger} onSelectTemplate={handleSelectTemplate} />

      {/* Right Area (Main Chat) */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center gap-2">
          <Bot className="text-cyan-400" />
          <span className="font-semibold text-sm text-slate-200">AI Real-time Workspace</span>
          {isStreaming && <span className="text-xs text-cyan-400 animate-pulse">(streaming response...)</span>}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <Bot className="w-12 h-12 stroke-1" />
              <p className="text-sm">Select a template from the left or type a message below!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 p-4 rounded-xl max-w-2xl ${
                  msg.role === 'USER' ? 'bg-slate-800/60 ml-auto flex-row-reverse border border-slate-700/30' : 'bg-slate-800/20 mr-auto border border-slate-800/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
                  msg.role === 'USER' ? 'bg-cyan-600' : 'bg-indigo-600'
                }`}>
                  {msg.role === 'USER' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Box Area */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          {errorMessage && (
            <div className="max-w-2xl mx-auto bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-200">
              ⚠️ {errorMessage}
            </div>
          )}

          {!isSessionReady && !errorMessage && (
            <div className="max-w-2xl mx-auto bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-sm text-blue-200">
              🔄 Connecting to chat session...
            </div>
          )}

          {/* 🛠️ <textarea> එකක් දැම්මා ලොකු ටෙම්ප්ලේට් ලේසියෙන් එඩිට් කරන්න පුළුවන් වෙන්න */}
          <div className="max-w-3xl mx-auto flex items-end bg-slate-800/80 rounded-2xl p-4 border border-slate-700 focus-within:border-cyan-500 transition relative shadow-lg shadow-slate-950/20">
            <button
              type="button"
              onClick={handleNewChat}
              className="absolute left-4 bottom-4 p-2.5 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition cursor-pointer"
              title="New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isSessionReady ? "Select a template or type/edit your prompt here..." : "Waiting for session..."}
              rows={Math.min(8, Math.max(4, input.split('\n').length))}
              className="flex-1 bg-transparent border-none outline-none text-lg pl-14 pr-14 py-2 text-slate-200 placeholder-slate-500 resize-none min-h-[100px]"
              disabled={isStreaming || !isSessionReady}
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim() || !isSessionReady}
              className="absolute right-4 bottom-4 p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-40 flex-shrink-0 cursor-pointer"
              title={!isSessionReady ? "Session not ready" : "Send message"}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}