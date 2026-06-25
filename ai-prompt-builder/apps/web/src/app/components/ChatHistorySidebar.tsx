'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, Trash2, Loader2, History } from 'lucide-react';
import type { ChatSessionSummary } from '../lib/chatSessionsApi';

interface ChatHistorySidebarProps {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  loading: boolean;
  canClearChat: boolean;
  onNewChat: () => void;
  onClearChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAll: () => void;
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatHistorySidebar({
  sessions,
  activeSessionId,
  loading,
  canClearChat,
  onNewChat,
  onClearChat,
  onSelectSession,
  onDeleteSession,
  onClearAll,
}: ChatHistorySidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const handleClearAllClick = () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }
    onClearAll();
    setConfirmClearAll(false);
  };

  return (
    <aside className="hidden md:flex w-64 xl:w-72 bg-slate-950 border-l border-slate-800/80 flex-col h-full flex-shrink-0">
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2 mb-4 px-1">
          <History className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">Chat History</h2>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-cyan-600/90 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition-all duration-150 shadow-lg shadow-cyan-950/30"
        >
          <MessageSquarePlus className="w-4 h-4" />
          New Chat
        </button>
        <button
          type="button"
          onClick={onClearChat}
          disabled={!canClearChat}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
          title="Clear messages from view (history is kept)"
        >
          <Trash2 className="w-4 h-4" />
          Clear View
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <span className="text-xs">Loading history...</span>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center px-3 py-8 leading-relaxed">
            No past conversations yet. Start a new chat to begin.
          </p>
        ) : (
          sessions.map((session) => {
            const isActive = activeSessionId === session.id;
            return (
              <div
                key={session.id}
                className="relative group"
                onMouseEnter={() => setHoveredId(session.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full text-left px-3 py-3 pr-10 rounded-xl transition-all duration-150 border ${
                    isActive
                      ? 'bg-cyan-950/40 border-cyan-800/50 text-cyan-100'
                      : 'bg-transparent border-transparent hover:bg-slate-900/80 hover:border-slate-800/80 text-slate-300'
                  }`}
                >
                  <p className="text-sm font-medium truncate">{session.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{formatSessionDate(session.updatedAt)}</p>
                </button>
                {(hoveredId === session.id || isActive) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {sessions.length > 0 && (
        <div className="p-3 border-t border-slate-800/80">
          {confirmClearAll ? (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                Delete all chat history? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearAllClick}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-rose-600/90 hover:bg-rose-500 text-white transition"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleClearAllClick}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All History
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
