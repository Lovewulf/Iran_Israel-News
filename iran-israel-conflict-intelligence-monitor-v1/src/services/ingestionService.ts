import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import Parser from 'rss-parser';

// Supabase client setup (unchanged)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// User-Agent rotation (helps avoid simple blocks)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': USER_AGENTS[0] },
});

// --- Helper Functions ---
const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

async function fetchFeedWithRetry(url: string, maxRetries = 2): Promise<any> {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': getRandomUserAgent() },
      });
      return await parser.parseString(response.data);
    } catch (error) {
      console.warn(`Attempt ${attempt} failed for ${url}:`, error.message);
      lastError = error;
      if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw lastError;
}

async function processFeed(sourceName: string, feedUrl: string): Promise<number> {
  let addedCount = 0;
  try {
    console.log(`Processing feed for ${sourceName} from: ${feedUrl}`);
    const feed = await fetchFeedWithRetry(feedUrl);
    for (const item of feed.items.slice(0, 5)) {
      if (!item.link) continue;
      const { data: existing } = await supabase.from('articles').select('url').eq('url', item.link);
      if (existing?.length) continue;
      const article = {
        title: item.title || 'No title',
        content: item.content || item.contentSnippet || '',
        summary: item.contentSnippet || item.content?.slice(0, 300) || '',
        url: item.link,
        source_name: sourceName,
        source_type: 'rss',
        published_at: item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        first_seen_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
        fingerprint: Buffer.from(item.link + item.title).toString('base64'),
        tag_ids: [],
        image_url: '',
        is_breaking: false,
        content_origin: 'live_rss',
        is_verified: false
      };
      const { error } = await supabase.from('articles').insert(article);
      if (error) throw error;
      addedCount++;
      console.log(`✅ [${sourceName}] Added: ${article.title.substring(0, 60)}...`);
    }
  } catch (error) {
    console.error(`Failed to process feed for ${sourceName}:`, error.message);
  }
  return addedCount;
}

// --- Main Ingestion Function ---
export async function runFullIngestion() {
  console.log('📡 Starting multi-source news ingestion with fallbacks...');
  let totalAdded = 0;

  // Define feed groups with fallbacks
  const feedGroups = [
    {
      name: 'Iran General News',
      feeds: [
        'https://news.google.com/rss/search?q=iran&hl=en-US&gl=US&ceid=US:en',
        'https://rss.nytimes.com/services/xml/rss/nyt/Iran.xml',
        'https://feeds.bbci.co.uk/news/world/middle_east/iran/rss.xml',
      ],
    },
    {
      name: 'Israel General News',
      feeds: [
        'https://news.google.com/rss/search?q=israel&hl=en-US&gl=US&ceid=US:en',
        'https://rss.nytimes.com/services/xml/rss/nyt/Israel.xml',
        'https://feeds.bbci.co.uk/news/world/middle_east/israel/rss.xml',
      ],
    },
    {
      name: 'Iran-Israel Conflict',
      feeds: [
        'https://news.google.com/rss/search?q=iran+israel+conflict&hl=en-US&gl=US&ceid=US:en',
        'https://news.yahoo.com/rss/topic/iran-israel-conflict',
        'https://www.timesofisrael.com/feed/',
      ],
    },
  ];

  for (const group of feedGroups) {
    let success = false;
    for (const feedUrl of group.feeds) {
      if (success) break;
      const added = await processFeed(group.name, feedUrl);
      if (added > 0) {
        totalAdded += added;
        success = true;
        console.log(`Successfully processed ${group.name} via ${feedUrl}`);
        break;
      } else {
        console.log(`Failed to get items from ${feedUrl} for ${group.name}, trying next...`);
      }
    }
    if (!success) console.error(`All feeds failed for group: ${group.name}`);
  }

  console.log(`🏁 Ingestion finished. Total new articles: ${totalAdded}`);
  return { totalAdded };
}
