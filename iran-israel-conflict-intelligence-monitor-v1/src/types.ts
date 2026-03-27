import { Timestamp } from 'firebase/firestore';

export interface Article {
  id?: string;
  title: string;
  content: string;
  summary?: string;
  url: string;
  source_name: string;
  source_id?: string;
  source_type: 'rss' | 'news_api' | 'youtube' | 'manual';
  published_at: Timestamp;
  ingested_at: Timestamp;
  first_seen_at: Timestamp;
  last_updated_at: Timestamp;
  fingerprint: string;
  category_id?: string;
  tag_ids: string[];
  image_url?: string;
  image_source?: string;
  image_caption?: string;
  author?: string;
  is_breaking: boolean;
  cluster_id?: string;
  content_origin?: 'live_rss' | 'news_api' | 'youtube' | 'internal' | 'demo';
  is_verified?: boolean;
}

export interface EventCluster {
  id?: string;
  title: string;
  description: string;
  start_date: Timestamp;
  end_date?: Timestamp;
  status: 'active' | 'resolved' | 'archived';
  article_ids: string[];
  category_id: string;
  impact_level: 1 | 2 | 3 | 4 | 5; // 1: Low, 5: Critical
}

export interface Category {
  id?: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
}

export interface Tag {
  id?: string;
  name: string;
}

export interface AIReport {
  id?: string;
  title: string;
  summary?: string;
  type: 'daily' | 'weekly' | 'flash' | 'strategic';
  content: string; // Markdown
  generated_at: Timestamp;
  source_article_ids: string[];
  cluster_ids?: string[];
  impact_score?: number;
  status?: 'draft' | 'published' | 'archived';
  is_verified: boolean;
  verified_by?: string;
}

export interface Source {
  id?: string;
  name: string;
  url: string;
  type: 'rss' | 'news_api' | 'youtube' | 'manual';
  is_active: boolean;
  last_refresh?: Timestamp;
  refresh_frequency_minutes: number;
  category_id?: string;
  is_verified?: boolean;
}

export interface RefreshLog {
  id?: string;
  source_id: string;
  status: 'success' | 'error';
  message: string;
  timestamp: Timestamp;
  articles_ingested: number;
}
