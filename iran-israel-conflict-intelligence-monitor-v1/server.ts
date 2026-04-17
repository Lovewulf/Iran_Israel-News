import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import { runFullIngestion } from './src/services/ingestionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the same directory where server.js lives (which is dist/)
app.use(express.static(__dirname));

// Gemini AI endpoint (with robust error handling)
app.post('/api/generate-report', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set in environment');
    return res.status(500).json({ error: 'Gemini API key not configured. Please set GEMINI_API_KEY in Render environment.' });
  }

  let genAI;
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (err) {
    console.error('❌ Failed to initialize Gemini AI:', err);
    return res.status(500).json({ error: 'Gemini AI initialization failed.' });
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🤖 Generating AI report...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ AI report generated successfully');
    res.json({ content: text });
  } catch (error: any) {
    console.error('❌ Error generating content:', error);
    // Provide more specific error messages based on error type
    if (error.message?.includes('API key')) {
      res.status(401).json({ error: 'Invalid Gemini API key. Please check your credentials.' });
    } else if (error.message?.includes('quota')) {
      res.status(429).json({ error: 'Gemini API quota exceeded. Please try again later.' });
    } else {
      res.status(500).json({ error: error.message || 'Failed to generate content' });
    }
  }
});

// Ingestion endpoint (manual trigger)
app.post('/api/ingest', async (req, res) => {
  try {
    console.log('🔄 Manual ingestion triggered at', new Date().toISOString());
    const result = await runFullIngestion();
    res.json({
      success: true,
      message: 'Ingestion completed successfully',
      totalAdded: result.totalAdded,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    res.status(500).json({
      success: false,
      message: 'Ingestion failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== AUTOMATIC SCHEDULED INGESTION ==========
// Run once on startup to populate database immediately
(async () => {
  console.log('🚀 Running initial ingestion on server start...');
  try {
    const result = await runFullIngestion();
    console.log(`✅ Initial ingestion added ${result.totalAdded} articles.`);
  } catch (err) {
    console.error('❌ Initial ingestion failed:', err);
  }
})();

// Schedule ingestion every 15 minutes (900,000 ms)
const INGESTION_INTERVAL_MS = 15 * 60 * 1000;
setInterval(async () => {
  console.log('⏰ Scheduled ingestion running...');
  try {
    const result = await runFullIngestion();
    console.log(`✅ Scheduled ingestion added ${result.totalAdded} new articles.`);
  } catch (err) {
    console.error('❌ Scheduled ingestion failed:', err);
  }
}, INGESTION_INTERVAL_MS);

console.log(`⏲️ Scheduled ingestion will run every ${INGESTION_INTERVAL_MS / 60000} minutes.`);

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📍 Health: http://localhost:${port}/api/health`);
  console.log(`📍 Ingestion: POST http://localhost:${port}/api/ingest (manual)`);
});
