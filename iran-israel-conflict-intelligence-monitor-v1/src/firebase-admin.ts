import admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { ENV, firebaseAdminStatus } from './config/env';

let _adminApp: admin.app.App | null = null;
let _adminDb: Firestore | null = null;

/**
 * Initializes Firebase Admin SDK safely.
 * Returns null if configuration is missing.
 */
export const getAdminAppSafe = (): admin.app.App | null => {
  if (!firebaseAdminStatus.isValid) return null;
  
  if (admin.apps.length > 0) return admin.app();

  if (!_adminApp) {
    const projectId = ENV.ADMIN.PROJECT_ID;
    const clientEmail = ENV.ADMIN.CLIENT_EMAIL;
    const privateKey = ENV.ADMIN.PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      console.log(`Initializing Firebase Admin for project: ${projectId} using explicit credentials.`);
      _adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId
      });
    } else {
      // Fallback to ADC (Application Default Credentials)
      console.log('Initializing Firebase Admin using Application Default Credentials (ADC).');
      _adminApp = admin.initializeApp({
        projectId: projectId || process.env.GOOGLE_CLOUD_PROJECT,
      });
    }
  }
  return _adminApp;
};

/**
 * Safely gets the Admin Firestore instance.
 * Returns null if configuration is missing.
 */
export const getAdminDbSafe = (): Firestore | null => {
  const app = getAdminAppSafe();
  if (!app) return null;
  
  if (!_adminDb) {
    _adminDb = getFirestore(app);
    _adminDb.settings({ ignoreUndefinedProperties: true });
  }
  return _adminDb;
};

// Export instances for convenience, but they might be null
export const adminDb = getAdminDbSafe();
export const adminAuth = getAdminAppSafe()?.auth();
export { admin };
