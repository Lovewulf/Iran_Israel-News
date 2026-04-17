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

// ========== Groq AI Endpoint ==========
app.post('/api/generate-report', async (req, res) => {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    console.error('❌ GROQ_API_KEY is not set');
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  const groq = new Groq({ apiKey: groqApiKey });

  try {
    let { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Truncate prompt to avoid token limits
    if (prompt.length > 4000) {
      console.log(`⚠️ Prompt too long (${prompt.length} chars), truncating to 4000`);
      prompt = prompt.substring(0, 4000);
    }

    console.log(`🤖 Generating report (prompt length: ${prompt.length})...`);
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert geopolitical intelligence analyst.' },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 1500,
    });

    const text = chatCompletion.choices[0]?.message?.content || '';
    if (!text) throw new Error('Empty response from Groq');

    console.log('✅ Report generated');
    res.json({ content: text });
  } catch (error) {
    console.error('❌ Groq API error:', error);
    // Safe error message extraction – works with any error type
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      // Try to get message property if it exists
      const maybeMessage = (error as any).message;
      if (typeof maybeMessage === 'string') errorMessage = maybeMessage;
    }
    res.status(500).json({ error: errorMessage });
  }
});

// ========== Ingestion endpoint ==========
app.post('/api/ingest', async (req, res) => {
  try {
    console.log('🔄 Manual ingestion');
    const result = await runFullIngestion();
    res.json({ success: true, totalAdded: result.totalAdded });
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    let errorMessage = 'Unknown error';
    if (error instanceof Error) errorMessage = error.message;
    else if (typeof error === 'string') errorMessage = error;
    else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
      errorMessage = (error as any).message;
    }
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// ========== Health check ==========
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ========== Serve React app ==========
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== Scheduled ingestion ==========
(async () => {
  console.log('🚀 Initial ingestion...');
  try {
    const result = await runFullIngestion();
    console.log(`✅ Added ${result.totalAdded} articles.`);
  } catch (err) { console.error('❌ Initial ingestion failed'); }
})();

setInterval(async () => {
  console.log('⏰ Scheduled ingestion...');
  try {
    const result = await runFullIngestion();
    console.log(`✅ Added ${result.totalAdded} articles.`);
  } catch (err) { console.error('❌ Scheduled ingestion failed'); }
}, 15 * 60 * 1000);

app.listen(port, () => console.log(`✅ Server running on port ${port}`));
