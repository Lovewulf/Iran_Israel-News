import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { runFullIngestion } from './src/services/ingestionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ========== API Routes ==========
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OpenRouter AI endpoint with fallback models
app.post('/api/generate-report', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY is not set');
    return res.status(500).json({ error: 'OpenRouter API key not configured.' });
  }

  try {
    let { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (prompt.length > 4000) {
      console.log(`⚠️ Prompt truncated from ${prompt.length} to 4000 chars`);
      prompt = prompt.substring(0, 4000);
    }

    // List of free models to try (in order of preference)
    const modelsToTry = [
      'meta-llama/llama-3.2-3b-instruct:free',  // Lightweight, fast, free
      'microsoft/phi-3-mini-128k-instruct:free', // Good for analysis
      'mistralai/mistral-7b-instruct:free',      // Capable 7B model
      'openrouter/free',                         // Auto‑selects best free model
    ];

    let lastError = null;
    for (const model of modelsToTry) {
      try {
        console.log(`🤖 Trying model: ${model}...`);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://iran-israel-news.onrender.com',
            'X-Title': 'Iran-Israel Conflict Monitor',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: 'You are an expert geopolitical intelligence analyst. Provide concise, factual, and structured reports based on the news provided.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.5,
            max_tokens: 1500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || '';
          if (text) {
            console.log(`✅ Report generated using model: ${model}`);
            return res.json({ content: text });
          } else {
            throw new Error('Empty response');
          }
        } else {
          const errorText = await response.text();
          console.warn(`⚠️ Model ${model} failed with ${response.status}: ${errorText.substring(0, 200)}`);
          lastError = { status: response.status, error: errorText };
        }
      } catch (err) {
        console.warn(`⚠️ Model ${model} threw error:`, err.message);
        lastError = err;
      }
    }

    // If all models fail
    console.error('❌ All models failed');
    const errorMessage = lastError?.message || 'All AI models unavailable';
    return res.status(500).json({ error: errorMessage });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/ingest', async (req, res) => {
  try {
    console.log('🔄 Manual ingestion');
    const result = await runFullIngestion();
    res.json({ success: true, totalAdded: result.totalAdded });
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// ========== Static Frontend ==========
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== Scheduled Ingestion ==========
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
