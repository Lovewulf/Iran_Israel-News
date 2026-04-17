import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import Parser from 'rss-parser';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const parser = new Parser();

const NEWS_SOURCES = [
  { name: 'Reuters - Iran', url: 'https://www.reuters.com/world/middle-east/iran/feed/', category: 'news' },
  { name: 'BBC - Middle East', url: 'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml', category: 'news' },
  { name: 'Al Jazeera - Iran', url: 'https://www.aljazeera.com/xml/rss/iran.xml', category: 'news' },
  { name: 'Times of Israel', url: 'https://www.timesofisrael.com/feed/', category: 'news' },
  { name: 'Jerusalem Post - Iran', url: 'https://www.jpost.com/breaking-news/feed', category: 'news' },
  { name: 'AP News - Iran', url: 'https://apnews.com/hub/iran?format=rss', category: 'news' }
];

async function extractImageUrl(item: any, link: string): Promise<string> {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  if (link) {
    try {
      const response = await axios.get(link, { timeout: 5000 });
      const ogMatch = response.data.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
      if (ogMatch) return ogMatch[1];
    } catch (e) {}
  }
  return '';
}

export async function runFullIngestion() {
  console.log('📡 Starting news ingestion...');
  let totalAdded = 0;

  for (const source of NEWS_SOURCES) {
    try {
      console.log(`Fetching from ${source.name}...`);
      const feed = await parser.parseURL(source.url);
      
      for (const item of feed.items.slice(0, 10)) {
        const { data: existing } = await supabase.from('articles').select('url').eq('url', item.link);
        if (existing?.length) continue;

        const imageUrl = await extractImageUrl(item, item.link);
        
        const article = {
          title: item.title || 'No title',
          content: item.content || item.contentSnippet || '',
          summary: item.contentSnippet || item.content?.slice(0, 300) || '',
          url: item.link,
          source_name: source.name,
          source_type: 'rss',
          published_at: item.isoDate ? new Date(item.isoDate) : new Date(),
          ingested_at: new Date(),
          first_seen_at: new Date(),
          last_updated_at: new Date(),
          fingerprint: Buffer.from(item.link + item.title).toString('base64'),
          tag_ids: [],
          image_url: imageUrl,
          is_breaking: false,
          content_origin: 'live_rss',
          is_verified: false
        };

        const { error } = await supabase.from('articles').insert(article);
        if (error) throw error;
        totalAdded++;
        console.log(`✅ Added: ${article.title}`);
      }
    } catch (err) {
      console.error(`❌ Failed to fetch ${source.name}:`, err);
    }
  }
  
  console.log(`🏁 Ingestion finished. Added ${totalAdded} new articles.`);
  return { totalAdded };
}
