import { API_V1 } from './apiConfig';

const API_BASE = `${API_V1}/chat-sessions`;

export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json();
  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || 'Request failed');
  }

  return data.data as T;
}

export function deriveSessionTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'New Chat';
  return trimmed.length <= 50 ? trimmed : `${trimmed.slice(0, 47)}...`;
}

export async function fetchChatSessions(token: string): Promise<ChatSessionSummary[]> {
  return request<ChatSessionSummary[]>('', token);
}

export async function createChatSession(
  token: string,
  title?: string
): Promise<ChatSessionSummary> {
  return request<ChatSessionSummary>('', token, {
    method: 'POST',
    body: JSON.stringify({ title: title ?? 'New Chat' }),
  });
}

export async function fetchSessionMessages(
  token: string,
  sessionId: string
): Promise<ChatMessageRecord[]> {
  return request<ChatMessageRecord[]>(`/${sessionId}/messages`, token);
}

export async function deleteChatSession(token: string, sessionId: string): Promise<void> {
  await request<null>(`/${sessionId}`, token, { method: 'DELETE' });
}

export async function deleteAllChatSessions(token: string): Promise<void> {
  await request<null>('', token, { method: 'DELETE' });
}
