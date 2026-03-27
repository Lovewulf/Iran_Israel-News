import { Timestamp } from 'firebase/firestore';
import { addArticle, getSources, getArticles } from './firestoreService';
import { Article, Source } from '../types';
import { ENV } from '../config/env';

/**
 * Fetches articles from an RSS feed via the server proxy.
 */
async function fetchRSS(source: Source): Promise<Omit<Article, 'id' | 'ingested_at'>[]> {
  try {
    const response = await fetch(`/api/proxy/rss?url=${encodeURIComponent(source.url)}`);
    if (!response.ok) {
      console.warn(`[Ingestion] Feed failed: ${source.name} (${source.url}). Skipping gracefully.`);
      return [];
    }
    const feed = await response.json();

    return (feed.items || []).map((item: any) => {
      // 1. Image Extraction Rules
      let imageUrl = '';
      let imageSource = source.name;
      let imageCaption = '';

      // Try media:content
      if (item['media:content'] && item['media:content'].$) {
        imageUrl = item['media:content'].$.url;
      } else if (Array.isArray(item['media:content']) && item['media:content'][0]?.$.url) {
        imageUrl = item['media:content'][0].$.url;
      }
      
      // Try media:thumbnail
      if (!imageUrl && item['media:thumbnail'] && item['media:thumbnail'].$) {
        imageUrl = item['media:thumbnail'].$.url;
      }

      // Try enclosure
      if (!imageUrl && item.enclosure?.url) {
        imageUrl = item.enclosure.url;
      }

      // Try image inside content:encoded or description
      if (!imageUrl) {
        const contentToScan = item['content:encoded'] || item.content || item.description || '';
        const imgMatch = contentToScan.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        }
      }
      
      // Fallback image if none found
      if (!imageUrl) {
        const keywords = item.title.split(' ').slice(0, 2).join(',');
        imageUrl = `https://picsum.photos/seed/${encodeURIComponent(keywords)}/800/600`;
        imageSource = 'Placeholder';
      }

      // Normalize title for deduplication
      const normalizedTitle = (item.title || '').toLowerCase().trim().replace(/[^\w\s]/g, '');

      return {
        title: item.title || 'Untitled Report',
        content: item.contentSnippet || item.content || item.description || '',
        summary: item.contentSnippet || item.description || '',
        url: item.link || source.url,
        source_name: source.name,
        source_type: 'rss',
        published_at: item.pubDate ? Timestamp.fromDate(new Date(item.pubDate)) : Timestamp.now(),
        first_seen_at: Timestamp.now(),
        last_updated_at: Timestamp.now(),
        fingerprint: item.guid || item.link || `${source.id}-${normalizedTitle}`,
        tag_ids: ['intelligence', 'rss-feed', source.name.toLowerCase().replace(/\s+/g, '-')],
        is_breaking: false,
        image_url: imageUrl,
        image_source: imageSource,
        image_caption: imageCaption,
        content_origin: 'live_rss',
        is_verified: source.is_verified || false,
      };
    });
  } catch (error) {
    console.warn(`[Ingestion] Error in fetchRSS for ${source.name}:`, error);
    return [];
  }
}

/**
 * Simulates fetching articles from News API.
 */
async function fetchNewsAPI(source: Source): Promise<Omit<Article, 'id' | 'ingested_at'>[]> {
  if (!ENV.KEYS.NEWS || ENV.KEYS.NEWS === 'NOT_CONFIGURED') {
    console.warn('News API Key is missing. Using fallback mock data.');
    return fetchRSS(source); // Fallback to mock RSS
  }
  return [];
}

/**
 * Simulates fetching videos from YouTube API.
 */
async function fetchYouTube(source: Source): Promise<Omit<Article, 'id' | 'ingested_at'>[]> {
  if (!ENV.KEYS.YOUTUBE || ENV.KEYS.YOUTUBE === 'NOT_CONFIGURED') {
    console.warn('YouTube API Key is missing. Using fallback mock data.');
    return fetchRSS(source); // Fallback to mock RSS
  }
  return [];
}

/**
 * Main ingestion loop.
 */
export async function refreshSources() {
  try {
    const sources = await getSources(true);
    let totalIngested = 0;

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
        }

        for (const article of articles) {
          await addArticle(article);
          totalIngested++;
        }
      } catch (error) {
        console.error(`Failed to refresh source ${source.name}:`, error);
      }
    }

    return totalIngested;
  } catch (error) {
    console.error('Failed to get sources for refresh:', error);
    return 0;
  }
}

/**
 * Auto-ingestion on first load if empty.
 */
export async function ensureInitialContent() {
  try {
    const articles = await getArticles(1);
    if (articles.length === 0) {
      console.log('No articles found. Triggering initial ingestion...');
      await refreshSources();
    }
  } catch (error) {
    console.error('Failed to check for initial content:', error);
  }
}
