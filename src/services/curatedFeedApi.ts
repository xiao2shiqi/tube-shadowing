import type { CuratedFeedResponse, FeedCategory } from '../types/feed';

export async function fetchCuratedFeed(
  category: FeedCategory = 'learning'
): Promise<CuratedFeedResponse> {
  const res = await fetch(`/api/curated-feed?category=${encodeURIComponent(category)}&v=6`);
  if (!res.ok) {
    throw new Error('Failed to fetch curated feeds');
  }
  return res.json();
}
