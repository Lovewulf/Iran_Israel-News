import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import fs from 'fs';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Load firebase-applet-config.json if it exists
  let appletConfig = {};
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      console.log('[Vite] Loading firebase-applet-config.json from:', configPath);
      appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
      console.warn('[Vite] firebase-applet-config.json NOT FOUND at:', configPath);
    }
  } catch (e) {
    console.warn('[Vite] Failed to load firebase-applet-config.json', e);
  }

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.YOUTUBE_API_KEY': JSON.stringify(env.YOUTUBE_API_KEY),
      'process.env.NEWS_API_KEY': JSON.stringify(env.NEWS_API_KEY),
      'process.env.NEXT_PUBLIC_FIREBASE_API_KEY': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_API_KEY),
      'process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
      'process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
      'process.env.NEXT_PUBLIC_FIREBASE_APP_ID': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_APP_ID),
      'process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID': JSON.stringify(env.NEXT_PUBLIC_FIREBASE_DATABASE_ID),
      'process.env.FIREBASE_WEBAPP_CONFIG': JSON.stringify(env.FIREBASE_WEBAPP_CONFIG),
      'process.env.FIREBASE_CONFIG': JSON.stringify(env.FIREBASE_CONFIG),
      'process.env.GOOGLE_APPLICATION_CREDENTIALS': JSON.stringify(env.GOOGLE_APPLICATION_CREDENTIALS),
      'process.env.FIREBASE_APPLET_CONFIG': JSON.stringify(appletConfig),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
