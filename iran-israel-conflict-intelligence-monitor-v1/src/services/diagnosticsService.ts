import { getDbSafe, getAuthSafe } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, limit, query, doc, getDocFromServer } from 'firebase/firestore';
import { ENV, firebaseClientStatus, firebaseAdminStatus, getEnvAudit } from '../config/env';

export interface DiagnosticResult {
  name: string;
  status: 'ok' | 'error' | 'warning';
  message: string;
  details?: any;
}

/**
 * Runs a comprehensive set of diagnostics to verify the application's configuration and connectivity.
 */
export async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // 0. Environment Audit (Masked)
  const envAudit = getEnvAudit();
  const hasStaleConfig = Object.values(envAudit).some((v: any) => v.isPlaceholder);
  
  results.push({
    name: 'Environment Audit',
    status: hasStaleConfig ? 'warning' : 'ok',
    message: hasStaleConfig 
      ? 'Some environment variables contain placeholder values (TODO/YOUR_).' 
      : 'Environment variables appear to be configured with real values.',
    details: envAudit
  });

  // 1. Firebase Client Environment Validation
  results.push({
    name: 'Firebase Client Config Audit',
    status: firebaseClientStatus.isValid ? 'ok' : 'error',
    message: firebaseClientStatus.isValid 
      ? `Required Firebase variables are present (Source: ${firebaseClientStatus.sourceUsed}).` 
      : `Missing variables: ${firebaseClientStatus.missing.join(', ')}`,
    details: {
      source: firebaseClientStatus.sourceUsed,
      isValid: firebaseClientStatus.isValid,
      hasWebappConfig: firebaseClientStatus.hasWebappConfig,
      hasFirebaseConfig: firebaseClientStatus.hasFirebaseConfig,
      resolvedProjectId: firebaseClientStatus.resolvedProjectId,
      envAudit: envAudit
    }
  });

  // 2. Firebase Admin Environment Validation
  results.push({
    name: 'Firebase Admin Config',
    status: firebaseAdminStatus.isValid ? 'ok' : 'warning',
    message: firebaseAdminStatus.isValid 
      ? 'Required Firebase Admin variables are present.' 
      : `Missing variables: ${firebaseAdminStatus.missing.join(', ')}`,
  });

  // 3. Firebase Project ID
  results.push({
    name: 'Firebase Project ID',
    status: ENV.FIREBASE.PROJECT_ID ? 'ok' : 'error',
    message: `Active Project: ${ENV.FIREBASE.PROJECT_ID || 'Not configured'}`,
  });

  // 4. Auth State
  const auth = getAuthSafe();
  results.push({
    name: 'Authentication Status',
    status: auth?.currentUser ? 'ok' : 'warning',
    message: auth?.currentUser 
      ? `Logged in as ${auth.currentUser.email} (UID: ${auth.currentUser.uid.slice(0, 6)}...)` 
      : auth ? 'Not logged in. Some tests might be skipped.' : 'Auth not initialized (Config missing).',
  });

  // 5. Firestore Read Test (Client-side)
  const db = getDbSafe();
  if (db) {
    try {
      const q = query(collection(db, 'articles'), limit(1));
      await getDocs(q);
      results.push({
        name: 'Firestore Read (Client)',
        status: 'ok',
        message: 'Successfully read from "articles" collection.',
      });
    } catch (error: any) {
      const isPermissionDenied = error.message?.includes('permission-denied');
      results.push({
        name: 'Firestore Read (Client)',
        status: 'error',
        message: isPermissionDenied 
          ? 'PERMISSION_DENIED: Check your Firestore security rules.' 
          : `Read failed: ${error.message}`,
      });
    }
  } else {
    results.push({
      name: 'Firestore Read (Client)',
      status: 'error',
      message: 'Skipped: Firestore not initialized (Config missing).',
    });
  }

  // 6. Firestore Write Test (Client-side)
  if (db && auth?.currentUser) {
    try {
      const testDoc = await addDoc(collection(db, 'diagnostics'), {
        type: 'test_heartbeat',
        message: 'Diagnostic heartbeat write test',
        timestamp: serverTimestamp(),
        userId: auth.currentUser.uid,
        clientSide: true
      });
      results.push({
        name: 'Firestore Write (Client)',
        status: 'ok',
        message: `Successfully wrote heartbeat document (ID: ${testDoc.id.slice(0, 6)}...).`,
      });
    } catch (error: any) {
      const isPermissionDenied = error.message?.includes('permission-denied');
      results.push({
        name: 'Firestore Write (Client)',
        status: 'error',
        message: isPermissionDenied 
          ? 'PERMISSION_DENIED: Check your Firestore security rules.' 
          : `Write failed: ${error.message}`,
      });
    }
  } else {
    results.push({
      name: 'Firestore Write (Client)',
      status: 'warning',
      message: !db ? 'Skipped: Firestore not initialized.' : 'Skipped: User must be logged in to test writes.',
    });
  }

  // 7. Gemini API Configuration
  results.push({
    name: 'Gemini API Configuration',
    status: ENV.KEYS.GEMINI ? 'ok' : 'error',
    message: ENV.KEYS.GEMINI ? 'Gemini API Key is configured.' : 'Gemini API Key is missing (Required for AI features).',
  });

  // 8. Optional API Keys
  results.push({
    name: 'YouTube API',
    status: ENV.KEYS.YOUTUBE ? 'ok' : 'warning',
    message: ENV.KEYS.YOUTUBE ? 'YouTube API Key is configured.' : 'YouTube integration not configured (Disabled).',
  });

  results.push({
    name: 'News API',
    status: ENV.KEYS.NEWS ? 'ok' : 'warning',
    message: ENV.KEYS.NEWS ? 'News API Key is configured.' : 'News API integration not configured (Disabled).',
  });

  results.push({
    name: 'ADC Configuration',
    status: ENV.ADMIN.CREDENTIALS_PATH ? 'ok' : 'warning',
    message: ENV.ADMIN.CREDENTIALS_PATH ? 'ADC path is configured.' : 'ADC path not configured (Optional if individual keys are present).',
  });

  return results;
}

/**
 * Logs a diagnostic event to Firestore.
 */
export async function logDiagnostic(type: string, service: string, operation: string, status: string, message: string, metadata?: any) {
  const db = getDbSafe();
  if (!db) return;
  
  try {
    await addDoc(collection(db, 'diagnostics'), {
      type,
      service,
      operation,
      status,
      message,
      timestamp: serverTimestamp(),
      metadata: metadata || {}
    });
  } catch (error) {
    console.error('Failed to log diagnostic:', error);
  }
}
