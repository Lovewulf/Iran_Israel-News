import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import type { Article } from '../types';

// Fetch latest articles with pagination
export async function getLatestArticles(maxCount = 50): Promise<Article[]> {
  try {
    const q = query(
      collection(db, 'articles'),
      orderBy('published_at', 'desc'),
      limit(maxCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Article[];
  } catch (error) {
    console.error('getLatestArticles error:', error);
    return [];
  }
}

// Fetch breaking news only
export async function getBreakingNews(): Promise<Article[]> {
  try {
    const q = query(
      collection(db, 'articles'),
      where('is_breaking', '==', true),
      orderBy('published_at', 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Article[];
  } catch (error) {
    console.error('getBreakingNews error:', error);
    return [];
  }
}

// Legacy function (if needed elsewhere)
export async function getArticles(limitCount = 100): Promise<Article[]> {
  return getLatestArticles(limitCount);
}
