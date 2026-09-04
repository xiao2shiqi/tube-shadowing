import type { TranscriptSentence } from '../types/subtitle';
import type { BookshelfItem } from '../types/bookshelf';

const DB_NAME = 'TubeShadowingDB';
const TRANSCRIPT_STORE = 'video_transcripts';
const BOOKSHELF_STORE = 'bookshelf_items';
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TRANSCRIPT_STORE)) {
        db.createObjectStore(TRANSCRIPT_STORE, { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains(BOOKSHELF_STORE)) {
        db.createObjectStore(BOOKSHELF_STORE, { keyPath: 'videoId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedTranscript(
  videoId: string
): Promise<TranscriptSentence[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(TRANSCRIPT_STORE, 'readonly');
      const store = tx.objectStore(TRANSCRIPT_STORE);
      const req = store.get(videoId);
      req.onsuccess = () => {
        const res = req.result as
          | { sentences: TranscriptSentence[] }
          | undefined;
        if (res && res.sentences && res.sentences.length > 0) {
          resolve(res.sentences);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedTranscript(
  videoId: string,
  sentences: TranscriptSentence[]
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(TRANSCRIPT_STORE, 'readwrite');
    const store = tx.objectStore(TRANSCRIPT_STORE);
    store.put({ videoId, sentences, updatedAt: Date.now() });
  } catch (err) {
    console.error('IndexedDB cache save error:', err);
  }
}

export async function getBookshelfItems(): Promise<BookshelfItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(BOOKSHELF_STORE, 'readonly');
      const store = tx.objectStore(BOOKSHELF_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as BookshelfItem[]) || [];
        items.sort((a, b) => b.lastStudiedAt - a.lastStudiedAt);
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveBookshelfItem(item: BookshelfItem): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(BOOKSHELF_STORE, 'readwrite');
    const store = tx.objectStore(BOOKSHELF_STORE);
    store.put(item);
  } catch (err) {
    console.error('IndexedDB bookshelf save error:', err);
  }
}

export async function deleteBookshelfItem(videoId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([BOOKSHELF_STORE, TRANSCRIPT_STORE], 'readwrite');
    tx.objectStore(BOOKSHELF_STORE).delete(videoId);
    tx.objectStore(TRANSCRIPT_STORE).delete(videoId);
  } catch (err) {
    console.error('IndexedDB bookshelf delete error:', err);
  }
}
