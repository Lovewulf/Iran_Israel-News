import { db } from '../firebase';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';

export async function seedInitialData() {
  // Check if any sources exist
  const sourcesSnap = await getDocs(collection(db, 'sources'));
  if (!sourcesSnap.empty) return; // already seeded

  // Seed default RSS sources for Iran-Israel conflict
  const defaultSources = [
    { name: 'Reuters Iran', type: 'rss', url: 'https://www.reuters.com/world/middle-east/iran/feed/', is_active: true, fetch_interval_minutes: 15, created_at: Timestamp.now() },
    { name: 'BBC Middle East', type: 'rss', url: 'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml', is_active: true, fetch_interval_minutes: 15, created_at: Timestamp.now() },
    { name: 'Times of Israel', type: 'rss', url: 'https://www.timesofisrael.com/feed/', is_active: true, fetch_interval_minutes: 15, created_at: Timestamp.now() },
    { name: 'Al Jazeera Iran', type: 'rss', url: 'https://www.aljazeera.com/xml/rss/iran.xml', is_active: true, fetch_interval_minutes: 15, created_at: Timestamp.now() }
  ];

  for (const src of defaultSources) {
    await addDoc(collection(db, 'sources'), src);
  }
  console.log('✅ Seeded default news sources');
}
