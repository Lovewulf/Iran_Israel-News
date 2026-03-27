import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { getDbSafe, handleFirestoreError, OperationType } from '../firebase';
import { Article, EventCluster, Category, AIReport, Source } from '../types';

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

/**
 * In-memory date sorting helper.
 */
const sortByPublishedDesc = <T extends { published_at?: any }>(items: T[]) => {
  return [...items].sort((a, b) => {
    const aMs = a?.published_at?.toDate?.()?.getTime?.() ?? 0;
    const bMs = b?.published_at?.toDate?.()?.getTime?.() ?? 0;
    return bMs - aMs;
  });
};

const sortByGeneratedDesc = <T extends { generated_at?: any }>(items: T[]) => {
  return [...items].sort((a, b) => {
    const aMs = a?.generated_at?.toDate?.()?.getTime?.() ?? 0;
    const bMs = b?.generated_at?.toDate?.()?.getTime?.() ?? 0;
    return bMs - aMs;
  });
};

const sortByClusterStartDesc = <T extends { start_date?: any }>(items: T[]) => {
  return [...items].sort((a, b) => {
    const aMs = a?.start_date?.toDate?.()?.getTime?.() ?? 0;
    const bMs = b?.start_date?.toDate?.()?.getTime?.() ?? 0;
    return bMs - aMs;
  });
};

/**
 * Checks for an existing article by fingerprint or url.
 * Prevents duplicate writes on repeated refreshes.
 */
const findExistingArticle = async (article: Pick<Article, 'fingerprint' | 'url'>) => {
  const path = 'articles';

  try {
    if (article.fingerprint) {
      const byFingerprint = query(
        getColl(path),
        where('fingerprint', '==', article.fingerprint),
        limit(1)
      );
      const fingerprintSnap = await getDocs(byFingerprint);
      if (!fingerprintSnap.empty) {
        return fingerprintSnap.docs[0].id;
      }
    }

    if (article.url) {
      const byUrl = query(
        getColl(path),
        where('url', '==', article.url),
        limit(1)
      );
      const urlSnap = await getDocs(byUrl);
      if (!urlSnap.empty) {
        return urlSnap.docs[0].id;
      }
    }

    return null;
  } catch (error) {
    console.warn('[Firestore] Duplicate-check failed, continuing to normal write path:', error);
    return null;
  }
};

// --- Articles ---

export const getArticles = async (limitCount = 50, constraints: QueryConstraint[] = []) => {
  const path = 'articles';

  try {
    const q = query(
      getColl(path),
      orderBy('published_at', 'desc'),
      limit(limitCount),
      ...constraints
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Article));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};

export const getBreakingNews = async (limitCount = 5) => {
  try {
    return await getArticles(limitCount, [where('is_breaking', '==', true)]);
  } catch (error) {
    console.warn('[Firestore] Breaking news query failed, falling back to latest articles:', error);
    return getArticles(limitCount);
  }
};

export const addArticle = async (article: Omit<Article, 'id' | 'ingested_at'>) => {
  const path = 'articles';

  try {
    const existingId = await findExistingArticle({
      fingerprint: article.fingerprint,
      url: article.url,
    });

    if (existingId) {
      return existingId;
    }

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
    const q = query(
      getColl(path),
      where('status', '==', status),
      orderBy('start_date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as EventCluster));
  } catch (error) {
    console.warn('[Firestore] Indexed event cluster query failed, falling back to simpler query:', error);

    try {
      const fallbackQ = query(getColl(path), where('status', '==', status));
      const snapshot = await getDocs(fallbackQ);
      const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as EventCluster));
      return sortByClusterStartDesc(items);
    } catch (fallbackError) {
      handleFirestoreError(fallbackError, OperationType.LIST, path);
      throw fallbackError;
    }
  }
};

// --- Categories ---

export const getCategories = async () => {
  const path = 'categories';

  try {
    const snapshot = await getDocs(getColl(path));
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Category));
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
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as AIReport));
  } catch (error) {
    console.warn('[Firestore] Indexed AI report query failed, falling back to unsorted fetch:', error);

    try {
      const snapshot = await getDocs(getColl(path));
      const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as AIReport));
      return sortByGeneratedDesc(items).slice(0, limitCount);
    } catch (fallbackError) {
      handleFirestoreError(fallbackError, OperationType.LIST, path);
      throw fallbackError;
    }
  }
};

// --- Sources ---

export const getSources = async (isActiveOnly = false) => {
  const path = 'sources';

  try {
    const constraints = isActiveOnly ? [where('is_active', '==', true)] : [];
    const q = query(getColl(path), ...constraints);
    const snapshot = await getDocs(q);

    const sources = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Source));

    // Prefer verified + active first in UI consumers
    return sources.sort((a, b) => {
      const aScore = (a.is_verified ? 2 : 0) + (a.is_active ? 1 : 0);
      const bScore = (b.is_verified ? 2 : 0) + (b.is_active ? 1 : 0);
      return bScore - aScore;
    });
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
    throw error;
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

export const subscribeToArticles = (
  callback: (articles: Article[]) => void,
  limitCount = 50
) => {
  const path = 'articles';

  try {
    const q = query(getColl(path), orderBy('published_at', 'desc'), limit(limitCount));

    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Article));
        callback(sortByPublishedDesc(items));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    console.error('[Firestore] Failed to subscribe to articles:', error);
    return () => {};
  }
};
