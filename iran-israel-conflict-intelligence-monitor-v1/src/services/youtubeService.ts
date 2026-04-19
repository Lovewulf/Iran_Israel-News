// @ts-ignore
import { YoutubeTranscript } from 'youtube-transcript-api';
import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import { YoutubeTranscript } from 'youtube-transcript-api';
import { LOCATION_MAP } from '../locations.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; IranIsraelMonitor/1.0)',
  },
});

// List of YouTube channels to monitor
// Format: { name: 'Channel Name', channelId: 'UC...' }
const CHANNELS = [
  { name: 'Al Jazeera English', channelId: 'UCQtnw7MP6wXsj7-JC0P7Y0A' },
  { name: 'BBC News', channelId: 'UC16niRr50-MSBwiO3YDb3RA' },
  { name: 'CNN', channelId: 'UCupvZG-5ko_eiXAupbDfxWw' },
  { name: 'Reuters', channelId: 'UCSJwVCU-8VnYoxPpB8W3NfQ' },
  { name: 'Press TV (Iran)', channelId: 'UCXzQsQOaVrJD1vzQbE7WN0g' },
  { name: 'RT (Russia)', channelId: 'UCzIZ8xE9PCHZzAm3NKkZ8NA' },
  { name: 'CGTN (China)', channelId: 'UCX4RZP3z0DyCwJb6vQXq8lQ' },
  { name: 'i24NEWS English', channelId: 'UCAN7MlJJt_EcTHlNEF2y6Cg' },
  { name: 'TRT World', channelId: 'UC0w2M6jRlPZwOMZzHzn2ZLQ' },
];

// Geocoding (reuse from ingestionService)
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

// Fetch transcript for a video ID
async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0) return null;
    // Combine all text segments
    return transcript.map(t => t.text).join(' ').substring(0, 5000); // limit length
  } catch (error) {
    console.warn(`No transcript available for video ${videoId}:`, error);
    return null;
  }
}

// Process a single YouTube channel
async function processYouTubeChannel(channelName: string, channelId: string, maxVideos = 5): Promise<number> {
  let addedCount = 0;
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  console.log(`🔍 Processing YouTube channel: ${channelName} (${channelId})`);

  try {
    const feed = await parser.parseURL(feedUrl);
    const items = feed.items?.slice(0, maxVideos) || [];
    for (const item of items) {
      const videoId = item.id?.split(':').pop(); // extract video ID from <yt:videoId> or id field
      if (!videoId) continue;

      // Check if we already have this video (by URL)
      const { data: existing } = await supabase.from('articles').select('url').eq('url', item.link);
      if (existing && existing.length > 0) continue;

      // Fetch transcript
      const transcript = await fetchTranscript(videoId);
      if (!transcript) continue;

      const title = item.title || 'No title';
      const publishedAt = item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString();
      const now = new Date().toISOString();
      const fingerprint = Buffer.from(`${item.link}${title}`).toString('base64');
      const summary = transcript.substring(0, 300); // first 300 chars as summary

      const { lat: location_lat, lon: location_lon } = geocodeArticle(title, transcript);

      const article = {
        title,
        content: transcript,
        summary,
        url: item.link,
        source_name: `YouTube: ${channelName}`,
        source_type: 'youtube',
        published_at: publishedAt,
        ingested_at: now,
        first_seen_at: now,
        last_updated_at: now,
        fingerprint,
        tag_ids: [],
        image_url: item.enclosure?.url || '', // thumbnail if available
        is_breaking: false,
        content_origin: 'youtube',
        is_verified: false,
        location_lat,
        location_lon,
      };

      const { error } = await supabase.from('articles').insert(article);
      if (error) {
        console.error(`Insert error for YouTube video ${title}:`, error.message);
        continue;
      }
      addedCount++;
      console.log(`✅ [YouTube] Added: ${title}`);
    }
  } catch (error) {
    console.error(`Failed to process YouTube channel ${channelName}:`, error);
  }
  return addedCount;
}

// Main YouTube ingestion function
export async function runYouTubeIngestion() {
  console.log('📡 Starting YouTube ingestion...');
  let totalAdded = 0;
  for (const channel of CHANNELS) {
    const added = await processYouTubeChannel(channel.name, channel.channelId, 5);
    totalAdded += added;
  }
  console.log(`🏁 YouTube ingestion completed. Total new videos added: ${totalAdded}`);
  return { totalAdded };
}
