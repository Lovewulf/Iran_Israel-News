import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { getDbSafe, handleFirestoreError, OperationType } from '../firebase';
import { Article, EventCluster, Category, Tag, AIReport, Source, RefreshLog } from '../types';

/**
 * Generic helper to get a collection reference safely.
 */
const getColl = (path: string) => {
  const db = getDbSafe();
  if (!db) throw new Error(`Firestore not initialized. Cannot access collection: ${path}`);
  return collection(db, path);
};

/**
 * Generic helper to get a document reference safely.
 */
const getDocRef = (path: string, id: string) => {
  const db = getDbSafe();
  if (!db) throw new Error(`Firestore not initialized. Cannot access document: ${path}/${id}`);
  return doc(db, path, id);
};

// --- Articles ---

export const getArticles = async (limitCount = 50, constraints: QueryConstraint[] = []) => {
  const path = 'articles';
  try {
    const q = query(getColl(path), orderBy('published_at', 'desc'), limit(limitCount), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error; // Re-throw to allow UI to handle error state
  }
};

export const getBreakingNews = async (limitCount = 5) => {
  try {
    return await getArticles(limitCount, [where('is_breaking', '==', true)]);
  } catch (error) {
    // Fallback to latest articles if breaking news query fails (e.g. missing index)
    console.warn('Breaking news query failed, falling back to latest articles:', error);
    return getArticles(limitCount);
  }
};

export const addArticle = async (article: Omit<Article, 'id' | 'ingested_at'>) => {
  const path = 'articles';
  try {
    const docRef = await addDoc(getColl(path), {
      ...article,
      ingested_at: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

// --- Event Clusters ---

export const getEventClusters = async (status: EventCluster['status'] = 'active') => {
  const path = 'event_clusters';
  try {
    const q = query(getColl(path), where('status', '==', status), orderBy('start_date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventCluster));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

// --- Categories ---

export const getCategories = async () => {
  const path = 'categories';
  try {
    const snapshot = await getDocs(getColl(path));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

// --- AI Reports ---

export const getAIReports = async (limitCount = 10) => {
  const path = 'ai_reports';
  try {
    const q = query(getColl(path), orderBy('generated_at', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIReport));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

// --- Sources ---

export const getSources = async (isActiveOnly = false) => {
  const path = 'sources';
  try {
    const constraints = isActiveOnly ? [where('is_active', '==', true)] : [];
    const q = query(getColl(path), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Source));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

export const updateSourceStatus = async (id: string, isActive: boolean) => {
  const path = 'sources';
  try {
    await updateDoc(getDocRef(path, id), { is_active: isActive });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const addSource = async (source: Omit<Source, 'id'>) => {
  const path = 'sources';
  try {
    const docRef = await addDoc(getColl(path), source);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const deleteSource = async (id: string) => {
  const path = 'sources';
  try {
    await deleteDoc(getDocRef(path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
};

// --- Real-time Listeners ---

export const subscribeToArticles = (callback: (articles: Article[]) => void, limitCount = 50) => {
  const path = 'articles';
  try {
    const q = query(getColl(path), orderBy('published_at', 'desc'), limit(limitCount));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  } catch (error) {
    console.error('Failed to subscribe to articles:', error);
    return () => {};
  }
};
