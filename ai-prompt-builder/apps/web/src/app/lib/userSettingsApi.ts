import { API_V1 } from './apiConfig';

export interface ApiKeySettings {
  hasUserKey: boolean;
  hasServerKey: boolean;
  isConfigured: boolean;
  keyHint: string | null;
  model: string;
}

async function usersRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_V1}/users${path}`, {
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

  return (data.data ?? data) as T;
}

export async function fetchApiKeySettings(token: string): Promise<ApiKeySettings> {
  return usersRequest<ApiKeySettings>('/me/api-key', token);
}

export async function saveGeminiApiKey(token: string, apiKey: string): Promise<{ keyHint: string }> {
  return usersRequest<{ keyHint: string }>('/me/gemini-api-key', token, {
    method: 'PUT',
    body: JSON.stringify({ apiKey }),
  });
}

export async function deleteGeminiApiKey(token: string): Promise<void> {
  await usersRequest<null>('/me/gemini-api-key', token, { method: 'DELETE' });
}

export async function validateGeminiApiKey(token: string, apiKey: string): Promise<void> {
  await usersRequest<null>('/me/gemini-api-key/validate', token, {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  });
}
