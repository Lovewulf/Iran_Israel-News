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
app.use(express.json({ limit: '10mb' })); // Allow larger prompts
app.use(express.static(__dirname));

// Test endpoint
app.get('/api/test-ai', async (req, res) => {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) return res.status(500).json({ error: 'GROQ_API_KEY not set' });
  const groq = new Groq({ apiKey: groqApiKey });
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 10,
    });
    res.json({ success: true, reply: chatCompletion.choices[0]?.message?.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Main AI endpoint
app.post('/api/generate-report', async (req, res) => {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    console.error('GROQ_API_KEY missing');
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  const groq = new Groq({ apiKey: groqApiKey });
  
  try {
    let { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Truncate prompt if too long (Groq has ~8k token limit; ~30k chars safe)
    const MAX_PROMPT_LENGTH = 25000;
    if (prompt.length > MAX_PROMPT_LENGTH) {
      console.log(`Prompt too long (${prompt.length} chars), truncating...`);
      prompt = prompt.substring(0, MAX_PROMPT_LENGTH) + '... (truncated)';
    }

    console.log(`Generating report with prompt length: ${prompt.length} chars`);

    // Set a timeout for the request (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const chatCompletion = await groq.chat.completions.create(
      {
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
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);
    const text = chatCompletion.choices[0]?.message?.content || '';
    if (!text) throw new Error('Empty response from Groq');

    console.log(`Report generated, length: ${text.length} chars`);
    res.json({ content: text });
  } catch (error) {
    console.error('Groq API error:', error);
    if (error.name === 'AbortError') {
      res.status(504).json({ error: 'Request timeout. The report took too long to generate.' });
    } else if (error.message?.includes('rate') || error.message?.includes('quota')) {
      res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    } else {
      res.status(500).json({ error: error.message || 'Failed to generate content' });
    }
  }
});

// Ingestion endpoint
app.post('/api/ingest', async (req, res) => {
  try {
    console.log('Manual ingestion triggered');
    const result = await runFullIngestion();
    res.json({ success: true, totalAdded: result.totalAdded });
  } catch (error) {
    console.error('Ingestion failed:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Scheduled ingestion
(async () => {
  console.log('Running initial ingestion...');
  try {
    const result = await runFullIngestion();
    console.log(`Initial ingestion added ${result.totalAdded} articles.`);
  } catch (err) {
    console.error('Initial ingestion failed:', err);
  }
})();

setInterval(async () => {
  console.log('Scheduled ingestion running...');
  try {
    const result = await runFullIngestion();
    console.log(`Scheduled ingestion added ${result.totalAdded} new articles.`);
  } catch (err) {
    console.error('Scheduled ingestion failed:', err);
  }
}, 15 * 60 * 1000);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
