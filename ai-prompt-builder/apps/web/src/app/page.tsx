'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useChatStore } from './stores/chatStore';
import CascadingPromptSidebar from './components/CascadingPromptSidebar';
import { Send, Bot, User, Sparkles, LogOut, Loader2 } from 'lucide-react';

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
  const dummySessionId = 'chat-session-xyz-789';
  const token = (session as any)?.accessToken;

  // Connection Guard
  const connectedTokenRef = useRef<string | null>(null);

  // සොකට් එක සම්බන්ධ කිරීම
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (token && connectedTokenRef.current !== token) {
      connectedTokenRef.current = token;
      connectSocket(token, dummySessionId);
    }
  }, [token, status, connectSocket, router, dummySessionId]);

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
    useChatStore.getState().sendMessage(dummySessionId, input);
    setInput(''); // සෙන්ඩ් කරාට පස්සේ ඉන්පුට් එක හිස් කරනවා
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
    <div className="flex h-screen overflow-hidden bg-slate-900">
      
      {/* Left Sidebar */}
      <div className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-8 px-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-wider text-slate-100">PromptCraft</h1>
          </div>
          <button className="w-full py-2 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-sm font-semibold text-slate-300 transition">
            + New Chat
          </button>
        </div>
        
        <button 
          onClick={() => signOut()} 
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition px-2 py-2 rounded-lg hover:bg-slate-900/50"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out ({session?.user?.name || 'User'})</span>
        </button>
      </div>

      {/* Middle Sidebar */}
      <CascadingPromptSidebar onSelectTemplate={handleSelectTemplate} />

      {/* Right Area (Main Chat) */}
      <div className="flex-1 flex flex-col justify-between bg-slate-900">
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
          <div className="max-w-2xl mx-auto flex items-end gap-2 bg-slate-800/80 rounded-xl p-2 border border-slate-700 focus-within:border-cyan-500 transition">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isSessionReady ? "Select a template or type/edit your prompt here..." : "Waiting for session..."}
              rows={Math.min(6, Math.max(1, input.split('\n').length))} // කෝඩ් එක දික්වෙනකොට ඉන්පුට් බොක්ස් එක ඔටෝ ලොකු වෙනවා
              className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-slate-200 placeholder-slate-500 resize-none py-1"
              disabled={isStreaming || !isSessionReady}
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim() || !isSessionReady}
              className="p-2 mb-0.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-40 flex-shrink-0"
              title={!isSessionReady ? "Session not ready" : "Send message"}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}