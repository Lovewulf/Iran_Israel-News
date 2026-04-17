import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { runFullIngestion } from './src/services/ingestionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the dist directory (after build)
app.use(express.static(path.join(__dirname, 'dist')));

// ============ API Routes ============

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual ingestion trigger
app.post('/api/ingest', async (req, res) => {
  try {
    console.log('🔄 Manual ingestion triggered at', new Date().toISOString());
    const result = await runFullIngestion();
    res.json({
      success: true,
      message: 'Ingestion completed successfully',
      totalAdded: result.totalAdded,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    res.status(500).json({
      success: false,
      message: 'Ingestion failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Optional: Scheduled ingestion endpoint (can be called by cron job)
app.post('/api/ingest/scheduled', async (req, res) => {
  try {
    console.log('⏰ Scheduled ingestion triggered');
    const result = await runFullIngestion();
    res.json({ success: true, totalAdded: result.totalAdded });
  } catch (error) {
    console.error('Scheduled ingestion failed:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Catch-all: serve React app for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Ingestion endpoint: POST http://localhost:${PORT}/api/ingest`);
});
