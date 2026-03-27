/**
 * Environment variable configuration and validation.
 * Ensures all required variables are present and provides a single source of truth.
 */

import firebaseAppletConfig from '../../firebase-applet-config.json';

const getEnv = (key: string, defaultValue?: string): string => {
  // Static access for Vite define replacements (crucial for browser builds)
  let value: any;
  if (key === 'NEXT_PUBLIC_FIREBASE_API_KEY') value = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  else if (key === 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') value = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  else if (key === 'NEXT_PUBLIC_FIREBASE_PROJECT_ID') value = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  else if (key === 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') value = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  else if (key === 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') value = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  else if (key === 'NEXT_PUBLIC_FIREBASE_APP_ID') value = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  else if (key === 'NEXT_PUBLIC_FIREBASE_DATABASE_ID') value = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID;
  else if (key === 'FIREBASE_WEBAPP_CONFIG') value = process.env.FIREBASE_WEBAPP_CONFIG;
  else if (key === 'FIREBASE_CONFIG') value = process.env.FIREBASE_CONFIG;
  else if (key === 'FIREBASE_APPLET_CONFIG') value = process.env.FIREBASE_APPLET_CONFIG;
  else if (key === 'GEMINI_API_KEY') value = process.env.GEMINI_API_KEY;
  else if (key === 'YOUTUBE_API_KEY') value = process.env.YOUTUBE_API_KEY;
  else if (key === 'NEWS_API_KEY') value = process.env.NEWS_API_KEY;
  else if (key === 'GOOGLE_APPLICATION_CREDENTIALS') value = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  else if (key === 'NODE_ENV') value = process.env.NODE_ENV;

  if (value === undefined || value === 'undefined' || value === null || value === 'NOT_CONFIGURED') {
    value = (import.meta as any).env?.[key] || (typeof process !== 'undefined' ? process.env[key] : undefined);
  }

  if (value === undefined || value === 'undefined' || value === null || value === 'NOT_CONFIGURED') {
    return defaultValue || '';
  }

  return String(value);
};

/**
 * Resolves Firebase configuration from multiple possible sources.
 */
export const resolveFirebaseConfig = () => {
  const sources = {
    next_public: {
      apiKey: getEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
      authDomain: getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
      projectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
      storageBucket: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
      databaseId: getEnv('NEXT_PUBLIC_FIREBASE_DATABASE_ID'),
    },
    firebase_webapp_config: null as any,
    firebase_config: null as any,
    firebase_applet_config: firebaseAppletConfig,
  };
  
  // Check FIREBASE_APPLET_CONFIG override
  const appletConfigRaw = getEnv('FIREBASE_APPLET_CONFIG');
  if (appletConfigRaw && appletConfigRaw !== JSON.stringify(firebaseAppletConfig)) {
    try {
      sources.firebase_applet_config = typeof appletConfigRaw === 'string' ? JSON.parse(appletConfigRaw) : appletConfigRaw;
    } catch (e) {
      console.warn('Failed to parse FIREBASE_APPLET_CONFIG override', e);
    }
  }

  // Check FIREBASE_WEBAPP_CONFIG
  const webappConfigRaw = getEnv('FIREBASE_WEBAPP_CONFIG');
  if (webappConfigRaw) {
    try {
      sources.firebase_webapp_config = JSON.parse(webappConfigRaw);
    } catch (e) {
      console.warn('Failed to parse FIREBASE_WEBAPP_CONFIG', e);
    }
  }

  // Check FIREBASE_CONFIG
  const firebaseConfigRaw = getEnv('FIREBASE_CONFIG');
  if (firebaseConfigRaw) {
    try {
      sources.firebase_config = JSON.parse(firebaseConfigRaw);
    } catch (e) {
      console.warn('Failed to parse FIREBASE_CONFIG', e);
    }
  }

  // Resolution logic: Prefer NEXT_PUBLIC, then FIREBASE_WEBAPP_CONFIG, then FIREBASE_CONFIG
  const isConfigValid = (c: any) => {
    return c && 
           c.apiKey && !c.apiKey.includes('TODO') && 
           c.authDomain && !c.authDomain.includes('TODO') && 
           c.projectId && !c.projectId.includes('TODO') && 
           c.appId && !c.appId.includes('TODO');
  };

  const getMissingFields = (c: any) => {
    const fields = ['apiKey', 'authDomain', 'projectId', 'appId'];
    const missing = fields.filter(f => !c || !c[f] || (typeof c[f] === 'string' && c[f].includes('TODO')));
    return missing.map(f => `FIREBASE_${f.toUpperCase()}`);
  };

  let resolved: any = sources.firebase_applet_config;
  let sourceUsed = 'firebase_applet_config';

  if (!isConfigValid(resolved)) {
    resolved = sources.next_public;
    sourceUsed = 'next_public';

    if (!isConfigValid(resolved)) {
      if (isConfigValid(sources.firebase_webapp_config)) {
        resolved = sources.firebase_webapp_config;
        sourceUsed = 'firebase_webapp_config';
      } else if (isConfigValid(sources.firebase_config)) {
        resolved = sources.firebase_config;
        sourceUsed = 'firebase_config';
      }
    }
  }

  // Map firestoreDatabaseId to databaseId for consistency
  if (resolved && !resolved.databaseId && resolved.firestoreDatabaseId) {
    resolved.databaseId = resolved.firestoreDatabaseId;
  }

  console.log(`[Env] Resolved Firebase Config from: ${sourceUsed}`, {
    projectId: resolved.projectId,
    databaseId: resolved?.databaseId || '(default)',
    isValid: isConfigValid(resolved)
  });

  return {
    config: resolved,
    sourceUsed,
    isValid: isConfigValid(resolved),
    missingFields: isConfigValid(resolved) ? [] : getMissingFields(resolved),
    sources
  };
};

const resolvedFirebase = resolveFirebaseConfig();

export const ENV = {
  // Firebase Frontend (Public)
  FIREBASE: {
    API_KEY: resolvedFirebase.config.apiKey,
    AUTH_DOMAIN: resolvedFirebase.config.authDomain,
    PROJECT_ID: resolvedFirebase.config.projectId,
    STORAGE_BUCKET: resolvedFirebase.config.storageBucket,
    MESSAGING_SENDER_ID: resolvedFirebase.config.messagingSenderId,
    APP_ID: resolvedFirebase.config.appId,
    DATABASE_ID: resolvedFirebase.config.databaseId,
  },

  // Firebase Admin (Server-side)
  ADMIN: {
    PROJECT_ID: getEnv('FIREBASE_PROJECT_ID') || getEnv('GOOGLE_CLOUD_PROJECT'),
    CLIENT_EMAIL: getEnv('FIREBASE_CLIENT_EMAIL'),
    PRIVATE_KEY: getEnv('FIREBASE_PRIVATE_KEY'),
    CREDENTIALS_PATH: getEnv('GOOGLE_APPLICATION_CREDENTIALS'),
  },

  // App Settings
  APP: {
    ADMIN_EMAILS: getEnv('APP_ADMIN_EMAILS', 'ashirazk60@gmail.com').split(',').map(e => e.trim()),
    DEFAULT_POLL_INTERVAL: parseInt(getEnv('DEFAULT_POLL_INTERVAL_SECONDS', '300'), 10),
    ENABLE_FULL_MIRROR: getEnv('ENABLE_FULL_MIRROR_FOR_LICENSED_SOURCES', 'false') === 'true',
  },

  // API Keys
  KEYS: {
    GEMINI: getEnv('GEMINI_API_KEY'),
    YOUTUBE: getEnv('YOUTUBE_API_KEY'),
    NEWS: getEnv('NEWS_API_KEY'),
  },

  // Environment
  IS_PROD: getEnv('NODE_ENV') === 'production',
  IS_DEV: getEnv('NODE_ENV') !== 'production',
};

/**
 * Checks if a valid Firebase client configuration is available from any source.
 */
export const getFirebaseClientStatus = () => {
  const resolved = resolveFirebaseConfig();
  
  return {
    isValid: resolved.isValid,
    sourceUsed: resolved.sourceUsed,
    missing: resolved.missingFields,
    hasWebappConfig: !!resolved.sources.firebase_webapp_config,
    hasFirebaseConfig: !!resolved.sources.firebase_config,
    resolvedProjectId: resolved.config.projectId,
  };
};

/**
 * Provides a masked audit of the environment variables for diagnostics.
 */
export const getEnvAudit = () => {
  const keys = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'FIREBASE_WEBAPP_CONFIG',
    'FIREBASE_CONFIG',
    'FIREBASE_APPLET_CONFIG',
    'GEMINI_API_KEY',
    'YOUTUBE_API_KEY',
    'NEWS_API_KEY',
    'GOOGLE_APPLICATION_CREDENTIALS',
  ];

  const audit: Record<string, any> = {};

  keys.forEach(key => {
    const rawValue = getEnv(key);
    
    audit[key] = {
      present: rawValue !== '',
      type: typeof rawValue,
      isEmpty: rawValue === '',
      isPlaceholder: typeof rawValue === 'string' && (rawValue.includes('TODO') || rawValue.includes('YOUR_')),
      maskedValue: (typeof rawValue === 'string' && rawValue.length > 8) 
        ? `${rawValue.slice(0, 4)}...${rawValue.slice(-4)}` 
        : (rawValue ? '***' : null),
    };
  });

  return audit;
};

/**
 * Checks if the minimal required Firebase Admin variables are present.
 */
export const getFirebaseAdminStatus = () => {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];

  const missing = required.filter(key => !getEnv(key) && (key !== 'FIREBASE_PROJECT_ID' || !getEnv('GOOGLE_CLOUD_PROJECT')));
  
  return {
    isValid: missing.length === 0 || !!getEnv('GOOGLE_APPLICATION_CREDENTIALS'),
    missing
  };
};

export const firebaseClientStatus = getFirebaseClientStatus();
export const firebaseAdminStatus = getFirebaseAdminStatus();
