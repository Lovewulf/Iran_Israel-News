import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import Parser from 'rss-parser';

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define user-agent constant (used both in parser and image extraction)
const USER_AGENT = 'Mozilla/5.0 (compatible; IranIsraelMonitor/1.0; +https://iran-israel-news.onrender.com)';

// Pass all options directly to the Parser constructor
const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': USER_AGENT }
});

// Expanded list of relevant RSS feeds (Iran-Israel conflict focused)
const NEWS_SOURCES = [
  { name: 'Reuters - Iran', url: 'https://www.reuters.com/world/middle-east/iran/feed/', category: 'news' },
  { name: 'Reuters - Israel', url: 'https://www.reuters.com/world/middle-east/israel/feed/', category: 'news' },
  { name: 'BBC - Middle East', url: 'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml', category: 'news' },
  { name: 'Al Jazeera - Iran', url: 'https://www.aljazeera.com/xml/rss/iran.xml', category: 'news' },
  { name: 'Al Jazeera - Palestine', url: 'https://www.aljazeera.com/xml/rss/palestine.xml', category: 'news' },
  { name: 'Times of Israel', url: 'https://www.timesofisrael.com/feed/', category: 'news' },
  { name: 'Jerusalem Post - Breaking', url: 'https://www.jpost.com/breaking-news/feed', category: 'news' },
  { name: 'Jerusalem Post - Iran', url: 'https://www.jpost.com/iran/feed', category: 'news' },
  { name: 'AP News - Iran', url: 'https://apnews.com/hub/iran?format=rss', category: 'news' },
  { name: 'AP News - Israel', url: 'https://apnews.com/hub/israel?format=rss', category: 'news' },
  { name: 'Haaretz - Iran', url: 'https://www.haaretz.com/about/feed-iran', category: 'news' },
  { name: 'The National (UAE) - Iran', url: 'https://www.thenationalnews.com/feed/rss/feed/mena/iran.xml', category: 'news' }
];

async function extractImageUrl(item: any, link: string): Promise<string> {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  if (link) {
    try {
      const response = await axios.get(link, {
        timeout: 8000,
        headers: { 'User-Agent': USER_AGENT } // Use constant – no dependency on parser.options
      });
      const ogMatch = response.data.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
      if (ogMatch) return ogMatch[1];
    } catch (e) {
      // ignore – image extraction is optional
    }
  }
  return '';
}

export async function runFullIngestion() {
  console.log('📡 Starting multi-source news ingestion...');
  let totalAdded = 0;
  const results: { source: string; success: boolean; count: number; error?: string }[] = [];

  for (const source of NEWS_SOURCES) {
    let successCount = 0;
    try {
      console.log(`🔍 Fetching from ${source.name} (${source.url})...`);
      const feed = await parser.parseURL(source.url);
      
      for (const item of feed.items.slice(0, 8)) {
        if (!item.link) continue;

        // Check duplicate
        const { data: existing } = await supabase.from('articles').select('url').eq('url', item.link);
        if (existing?.length) continue;

        const imageUrl = await extractImageUrl(item, item.link);
        const title = item.title || 'No title';
        const publishedAt = item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString();
        const now = new Date().toISOString();
        const fingerprint = Buffer.from(`${item.link}${title}`).toString('base64');

        const article = {
          title,
          content: item.content || item.contentSnippet || '',
          summary: item.contentSnippet || item.content?.slice(0, 300) || '',
          url: item.link,
          source_name: source.name,
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
          is_verified: false
        };

        const { error } = await supabase.from('articles').insert(article);
        if (error) throw error;
        successCount++;
        totalAdded++;
        console.log(`✅ [${source.name}] Added: ${title.substring(0, 60)}...`);
      }
      results.push({ source: source.name, success: true, count: successCount });
    } catch (err: any) {
      console.error(`❌ Failed for ${source.name}:`, err.message || err);
      results.push({ source: source.name, success: false, count: 0, error: err.message });
    }
  }

  console.log(`🏁 Ingestion finished. Total new articles: ${totalAdded}`);
  console.table(results);
  return { totalAdded, details: results };
}
