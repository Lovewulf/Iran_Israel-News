import { Timestamp } from 'firebase/firestore';
import { addArticle, getArticles, getSources } from './firestoreService';
import { Article, Source } from '../types';
import { ENV } from '../config/env';

/**
 * -----------------------------
 * Helpers
 * -----------------------------
 */

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function normalizeTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function parsePublishedAt(value: unknown): Timestamp {
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return Timestamp.fromDate(d);
    }
  }
  return Timestamp.now();
}

function isLikelyArticleUrl(articleUrl: string, sourceUrl?: string): boolean {
  try {
    const u = new URL(articleUrl);

    if (!/^https?:$/.test(u.protocol)) return false;
    if (!u.pathname || u.pathname === '/' || u.pathname.trim() === '') return false;

    // Reject demo/internal/local URLs
    if (/sentinel-intel\.io|localhost|127\.0\.0\.1/i.test(u.hostname)) {
      return false;
    }

    // Reject cases where article URL is effectively same as source homepage/feed URL
    if (sourceUrl && isHttpUrl(sourceUrl)) {
      const s = new URL(sourceUrl);
      if (u.hostname === s.hostname && u.pathname === s.pathname) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function extractImageUrl(item: any): string | undefined {
  // media:content
  if (item?.['media:content']?.$?.url && isHttpUrl(item['media:content'].$.url)) {
    return item['media:content'].$.url;
  }

  if (
    Array.isArray(item?.['media:content']) &&
    item['media:content'][0]?.$?.url &&
    isHttpUrl(item['media:content'][0].$.url)
  ) {
    return item['media:content'][0].$.url;
  }

  // media:thumbnail
  if (item?.['media:thumbnail']?.$?.url && isHttpUrl(item['media:thumbnail'].$.url)) {
    return item['media:thumbnail'].$.url;
  }

  if (
    Array.isArray(item?.['media:thumbnail']) &&
    item['media:thumbnail'][0]?.$?.url &&
    isHttpUrl(item['media:thumbnail'][0].$.url)
  ) {
    return item['media:thumbnail'][0].$.url;
  }

  // enclosure
  if (item?.enclosure?.url && isHttpUrl(item.enclosure.url)) {
    return item.enclosure.url;
  }

  // img tag inside content or description
  const contentToScan =
    item?.['content:encoded'] ||
    item?.content ||
    item?.description ||
    item?.contentSnippet ||
    '';

  if (typeof contentToScan === 'string') {
    const match = contentToScan.match(/<img[^>]+src=["']([^"'>]+)["']/i);
    if (match?.[1] && isHttpUrl(match[1])) {
      return match[1];
    }
  }

  return undefined;
}

function buildFingerprint(source: Source, item: any, articleUrl: string, normalizedTitle: string): string {
  if (typeof item?.guid === 'string' && item.guid.trim()) {
    return item.guid.trim();
  }

  if (articleUrl) {
    return articleUrl.trim();
  }

  return `${source.id}-${normalizedTitle}`;
}

function mapRssItemToArticle(
  source: Source,
  item: any
): Omit<Article, 'id' | 'ingested_at'> | null {
  const articleUrl = isHttpUrl(item?.link) ? item.link.trim() : '';

  // Only accept real external article links
  if (!isLikelyArticleUrl(articleUrl, source.url)) {
    return null;
  }

  const title =
    typeof item?.title === 'string' && item.title.trim()
      ? item.title.trim()
      : 'Untitled Report';

  const normalizedTitle = normalizeTitle(title);

  const summary =
    (typeof item?.contentSnippet === 'string' && item.contentSnippet.trim()) ||
    (typeof item?.description === 'string' && item.description.trim()) ||
    '';

  const content =
    (typeof item?.['content:encoded'] === 'string' && item['content:encoded'].trim()) ||
    (typeof item?.content === 'string' && item.content.trim()) ||
    summary;

  const imageUrl = extractImageUrl(item);

  return {
    title,
    content,
    summary,
    url: articleUrl,
    source_name: source.name,
    source_type: 'rss',
    published_at: parsePublishedAt(item?.pubDate),
    first_seen_at: Timestamp.now(),
    last_updated_at: Timestamp.now(),
    fingerprint: buildFingerprint(source, item, articleUrl, normalizedTitle),
    tag_ids: [
      'intelligence',
      'rss-feed',
      source.name.toLowerCase().replace(/\s+/g, '-'),
    ],
    is_breaking: false,
    image_url: imageUrl,
    image_source: imageUrl ? source.name : undefined,
    image_caption: undefined,
    content_origin: 'live_rss',
    is_verified: source.is_verified || false,
  };
}

/**
 * -----------------------------
 * RSS ingestion
 * -----------------------------
 */
async function fetchRSS(source: Source): Promise<Omit<Article, 'id' | 'ingested_at'>[]> {
  try {
    const response = await fetch(`/api/proxy/rss?url=${encodeURIComponent(source.url)}`);

    if (!response.ok) {
      console.warn(`[Ingestion] Feed failed: ${source.name} (${source.url})`);
      return [];
    }

    const feed = await response.json();

    const rawItems = Array.isArray(feed?.items) ? feed.items : [];

    const mapped = rawItems
      .map((item: any) => mapRssItemToArticle(source, item))
      .filter(Boolean) as Omit<Article, 'id' | 'ingested_at'>[];

    // Deduplicate within same feed pull
    const seenFingerprints = new Set<string>();
    const seenUrls = new Set<string>();

    return mapped.filter((article) => {
      const fingerprint = article.fingerprint?.trim();
      const url = article.url?.trim();

      if (!fingerprint || !url) return false;
      if (seenFingerprints.has(fingerprint) || seenUrls.has(url)) return false;

      seenFingerprints.add(fingerprint);
      seenUrls.add(url);
      return true;
    });
  } catch (error) {
    console.warn(`[Ingestion] Error fetching RSS for ${source.name}:`, error);
    return [];
  }
}

/**
 * -----------------------------
 * Optional integrations
 * -----------------------------
 */
async function fetchNewsAPI(_source: Source): Promise<Omit<Article, 'id' | 'ingested_at'>[]> {
  if (!ENV.KEYS.NEWS || ENV.KEYS.NEWS === 'NOT_CONFIGURED') {
    console.warn('[Ingestion] NEWS_API_KEY missing. Skipping News API ingestion.');
    return [];
  }

  // Real News API integration can be added later.
  return [];
}

async function fetchYouTube(_source: Source): Promise<Omit<Article, 'id' | 'ingested_at'>[]> {
  if (!ENV.KEYS.YOUTUBE || ENV.KEYS.YOUTUBE === 'NOT_CONFIGURED') {
    console.warn('[Ingestion] YOUTUBE_API_KEY missing. Skipping YouTube ingestion.');
    return [];
  }

  // Real YouTube integration can be added later.
  return [];
}

/**
 * -----------------------------
 * Main refresh flow
 * -----------------------------
 */
export async function refreshSources() {
  try {
    const sources = await getSources(true);
    let totalIngested = 0;

    // Prevent same-refresh duplicates before writing
    const seenFingerprints = new Set<string>();
    const seenUrls = new Set<string>();

    for (const source of sources) {
      let articles: Omit<Article, 'id' | 'ingested_at'>[] = [];

      try {
        switch (source.type) {
          case 'rss':
            articles = await fetchRSS(source);
            break;
          case 'news_api':
            articles = await fetchNewsAPI(source);
            break;
          case 'youtube':
            articles = await fetchYouTube(source);
            break;
          default:
            articles = await fetchRSS(source);
            break;
        }

        for (const article of articles) {
          const fingerprint = article.fingerprint?.trim();
          const url = article.url?.trim();

          if (!fingerprint || !url) continue;
          if (seenFingerprints.has(fingerprint) || seenUrls.has(url)) continue;

          try {
            await addArticle(article);
            seenFingerprints.add(fingerprint);
            seenUrls.add(url);
            totalIngested++;
          } catch (writeError) {
            console.error(`[Ingestion] Failed to store article from ${source.name}:`, writeError, article);
          }
        }
      } catch (sourceError) {
        console.error(`[Ingestion] Failed source refresh for ${source.name}:`, sourceError);
      }
    }

    console.log(`[Ingestion] Completed refresh. Stored ${totalIngested} new articles.`);
    return totalIngested;
  } catch (error) {
    console.error('[Ingestion] Failed to load sources for refresh:', error);
    return 0;
  }
}

/**
 * -----------------------------
 * First-load content trigger
 * -----------------------------
 */
export async function ensureInitialContent() {
  try {
    const existing = await getArticles(1);
    if (existing.length === 0) {
      console.log('[Ingestion] No articles found. Triggering initial live ingestion...');
      await refreshSources();
    }
  } catch (error) {
    console.error('[Ingestion] Failed initial content check:', error);
  }
}
