import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { runFullIngestion } from './src/services/ingestionService.js';
import Groq from 'groq-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the same directory where server.js lives (which is dist/)
app.use(express.static(__dirname));

// ========== Groq AI Endpoint ==========
app.post('/api/generate-report', async (req, res) => {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    console.error('❌ GROQ_API_KEY is not set in environment');
    return res.status(500).json({ error: 'GROQ_API_KEY not configured. Please set it in Render environment.' });
  }

  const groq = new Groq({ apiKey: groqApiKey });

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🤖 Generating AI report with Groq (llama-3.3-70b-versatile)...');
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert geopolitical intelligence analyst. Provide concise, factual, and structured reports based on the news provided.'
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile', // Updated model
      temperature: 0.5,
      max_tokens: 1500,
    });

    const text = chatCompletion.choices[0]?.message?.content || '';
    if (!text) {
      throw new Error('Empty response from Groq');
    }

    console.log('✅ AI report generated successfully');
    res.json({ content: text });
  } catch (error) {
    console.error('❌ Error generating content with Groq:', error);
    // Safely access error properties by checking the type
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      const errorMessage = error.message;
      if (errorMessage.includes('API key')) {
        res.status(401).json({ error: 'Invalid Groq API key. Please check your credentials.' });
      } else if (errorMessage.includes('rate') || errorMessage.includes('quota')) {
        res.status(429).json({ error: 'Groq API rate limit reached. Please try again later.' });
      } else {
        res.status(500).json({ error: errorMessage || 'Failed to generate content' });
      }
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

// ========== Ingestion endpoint (manual trigger) ==========
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
    const errorMessage = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : String(error);
    res.status(500).json({
      success: false,
      message: 'Ingestion failed',
      error: errorMessage,
    });
  }
});

// ========== Health check ==========
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== Serve React app (catch-all) ==========
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== Automatic Scheduled Ingestion ==========
// Run once on startup
(async () => {
  console.log('🚀 Running initial ingestion on server start...');
  try {
    const result = await runFullIngestion();
    console.log(`✅ Initial ingestion added ${result.totalAdded} articles.`);
  } catch (err) {
    console.error('❌ Initial ingestion failed:', err);
  }
})();

// Schedule ingestion every 15 minutes
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

// ========== Start Server ==========
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📍 Health: http://localhost:${port}/api/health`);
  console.log(`📍 Ingestion: POST http://localhost:${port}/api/ingest (manual)`);
  console.log(`📍 AI reports: POST http://localhost:${port}/api/generate-report (via Groq)`);
});
