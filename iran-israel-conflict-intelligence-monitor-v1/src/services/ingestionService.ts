import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import Parser from 'rss-parser';
import { LOCATION_MAP } from '../locations.js';

// ========== Configuration ==========
const MIN_DATE = new Date('2026-03-01T00:00:00Z');
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== User-Agent Rotation ==========
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];
const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': getRandomUserAgent() },
});

// ========== Geocoding ==========
function geocodeArticle(title: string, summary: string): { lat: number | null; lon: number | null } {
  const text = (title + ' ' + summary).toLowerCase();
  for (const [place, data] of Object.entries(LOCATION_MAP)) {
    if (text.includes(place.toLowerCase())) {
      return { lat: data.lat, lon: data.lon };
    }
    for (const alias of data.aliases) {
      if (text.includes(alias.toLowerCase())) {
        return { lat: data.lat, lon: data.lon };
      }
    }
  }
  return { lat: null, lon: null };
}

// ========== Helper: Fetch with retries ==========
async function fetchFeedWithRetry(url: string, maxRetries = 2): Promise<any> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': getRandomUserAgent() },
      });
      return await parser.parseString(response.data);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Attempt ${attempt}/${maxRetries} failed for ${url}: ${errorMsg}`);
      lastError = error;
      if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw lastError;
}

// ========== Extract image URL ==========
async function extractImageUrl(item: any, link: string): Promise<string> {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item['media:content']?.['$']?.url) return item['media:content']['$'].url;
  if (item['media:thumbnail']?.['$']?.url) return item['media:thumbnail']['$'].url;
  if (item['content:encoded']) {
    const imgMatch = item['content:encoded'].match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  if (link) {
    try {
      const response = await axios.get(link, { timeout: 8000, headers: { 'User-Agent': getRandomUserAgent() } });
      const html = response.data;
      let ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
      if (ogMatch) return ogMatch[1];
      let twitterMatch = html.match(/<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/);
      if (twitterMatch) return twitterMatch[1];
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
      if (jsonLdMatch) {
        try {
          const jsonData = JSON.parse(jsonLdMatch[1]);
          if (jsonData.image?.url) return jsonData.image.url;
          if (jsonData.image) return jsonData.image;
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  }
  return '';
}

// ========== Date filter ==========
function isOnOrAfterMinDate(pubDate: string | Date | undefined): boolean {
  if (!pubDate) return false;
  try {
    const articleDate = new Date(pubDate);
    if (isNaN(articleDate.getTime())) return false;
    return articleDate >= MIN_DATE;
  } catch {
    return false;
  }
}

// ========== Process a single feed (max 15 items) ==========
async function processFeed(sourceName: string, feedUrl: string, maxItems = 15): Promise<number> {
  let addedCount = 0;
  try {
    console.log(`🔍 Processing ${sourceName} from: ${feedUrl}`);
    const feed = await fetchFeedWithRetry(feedUrl);
    const items = feed.items?.slice(0, maxItems) || [];
    if (items.length === 0) {
      console.warn(`No items found in feed: ${feedUrl}`);
      return 0;
    }
    for (const item of items) {
      if (!item.link) continue;

      const pubDate = item.isoDate || item.pubDate;
      if (!isOnOrAfterMinDate(pubDate)) {
        console.log(`⏭️ Skipping article older than March 1, 2026: ${item.title?.substring(0, 50)} (${pubDate})`);
        continue;
      }

      // Duplicate check
      const { data: existing } = await supabase.from('articles').select('url').eq('url', item.link);
      if (existing && existing.length > 0) continue;

      const imageUrl = await extractImageUrl(item, item.link);
      const title = item.title?.trim() || 'No title';
      const content = item.content || item.contentSnippet || '';
      const summary = item.contentSnippet || content.slice(0, 300);
      const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
      const now = new Date().toISOString();
      const fingerprint = Buffer.from(`${item.link}${title}`).toString('base64');

      const { lat: location_lat, lon: location_lon } = geocodeArticle(title, summary);

      const article = {
        title,
        content,
        summary,
        url: item.link,
        source_name: sourceName,
        source_type: 'rss',
        published_at: publishedAt,
        ingested_at: now,
        first_seen_at: now,
        last_updated_at: now,
        fingerprint,
        tag_ids: [],
        image_url: imageUrl,
        is_breaking: title.toLowerCase().includes('breaking') || title.toLowerCase().includes('urgent'),
        content_origin: 'live_rss',
        is_verified: false,
        location_lat,
        location_lon,
      };

      const { error } = await supabase.from('articles').insert(article);
      if (error) {
        console.error(`Insert error for ${title}:`, error.message);
        continue;
      }
      addedCount++;
      console.log(`✅ [${sourceName}] Added: ${title.substring(0, 70)}... (published ${publishedAt})`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to process ${sourceName} (${feedUrl}): ${errorMsg}`);
  }
  return addedCount;
}

// ========== Main ingestion (faster: more items, extra feeds) ==========
export async function runFullIngestion() {
  console.log(`📡 Starting news ingestion (only articles from ${MIN_DATE.toISOString()} onwards)`);
  let totalAdded = 0;

  const feedGroups = [
    { name: 'Iran General News', feeds: [
      'https://news.google.com/rss/search?q=iran&hl=en-US&gl=US&ceid=US:en',
      'https://rss.nytimes.com/services/xml/rss/nyt/Iran.xml',
      'https://feeds.bbci.co.uk/news/world/middle_east/iran/rss.xml',
      'https://www.aljazeera.com/xml/rss/iran.xml',
    ]},
    { name: 'Israel General News', feeds: [
      'https://news.google.com/rss/search?q=israel&hl=en-US&gl=US&ceid=US:en',
      'https://rss.nytimes.com/services/xml/rss/nyt/Israel.xml',
      'https://feeds.bbci.co.uk/news/world/middle_east/israel/rss.xml',
    ]},
    { name: 'Iran-Israel Conflict', feeds: [
      'https://news.google.com/rss/search?q=iran+israel+conflict&hl=en-US&gl=US&ceid=US:en',
      'https://news.yahoo.com/rss/topic/iran-israel-conflict',
      'https://www.timesofisrael.com/feed/',
    ]},
    { name: 'Al Jazeera', feeds: [
      'https://www.aljazeera.com/xml/rss/all.xml',
      'https://www.aljazeera.com/xml/rss/news.xml',
    ]},
    { name: 'CNN', feeds: [
      'http://rss.cnn.com/rss/edition_world.rss',
      'http://www.cnn.com/rss/cnn_topstories.rss',
      'http://rss.cnn.com/rss/edition_meast.rss',
    ]},
    { name: 'Dawn (Pakistan)', feeds: [
      'https://www.dawn.com/feed/',
      'https://www.dawn.com/feed/pakistan/',
    ]},
    { name: 'Geo News (Pakistan)', feeds: ['https://www.geo.tv/rss/1'] },
    { name: 'The Express Tribune (Pakistan)', feeds: ['https://tribune.com.pk/feed/'] },
    { name: 'Pakistan Today', feeds: ['https://www.pakistantoday.com.pk/feed/'] },
    { name: 'The News International (Pakistan)', feeds: ['https://www.thenews.com.pk/feed'] },
    { name: 'Middle East General', feeds: [
      'https://news.google.com/rss/search?q=middle+east&hl=en-US&gl=US&ceid=US:en',
      'https://www.aljazeera.com/xml/rss/middle-east.xml',
    ]},
    { name: 'International – BBC', feeds: [
      'http://feeds.bbci.co.uk/news/world/rss.xml',
      'https://feeds.bbci.co.uk/news/world/rss.xml',
    ]},
    // Extra sources for more news volume
    { name: 'Reuters World', feeds: [
      'https://www.reuters.com/world/feed/',
      'https://www.reuters.com/world/middle-east/feed/',
    ]},
    { name: 'AP Top News', feeds: [
      'https://apnews.com/hub/world-news?format=rss',
      'https://apnews.com/hub/middle-east?format=rss',
    ]},
    { name: 'France 24 Middle East', feeds: [
      'https://www.france24.com/en/middle-east/rss',
    ]},
    { name: 'Deutsche Welle Middle East', feeds: [
      'https://rss.dw.com/rdf/xml-en-mideast',
    ]},
  ];

  for (const group of feedGroups) {
    let success = false;
    for (const feedUrl of group.feeds) {
      if (success) break;
      const added = await processFeed(group.name, feedUrl, 15); // 15 items per source
      if (added > 0) {
        totalAdded += added;
        success = true;
        console.log(`✅ Successfully ingested from ${group.name} via ${feedUrl}`);
      } else {
        console.log(`⚠️ No recent items from ${feedUrl} for ${group.name}, trying fallback...`);
      }
    }
    if (!success) console.error(`❌ All feeds failed for group: ${group.name}`);
  }

  console.log(`🏁 Ingestion completed. Total new articles added (from ${MIN_DATE.toISOString()} onwards): ${totalAdded}`);
  return { totalAdded };
}
