import { addDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { getDbSafe } from '../firebase';

export async function seedInitialData() {
  console.log('[SeedService] Starting essential data seeding check...');
  const db = getDbSafe();

  if (!db) {
    console.error('[SeedService] Firestore not available for seeding.');
    return;
  }

  try {
    /**
     * ---------------------------------------------------------
     * 1. Seed categories if missing
     * ---------------------------------------------------------
     */
    console.log('[SeedService] Checking categories...');
    const catSnap = await getDocs(query(collection(db, 'categories'), limit(1)));

    if (catSnap.empty) {
      console.log('[SeedService] Seeding categories...');

      const categories = [
        {
          name: 'Military',
          description: 'Troop movements, strikes, and defense systems.',
          icon: 'Shield',
          color: 'red',
          slug: 'military',
        },
        {
          name: 'Diplomatic',
          description: 'Treaties, negotiations, and international statements.',
          icon: 'Globe',
          color: 'blue',
          slug: 'diplomatic',
        },
        {
          name: 'Cyber',
          description: 'Hacking, infrastructure attacks, and digital warfare.',
          icon: 'Cpu',
          color: 'purple',
          slug: 'cyber',
        },
        {
          name: 'Humanitarian',
          description: 'Aid, displacement, and civilian impact.',
          icon: 'Heart',
          color: 'green',
          slug: 'humanitarian',
        },
      ];

      for (const cat of categories) {
        await addDoc(collection(db, 'categories'), cat);
      }

      console.log('[SeedService] Categories seeded successfully.');
    } else {
      console.log('[SeedService] Categories already exist.');
    }

    /**
     * ---------------------------------------------------------
     * 2. Seed real external RSS sources if missing
     * ---------------------------------------------------------
     */
    console.log('[SeedService] Checking sources...');
    const sourceSnap = await getDocs(query(collection(db, 'sources'), limit(1)));

    if (sourceSnap.empty) {
      console.log('[SeedService] Seeding real RSS sources...');

      const sources = [
        // BBC
        {
          name: 'BBC News Front Page',
          url: 'http://newsrss.bbc.co.uk/rss/newsonline_uk_edition/front_page/rss.xml',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 30,
          is_verified: true,
        },
        {
          name: 'BBC News World',
          url: 'http://newsrss.bbc.co.uk/rss/newsonline_uk_edition/world/rss.xml',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 30,
          is_verified: true,
        },
        {
          name: 'BBC Latest Published',
          url: 'http://news.bbc.co.uk/rss/newsonline_uk_edition/latest_published_stories/rss.xml',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 15,
          is_verified: true,
        },

        // DW
        {
          name: 'DW Top Stories',
          url: 'https://rss.dw.com/rdf/rss-en-top',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 30,
          is_verified: true,
        },
        {
          name: 'DW All Stories',
          url: 'https://rss.dw.com/rdf/rss-en-all',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 60,
          is_verified: true,
        },

        // The Guardian
        {
          name: 'The Guardian World',
          url: 'https://www.theguardian.com/world/rss',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 30,
          is_verified: true,
        },
        {
          name: 'The Guardian Middle East',
          url: 'https://www.theguardian.com/world/middleeast/rss',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 30,
          is_verified: true,
        },
        {
          name: 'The Guardian Iran',
          url: 'https://www.theguardian.com/world/iran/rss',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 60,
          is_verified: true,
        },
        {
          name: 'The Guardian Israel',
          url: 'https://www.theguardian.com/world/israel/rss',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 60,
          is_verified: true,
        },

        // France 24
        {
          name: 'France 24 English',
          url: 'https://www.france24.com/en/rss',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 30,
          is_verified: true,
        },
        {
          name: 'France 24 Europe',
          url: 'https://www.france24.com/en/europe/rss',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 60,
          is_verified: true,
        },

        // Jerusalem Post
        {
          name: 'JPost Front Page',
          url: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 15,
          is_verified: true,
        },
        {
          name: 'JPost Headlines',
          url: 'https://www.jpost.com/rss/rssfeedsheadlines.aspx',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 15,
          is_verified: true,
        },
        {
          name: 'JPost Middle East',
          url: 'https://www.jpost.com/rss/rssfeedsmiddleeastnews.aspx',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 30,
          is_verified: true,
        },
        {
          name: 'JPost Israel News',
          url: 'https://www.jpost.com/rss/rssfeedsisraelnews.aspx',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 30,
          is_verified: true,
        },

        // NPR
        {
          name: 'NPR Middle East',
          url: 'https://feeds.npr.org/1009/rss.xml',
          type: 'rss',
          is_active: true,
          refresh_frequency_minutes: 60,
          is_verified: true,
        },
      ];

      for (const source of sources) {
        await addDoc(collection(db, 'sources'), source);
      }

      console.log('[SeedService] Sources seeded successfully.');
    } else {
      console.log('[SeedService] Sources already exist.');
    }

    /**
     * ---------------------------------------------------------
     * 3. Do NOT auto-seed demo content
     * ---------------------------------------------------------
     */
    console.log('[SeedService] Checking content collections...');

    const articleSnap = await getDocs(query(collection(db, 'articles'), limit(1)));
    const clusterSnap = await getDocs(query(collection(db, 'event_clusters'), limit(1)));
    const reportSnap = await getDocs(query(collection(db, 'ai_reports'), limit(1)));

    if (articleSnap.empty) {
      console.log('[SeedService] No articles found yet. Real ingestion should populate this collection.');
    } else {
      console.log('[SeedService] Articles already exist.');
    }

    if (clusterSnap.empty) {
      console.log('[SeedService] No event clusters found yet. These should be built from real ingested content.');
    } else {
      console.log('[SeedService] Event clusters already exist.');
    }

    if (reportSnap.empty) {
      console.log('[SeedService] No AI reports found yet. These should be generated from real stored articles.');
    } else {
      console.log('[SeedService] AI reports already exist.');
    }

    console.log('[SeedService] Essential data seeding completed.');
  } catch (error) {
    console.error('[SeedService] Error during seeding:', error);
    throw error;
  }
}
