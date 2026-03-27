import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore, collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, onSnapshot, getDocFromServer, Timestamp } from 'firebase/firestore';
import { ENV, firebaseClientStatus } from './config/env';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

/**
 * Safely gets or initializes the Firebase App.
 * Returns null if configuration is missing.
 */
export const getFirebaseAppSafe = (): FirebaseApp | null => {
  if (!firebaseClientStatus.isValid) {
    console.warn("Firebase client configuration is invalid or missing. Some features will be disabled.");
    return null;
  }
  
  if (getApps().length > 0) return getApp();
  
  if (!_app) {
    try {
      const firebaseConfig = {
        apiKey: ENV.FIREBASE.API_KEY,
        authDomain: ENV.FIREBASE.AUTH_DOMAIN,
        projectId: ENV.FIREBASE.PROJECT_ID,
        storageBucket: ENV.FIREBASE.STORAGE_BUCKET,
        messagingSenderId: ENV.FIREBASE.MESSAGING_SENDER_ID,
        appId: ENV.FIREBASE.APP_ID,
      };
      
      const maskedKey = firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 4)}...${firebaseConfig.apiKey.slice(-4)}` : 'MISSING';
      console.log(`[Firebase] Initializing App:`, {
        projectId: firebaseConfig.projectId,
        apiKey: maskedKey,
        source: firebaseClientStatus.sourceUsed
      });
      
      _app = initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Failed to initialize Firebase App:", error);
      return null;
    }
  }
  return _app;
};

/**
 * Safely gets the Firestore instance.
 * Returns null if configuration is missing.
 */
export const getDbSafe = (forceDefault = false): Firestore | null => {
  const firebaseApp = getFirebaseAppSafe();
  if (!firebaseApp) return null;
  
  if (!_db || forceDefault) {
    const databaseId = forceDefault ? undefined : ENV.FIREBASE.DATABASE_ID;
    console.log(`[Firebase] Initializing Firestore with databaseId: ${databaseId || '(default)'}`);
    try {
      const newDb = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true
      }, databaseId);
      
      if (forceDefault) {
        _db = newDb;
      } else {
        _db = _db || newDb;
      }
    } catch (error) {
      console.error(`[Firebase] Firestore initialization failed with databaseId: ${databaseId || '(default)'}`, error);
      if (!forceDefault) {
        return getDbSafe(true);
      }
      return null;
    }
  }
  return _db;
};

/**
 * Safely gets the Auth instance.
 * Returns null if configuration is missing or invalid.
 */
export const getAuthSafe = (): Auth | null => {
  const firebaseApp = getFirebaseAppSafe();
  if (!firebaseApp || !ENV.FIREBASE.API_KEY || ENV.FIREBASE.API_KEY.includes('TODO')) return null;
  
  if (!_auth) {
    _auth = getAuth(firebaseApp);
  }
  return _auth;
};

// Export instances for convenience, but they might be null
export const db = getDbSafe();
export const auth = getAuthSafe();
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const signInWithGoogle = async () => {
  const firebaseAuth = getAuthSafe();
  if (!firebaseAuth) throw new Error("Firebase Auth is not configured.");
  return signInWithPopup(firebaseAuth, googleProvider);
};

export const logout = async () => {
  const firebaseAuth = getAuthSafe();
  if (firebaseAuth) return firebaseAuth.signOut();
};

// Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const firebaseAuth = getAuthSafe();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth?.currentUser?.uid,
      email: firebaseAuth?.currentUser?.email,
      emailVerified: firebaseAuth?.currentUser?.emailVerified,
      isAnonymous: firebaseAuth?.currentUser?.isAnonymous,
      tenantId: firebaseAuth?.currentUser?.tenantId,
      providerInfo: firebaseAuth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import { seedInitialData } from './services/seedService';

// Connection Test
async function testConnection() {
  const firestore = getDbSafe();
  if (!firestore) {
    console.warn("[Firebase] Skipping connection test: Firestore not initialized.");
    return;
  }
  
  console.log("[Firebase] Testing connection to Firestore...");
  try {
    // Try to get a non-existent doc to test connectivity
    await getDocFromServer(doc(firestore, '_internal_', 'connectivity_test'));
    console.log("[Firebase] Connection test: SUCCESS (Server reachable and document read).");
    
    // Trigger initial seeding if reachable
    seedInitialData().catch(err => console.error("[Firebase] Initial seeding failed:", err));
  } catch (error) {
    if (error instanceof Error && error.message.includes('insufficient permissions')) {
      console.log("[Firebase] Connection test: SUCCESS (Server reachable, but permissions denied - this is expected for unauthenticated users).");
      // Still try to seed, as the rules for seeding might be different (e.g. isAdmin check)
      seedInitialData().catch(err => console.error("[Firebase] Initial seeding failed:", err));
      return;
    }
    
    console.error("[Firebase] Connection test error:", error);
    if(error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('Could not reach Cloud Firestore'))) {
      console.warn("[Firebase] Client is offline or could not reach Firestore. Attempting fallback to default database...");
      
      const defaultDb = getDbSafe(true);
      if (defaultDb) {
        try {
          await getDocFromServer(doc(defaultDb, '_internal_', 'connectivity_test'));
          console.log("[Firebase] Successfully connected to default database.");
          seedInitialData().catch(err => console.error("[Firebase] Initial seeding failed on fallback:", err));
        } catch (fallbackError) {
          if (fallbackError instanceof Error && fallbackError.message.includes('insufficient permissions')) {
            console.log("[Firebase] Fallback connection test: SUCCESS (Server reachable, but permissions denied).");
            return;
          }
          console.error("[Firebase] Fallback connection test failed:", fallbackError);
        }
      }
    }
  }
}

if (firebaseClientStatus.isValid) {
  testConnection();
}

export { collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, onSnapshot, Timestamp };
