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
app.use(express.static(__dirname));

// ========== Test endpoint to verify Groq API is working ==========
app.get('/api/test-ai', async (req, res) => {
  console.log('🧪 Test endpoint called');
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    console.error('❌ GROQ_API_KEY is missing');
    return res.status(500).json({ error: 'GROQ_API_KEY not set' });
  }
  console.log('✅ GROQ_API_KEY is present (first 10 chars):', groqApiKey.substring(0, 10) + '...');

  const groq = new Groq({ apiKey: groqApiKey });
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 10,
    });
    const reply = chatCompletion.choices[0]?.message?.content || '';
    console.log('✅ Test successful, Groq replied:', reply);
    res.json({ success: true, reply });
  } catch (error: any) {
    console.error('❌ Test failed:', error.message || error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== Groq AI Endpoint (with detailed logging) ==========
app.post('/api/generate-report', async (req, res) => {
  console.log('📥 [1/6] Received /api/generate-report request at', new Date().toISOString());

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    console.error('❌ [2/6] GROQ_API_KEY is not set in environment');
    return res.status(500).json({ error: 'GROQ_API_KEY not configured. Please set it in Render environment.' });
  }
  console.log('✅ [2/6] GROQ_API_KEY found (first 6 chars):', groqApiKey.substring(0, 6) + '...');

  const groq = new Groq({ apiKey: groqApiKey });
  console.log('✅ [3/6] Groq client initialized');

  try {
    const { prompt } = req.body;
    if (!prompt) {
      console.error('❌ [4/6] Missing prompt in request body');
      return res.status(400).json({ error: 'Prompt is required' });
    }
    console.log(`✅ [4/6] Prompt received, length: ${prompt.length} characters`);

    console.log('🤖 [5/6] Calling Groq API with model: llama-3.3-70b-versatile...');
    const startTime = Date.now();
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert geopolitical intelligence analyst. Provide concise, factual, and structured reports based on the news provided.'
        },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 1500,
    });
    const elapsed = Date.now() - startTime;
    console.log(`✅ [6/6] Groq API responded in ${elapsed}ms`);

    const text = chatCompletion.choices[0]?.message?.content || '';
    if (!text) {
      throw new Error('Empty response from Groq');
    }
    console.log(`✅ Report generated, length: ${text.length} characters`);

    res.json({ content: text });
  } catch (error: any) {
    console.error('❌ Error in /api/generate-report:', error);
    // Log the full error object for debugging
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    // Provide user-friendly message
    if (error.message?.includes('API key')) {
      res.status(401).json({ error: 'Invalid Groq API key. Please check your credentials.' });
    } else if (error.message?.includes('rate') || error.message?.includes('quota')) {
      res.status(429).json({ error: 'Groq API rate limit reached. Please try again later.' });
    } else if (error.message?.includes('model')) {
      res.status(400).json({ error: 'Model error: ' + error.message });
    } else {
      res.status(500).json({ error: error.message || 'Failed to generate content' });
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
    res.status(500).json({
      success: false,
      message: 'Ingestion failed',
      error: error instanceof Error ? error.message : String(error),
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
(async () => {
  console.log('🚀 Running initial ingestion on server start...');
  try {
    const result = await runFullIngestion();
    console.log(`✅ Initial ingestion added ${result.totalAdded} articles.`);
  } catch (err) {
    console.error('❌ Initial ingestion failed:', err);
  }
})();

setInterval(async () => {
  console.log('⏰ Scheduled ingestion running...');
  try {
    const result = await runFullIngestion();
    console.log(`✅ Scheduled ingestion added ${result.totalAdded} new articles.`);
  } catch (err) {
    console.error('❌ Scheduled ingestion failed:', err);
  }
}, 15 * 60 * 1000);
console.log(`⏲️ Scheduled ingestion will run every 15 minutes.`);

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📍 Health: http://localhost:${port}/api/health`);
  console.log(`📍 Test AI: http://localhost:${port}/api/test-ai`);
  console.log(`📍 Ingestion: POST http://localhost:${port}/api/ingest (manual)`);
  console.log(`📍 AI reports: POST http://localhost:${port}/api/generate-report`);
});
