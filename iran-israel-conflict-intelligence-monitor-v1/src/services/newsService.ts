import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { Article, Source } from '../types';

export async function getArticles(limitCount = 50): Promise<Article[]> {
  const path = 'articles';
  try {
    const q = query(collection(db, path), orderBy('published_at', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getSources(): Promise<Source[]> {
  const path = 'sources';
  try {
    const snapshot = await getDocs(collection(db, path));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Source));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function addSource(source: Omit<Source, 'id'>) {
  const path = 'sources';
  try {
    return await addDoc(collection(db, path), {
      ...source,
      last_polled_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getRecentArticlesByCategory(category: string, limitCount = 10): Promise<Article[]> {
  const path = 'articles';
  try {
    const q = query(
      collection(db, path),
      where('category', '==', category),
      orderBy('published_at', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}
