import { addDoc, collection, getDocs, query, limit, Timestamp, serverTimestamp } from 'firebase/firestore';
import { getDbSafe } from '../firebase';

export async function seedInitialData() {
  console.log('[SeedService] Starting initial data seeding check...');
  const db = getDbSafe();
  if (!db) {
    console.error('[SeedService] Firestore not available for seeding.');
    return;
  }

  try {
    // Check if categories already exist
    console.log('[SeedService] Checking categories...');
    const catSnap = await getDocs(query(collection(db, 'categories'), limit(1)));
    let categoryIds: Record<string, string> = {};
    
    if (catSnap.empty) {
      console.log('[SeedService] Seeding categories...');
      const categories = [
        { name: 'Military', description: 'Troop movements, strikes, and defense systems.', icon: 'Shield', color: 'red', slug: 'military' },
        { name: 'Diplomatic', description: 'Treaties, negotiations, and international statements.', icon: 'Globe', color: 'blue', slug: 'diplomatic' },
        { name: 'Cyber', description: 'Hacking, infrastructure attacks, and digital warfare.', icon: 'Cpu', color: 'purple', slug: 'cyber' },
        { name: 'Humanitarian', description: 'Aid, displacement, and civilian impact.', icon: 'Heart', color: 'green', slug: 'humanitarian' },
      ];
      for (const cat of categories) {
        const docRef = await addDoc(collection(db, 'categories'), cat);
        categoryIds[cat.slug] = docRef.id;
      }
      console.log('[SeedService] Categories seeded successfully.');
    } else {
      console.log('[SeedService] Categories already exist. Mapping IDs...');
      const allCats = await getDocs(collection(db, 'categories'));
      allCats.forEach(doc => {
        const data = doc.data();
        if (data.slug) categoryIds[data.slug] = doc.id;
        else categoryIds[data.name.toLowerCase()] = doc.id;
      });
    }

    // Check if sources already exist
    console.log('[SeedService] Checking sources...');
    const sourceSnap = await getDocs(query(collection(db, 'sources'), limit(1)));
    if (sourceSnap.empty) {
      console.log('[SeedService] Seeding sources...');
      const sources = [
        // BBC
        { name: 'BBC News Front Page', url: 'http://newsrss.bbc.co.uk/rss/newsonline_uk_edition/front_page/rss.xml', type: 'rss', is_active: true, refresh_frequency_minutes: 30, is_verified: true },
        { name: 'BBC News World', url: 'http://newsrss.bbc.co.uk/rss/newsonline_uk_edition/world/rss.xml', type: 'rss', is_active: true, refresh_frequency_minutes: 30, is_verified: true },
        { name: 'BBC Latest Published', url: 'http://news.bbc.co.uk/rss/newsonline_uk_edition/latest_published_stories/rss.xml', type: 'rss', is_active: true, refresh_frequency_minutes: 15, is_verified: true },
        
        // DW
        { name: 'DW Top Stories', url: 'https://rss.dw.com/rdf/rss-en-top', type: 'rss', is_active: true, refresh_frequency_minutes: 30, is_verified: true },
        { name: 'DW All Stories', url: 'https://rss.dw.com/rdf/rss-en-all', type: 'rss', is_active: true, refresh_frequency_minutes: 60, is_verified: true },
        
        // The Guardian
        { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss', type: 'rss', is_active: true, refresh_frequency_minutes: 30, is_verified: true },
        { name: 'The Guardian Middle East', url: 'https://www.theguardian.com/world/middleeast/rss', type: 'rss', is_active: true, refresh_frequency_minutes: 30, is_verified: true },
        { name: 'The Guardian Iran', url: 'https://www.theguardian.com/world/iran/rss', type: 'rss', is_active: true, refresh_frequency_minutes: 60, is_verified: true },
        { name: 'The Guardian Israel', url: 'https://www.theguardian.com/world/israel/rss', type: 'rss', is_active: true, refresh_frequency_minutes: 60, is_verified: true },
        
        // France 24
        { name: 'France 24 English', url: 'https://www.france24.com/en/rss', type: 'rss', is_active: true, refresh_frequency_minutes: 30, is_verified: true },
        { name: 'France 24 Europe', url: 'https://www.france24.com/en/europe/rss', type: 'rss', is_active: true, refresh_frequency_minutes: 60, is_verified: true },
        
        // Jerusalem Post
        { name: 'JPost Front Page', url: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx', type: 'rss', is_active: true, refresh_frequency_minutes: 15, is_verified: true },
        { name: 'JPost Headlines', url: 'https://www.jpost.com/rss/rssfeedsheadlines.aspx', type: 'rss', is_active: true, refresh_frequency_minutes: 15, is_verified: true },
        { name: 'JPost Middle East', url: 'https://www.jpost.com/rss/rssfeedsmiddleeastnews.aspx', type: 'rss', is_active: true, refresh_frequency_minutes: 30, is_verified: true },
        { name: 'JPost Israel News', url: 'https://www.jpost.com/rss/rssfeedsisraelnews.aspx', type: 'rss', is_active: true, refresh_frequency_minutes: 30, is_verified: true },
        
        // NPR
        { name: 'NPR Middle East', url: 'https://feeds.npr.org/1009/rss.xml', type: 'rss', is_active: true, refresh_frequency_minutes: 60, is_verified: true },
        
        {
          name: 'Sentinel Intel Internal',
          url: 'internal://intelligence',
          type: 'manual',
          is_active: true,
          refresh_frequency_minutes: 0,
          is_verified: true
        }
      ];
      for (const source of sources) {
        await addDoc(collection(db, 'sources'), source);
      }
      console.log('[SeedService] Sources seeded successfully.');
    } else {
      console.log('[SeedService] Sources already exist.');
    }

    // Seed articles if empty
    console.log('[SeedService] Checking articles...');
    const articleSnap = await getDocs(query(collection(db, 'articles'), limit(1)));
    let articleIds: string[] = [];
    
    if (articleSnap.empty) {
      console.log('[SeedService] No articles found. Initial ingestion will handle this.');
    } else {
      console.log('[SeedService] Articles already exist.');
      const allArticles = await getDocs(collection(db, 'articles'));
      allArticles.forEach(doc => articleIds.push(doc.id));
    }

    // Seed event clusters if empty
    console.log('[SeedService] Checking event clusters...');
    const clusterSnap = await getDocs(query(collection(db, 'event_clusters'), limit(1)));
    let clusterIds: string[] = [];
    
    if (clusterSnap.empty) {
      console.log('[SeedService] Seeding sample event clusters...');
      const clusters = [
        {
          title: 'Escalation in Northern Border Region',
          description: 'Increased cross-border fire and troop deployments observed along the northern front. Strategic analysts suggest a high risk of localized escalation.',
          start_date: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)),
          status: 'active',
          article_ids: articleIds.slice(0, 2),
          category_id: categoryIds['military'] || 'military',
          impact_level: 4
        },
        {
          title: 'Global Diplomatic De-escalation Initiative',
          description: 'A series of high-level meetings between international mediators and regional stakeholders aimed at establishing a long-term ceasefire framework.',
          start_date: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)),
          status: 'active',
          article_ids: [articleIds[1], articleIds[3]],
          category_id: categoryIds['diplomatic'] || 'diplomatic',
          impact_level: 3
        },
        {
          title: 'Critical Infrastructure Cyber Campaign',
          description: 'A wave of sophisticated cyber attacks targeting energy and communication networks across multiple jurisdictions, suspected to be state-sponsored.',
          start_date: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)),
          status: 'active',
          article_ids: [articleIds[2]],
          category_id: categoryIds['cyber'] || 'cyber',
          impact_level: 5
        }
      ];
      for (const cluster of clusters) {
        try {
          const docRef = await addDoc(collection(db, 'event_clusters'), cluster);
          clusterIds.push(docRef.id);
        } catch (err) {
          console.error(`[SeedService] Failed to seed cluster "${cluster.title}":`, err);
        }
      }

      // Update articles with cluster_id for better data linkage
      try {
        const { updateDoc, doc } = await import('firebase/firestore');
        if (clusterIds.length > 0) {
          await updateDoc(doc(db, 'articles', articleIds[0]), { cluster_id: clusterIds[0] });
          await updateDoc(doc(db, 'articles', articleIds[1]), { cluster_id: clusterIds[1] });
          await updateDoc(doc(db, 'articles', articleIds[2]), { cluster_id: clusterIds[2] });
        }
      } catch (err) {
        console.error('[SeedService] Failed to link articles to clusters:', err);
      }

      console.log('[SeedService] Event clusters seeded successfully.');
    } else {
      console.log('[SeedService] Event clusters already exist.');
      const allClusters = await getDocs(collection(db, 'event_clusters'));
      allClusters.forEach(doc => clusterIds.push(doc.id));
    }

    // Seed AI reports if empty
    console.log('[SeedService] Checking AI reports...');
    const reportSnap = await getDocs(query(collection(db, 'ai_reports'), limit(1)));
    if (reportSnap.empty) {
      console.log('[SeedService] Seeding sample AI reports...');
      const reports = [
        {
          title: 'Strategic Assessment: Regional Escalation Risks',
          summary: 'Analysis of recent military movements and diplomatic signals suggests a 65% probability of continued localized conflict, with a 20% risk of broader regional involvement.',
          content: '### Executive Summary\nThe regional security landscape has shifted significantly in the last 48 hours. While diplomatic efforts are underway, military readiness on both sides remains at peak levels.\n\n### Key Findings\n1. **Troop Movements**: Satellite imagery confirms significant deployments near strategic corridors.\n2. **Cyber Activity**: Increased scanning of critical infrastructure nodes indicates potential preparatory phases for larger digital offensives.\n3. **Diplomatic Stance**: Public rhetoric remains hardline, but private channels show some flexibility regarding humanitarian pauses.',
          generated_at: Timestamp.now(),
          cluster_ids: clusterIds.slice(0, 2),
          source_article_ids: articleIds.slice(0, 3),
          impact_score: 8.5,
          status: 'published',
          type: 'strategic',
          is_verified: true
        },
        {
          title: 'Intelligence Brief: Infrastructure Vulnerabilities',
          summary: 'Technical analysis of recent cyber attacks reveals specific patterns targeting legacy control systems in the energy sector.',
          content: '### Technical Overview\nThe recent disruption of power grids was achieved through a zero-day exploit targeting specific industrial control protocols. This indicates a high level of sophistication and resource backing.\n\n### Mitigation Strategies\n- Immediate patching of identified vulnerabilities.\n- Implementation of air-gapped backups for critical control nodes.\n- Enhanced monitoring of lateral movement within internal networks.',
          generated_at: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 12)), // 12 hours ago
          cluster_ids: [clusterIds[2]],
          source_article_ids: [articleIds[2]],
          impact_score: 9.2,
          status: 'published',
          type: 'flash',
          is_verified: true
        }
      ];
      for (const report of reports) {
        await addDoc(collection(db, 'ai_reports'), report);
      }
      console.log('[SeedService] AI reports seeded successfully.');
    } else {
      console.log('[SeedService] AI reports already exist.');
    }
    
    console.log('[SeedService] Initial data seeding check completed.');
  } catch (error) {
    console.error('[SeedService] Error during seeding:', error);
    throw error;
  }
}

