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

export interface AIReport {
  id?: string;
  title: string;
  summary?: string;
  type: 'daily' | 'weekly' | 'flash' | 'strategic';
  content: string;
  generated_at: Timestamp;
  source_article_ids: string[];
  cluster_ids?: string[];
  impact_score?: number;
  status?: 'draft' | 'published' | 'archived';
  is_verified: boolean;
  verified_by?: string;
}

export interface EventCluster {
  id?: string;
  title: string;
  description: string;
  article_ids: string[];
  start_time: Timestamp;
  end_time: Timestamp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  primary_location?: string;
  related_locations?: string[];
  tags: string[];
  ai_summary?: string;
  verified: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Source {
  id?: string;
  name: string;
  type: 'rss' | 'news_api' | 'youtube' | 'manual';
  url?: string;
  api_key?: string;
  is_active: boolean;
  last_fetch: Timestamp;
  fetch_interval_minutes: number;
  created_at: Timestamp;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: 'viewer' | 'analyst' | 'admin';
  createdAt: Timestamp;
  lastLogin: Timestamp;
}
