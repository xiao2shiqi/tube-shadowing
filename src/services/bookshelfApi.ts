import type { BookshelfItem } from '../types/bookshelf';
import { getStoredToken } from './authService';

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchServerBookshelf(): Promise<BookshelfItem[]> {
  const res = await fetch('/api/bookshelf', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch server bookshelf');
  return res.json();
}

export async function upsertServerItem(item: BookshelfItem): Promise<void> {
  const res = await fetch(`/api/bookshelf/${encodeURIComponent(item.videoId)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Failed to sync bookshelf item');
}

export async function deleteServerItem(videoId: string): Promise<void> {
  const res = await fetch(`/api/bookshelf/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete bookshelf item');
}
