export type FeedCategory = 'learning' | 'tech';

export interface CuratedFeedSource {
  id: string;
  name: string;
  type: 'channel' | 'playlist';
  category: FeedCategory;
  defaultLevel?: 'A2' | 'B1' | 'B2' | 'C1';
}

export type CuratedChannel = CuratedFeedSource;

export interface FeedVideoItem {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  thumbnailUrl: string;
  publishedAt: string;
  relativeTime: string;
  category: FeedCategory;
  levelTag?: 'A2' | 'B1' | 'B2' | 'C1';
  duration?: string;
  sourceType?: 'interview' | 'clips';
}

export interface CuratedFeedResponse {
  category: FeedCategory;
  updatedAt: number;
  items: FeedVideoItem[];
}

