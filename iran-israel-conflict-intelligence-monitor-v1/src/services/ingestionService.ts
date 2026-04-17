import { db } from '../firebase-admin'; // Use admin SDK for server-side
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import axios from 'axios';
import Parser from 'rss-parser';

const parser = new Parser();

// List of real RSS feeds for Iran-Israel conflict
const NEWS_SOURCES = [
  { name: 'Reuters - Iran', url: 'https://www.reuters.com/world/middle-east/iran/feed/', category: 'news' },
  { name: 'BBC - Middle East', url: 'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml', category: 'news' },
  { name: 'Al Jazeera - Iran', url: 'https://www.aljazeera.com/xml/rss/iran.xml', category: 'news' },
  { name: 'Times of Israel', url: 'https://www.timesofisrael.com/feed/', category: 'news' },
  { name: 'Jerusalem Post - Iran', url: 'https://www.jpost.com/breaking-news/feed', category: 'news' },
  { name: 'AP News - Iran', url: 'https://apnews.com/hub/iran?format=rss', category: 'news' }
];

// Helper to extract image URL from item
async function extractImageUrl(item: any, link: string): Promise<string> {
  // Check enclosure
  if (item.enclosure?.url) return item.enclosure.url;
  
  // Check content for img tag
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  
  // Try to fetch OG image from the article page
  if (link) {
    try {
      const response = await axios.get(link, { timeout: 5000 });
      const ogMatch = response.data.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
      if (ogMatch) return ogMatch[1];
    } catch (e) {
      // ignore fetch errors
    }
  }
  
  return ''; // no image found
}

export async function runFullIngestion() {
  console.log('📡 Starting news ingestion...');
  let totalAdded = 0;

  for (const source of NEWS_SOURCES) {
    try {
      console.log(`Fetching from ${source.name}...`);
      const feed = await parser.parseURL(source.url);
      
      for (const item of feed.items.slice(0, 10)) { // latest 10 per source
        // Check for duplicate by link
        const existingQuery = query(collection(db, 'articles'), where('url', '==', item.link));
        const existing = await getDocs(existingQuery);
        if (!existing.empty) continue;

        const imageUrl = await extractImageUrl(item, item.link);
        
        const article = {
          title: item.title || 'No title',
          content: item.content || item.contentSnippet || '',
          summary: item.contentSnippet || item.content?.slice(0, 300) || '',
          url: item.link,
          source_name: source.name,
          source_type: 'rss' as const,
          published_at: item.isoDate ? new Date(item.isoDate) : Timestamp.now(),
          ingested_at: Timestamp.now(),
          first_seen_at: Timestamp.now(),
          last_updated_at: Timestamp.now(),
          fingerprint: Buffer.from(item.link + item.title).toString('base64'),
          tag_ids: [],
          image_url: imageUrl,
          is_breaking: false, // could be enhanced with keyword detection
          content_origin: 'live_rss' as const,
          is_verified: false
        };

        await addDoc(collection(db, 'articles'), article);
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

// Optional: run scheduled ingestion (for serverless functions)
export async function scheduledIngestion() {
  const result = await runFullIngestion();
  console.log(`Scheduled ingestion complete: ${result.totalAdded} new articles`);
  return result;
}
