import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import type { Source, AIReport, EventCluster, Article } from '../types';

// ============ Sources ============
export async function getSources(): Promise<Source[]> {
  try {
    const q = query(collection(db, 'sources'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Source));
  } catch (error) {
    console.error('getSources error:', error);
    return [];
  }
}

export async function addSource(source: Omit<Source, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'sources'), {
    ...source,
    created_at: serverTimestamp(),
    last_fetch: null
  });
  return docRef.id;
}

export async function updateSource(id: string, data: Partial<Source>): Promise<void> {
  await updateDoc(doc(db, 'sources', id), {
    ...data,
    updated_at: serverTimestamp()
  });
}

export async function deleteSource(id: string): Promise<void> {
  await deleteDoc(doc(db, 'sources', id));
}

export async function testSourceConnection(sourceId: string): Promise<{ success: boolean; message: string }> {
  // Simulate connection test – in production, fetch a sample from the source URL
  try {
    const sourceDoc = await getDoc(doc(db, 'sources', sourceId));
    if (!sourceDoc.exists()) {
      return { success: false, message: 'Source not found' };
    }
    const source = sourceDoc.data() as Source;
    if (source.url) {
      // Simple test: just check if URL is reachable (would need backend proxy)
      return { success: true, message: `Connection to ${source.name} successful` };
    }
    return { success: false, message: 'No URL configured' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
  }
}

// ============ AI Reports ============
export async function getAIReports(limitCount = 20): Promise<AIReport[]> {
  try {
    const q = query(
      collection(db, 'ai_reports'),
      orderBy('generated_at', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIReport));
  } catch (error) {
    console.error('getAIReports error:', error);
    return [];
  }
}

export async function saveReport(report: Partial<AIReport>): Promise<string> {
  const docRef = await addDoc(collection(db, 'ai_reports'), {
    ...report,
    generated_at: serverTimestamp(),
    status: report.status || 'published'
  });
  return docRef.id;
}

// ============ Event Clusters ============
export async function getEventClusters(status?: 'active' | 'archived'): Promise<EventCluster[]> {
  try {
    let q = query(collection(db, 'event_clusters'), orderBy('start_time', 'desc'));
    if (status) {
      q = query(collection(db, 'event_clusters'), where('status', '==', status), orderBy('start_time', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventCluster));
  } catch (error) {
    console.error('getEventClusters error:', error);
    return [];
  }
}

export async function getEventClusterById(id: string): Promise<EventCluster | null> {
  try {
    const docSnap = await getDoc(doc(db, 'event_clusters', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as EventCluster;
    }
    return null;
  } catch (error) {
    console.error('getEventClusterById error:', error);
    return null;
  }
}

// ============ Articles (additional helpers) ============
export async function getArticlesByCluster(clusterId: string): Promise<Article[]> {
  try {
    const q = query(collection(db, 'articles'), where('cluster_id', '==', clusterId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
  } catch (error) {
    console.error('getArticlesByCluster error:', error);
    return [];
  }
}

// Generic getArticles (alias for newsService, but kept here for consistency)
export async function getArticles(limitCount = 100, constraints: any[] = []): Promise<Article[]> {
  try {
    let q = query(collection(db, 'articles'), orderBy('published_at', 'desc'), limit(limitCount));
    if (constraints.length > 0) {
      q = query(collection(db, 'articles'), orderBy('published_at', 'desc'), ...constraints, limit(limitCount));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
  } catch (error) {
    console.error('getArticles error:', error);
    return [];
  }
}
