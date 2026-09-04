import type { TranslationRecord } from '../types/translation';
import { getStoredToken } from './authService';

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchTranslationRecords(): Promise<TranslationRecord[]> {
  const res = await fetch('/api/translations', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load translation records');
  return res.json();
}

export async function recordTranslation(item: TranslationRecord): Promise<void> {
  const res = await fetch('/api/translations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Failed to record translation');
}

export async function deleteTranslationRecord(videoId: string): Promise<void> {
  const res = await fetch(`/api/translations/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete translation record');
}
