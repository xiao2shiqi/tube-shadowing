import type { AIProvider, ProviderKeyConfig } from '../types/ai';
import { getStoredToken } from './authService';

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchServerApiKeys(): Promise<Record<AIProvider, ProviderKeyConfig>> {
  const res = await fetch('/api/user/api-keys', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load API keys');
  const data = (await res.json()) as {
    keys: { provider: AIProvider; apiKey: string; baseUrl: string | null; model: string | null }[];
  };
  const result = {} as Record<AIProvider, ProviderKeyConfig>;
  for (const k of data.keys) {
    result[k.provider] = { apiKey: k.apiKey, baseUrl: k.baseUrl || '', model: k.model || '' };
  }
  return result;
}

export async function saveServerApiKey(provider: AIProvider, config: ProviderKeyConfig): Promise<void> {
  const res = await fetch(`/api/user/api-keys/${provider}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ apiKey: config.apiKey, baseUrl: config.baseUrl, model: config.model }),
  });
  if (!res.ok) throw new Error('Failed to save API key');
}

export async function deleteServerApiKey(provider: AIProvider): Promise<void> {
  const res = await fetch(`/api/user/api-keys/${provider}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete API key');
}
