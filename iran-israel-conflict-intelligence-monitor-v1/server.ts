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
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🤖 Generating AI report...');
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
    if (!text) throw new Error('Empty response');

    console.log('✅ Report generated');
    res.json({ content: text });
  } catch (error) {
    console.error('❌ Error:', error);
    // Safely handle unknown error type
    let errorMessage = 'Unknown error';
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      errorMessage = error.message;
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
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      errorMessage = error.message;
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
  } catch (err) { console.error('❌ Failed'); }
})();

setInterval(async () => {
  console.log('⏰ Scheduled ingestion...');
  try {
    const result = await runFullIngestion();
    console.log(`✅ Added ${result.totalAdded} articles.`);
  } catch (err) { console.error('❌ Failed'); }
}, 15 * 60 * 1000);

app.listen(port, () => console.log(`✅ Server on port ${port}`));
