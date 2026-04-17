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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/generate-report', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set');
    return res.status(500).json({ error: 'OpenRouter API key not configured.' });
  }

  try {
    let { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Truncate prompt to 4000 chars
    if (prompt.length > 4000) {
      prompt = prompt.substring(0, 4000);
    }

    // Current working free models (as of April 2026)
    const modelsToTry = [
      'meta-llama/llama-3.2-3b-instruct:free',
      'microsoft/phi-3-mini-128k-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
      'google/gemma-2-9b-it:free',
      'openrouter/free',
    ];

    let lastError: unknown = null;
    for (const model of modelsToTry) {
      try {
        console.log(`🤖 Trying model: ${model}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

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
            max_tokens: 2500, // Increased for bilingual output
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || '';
          if (text && text.length > 50) {
            console.log(`✅ Report generated using model: ${model}`);
            return res.json({ content: text });
          } else {
            throw new Error('Empty or too short response');
          }
        } else {
          const errorText = await response.text();
          console.warn(`⚠️ Model ${model} failed (${response.status}): ${errorText.substring(0, 200)}`);
          lastError = new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        console.warn(`⚠️ Model ${model} error:`, getErrorMessage(err));
        lastError = err;
      }
    }

    // If all models fail, return a fallback response (not a 500) so the frontend can show a message
    console.error('❌ All AI models failed');
    return res.status(503).json({
      error: 'AI service temporarily unavailable. Please try again later.',
      fallback: true,
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.post('/api/ingest', async (req, res) => {
  try {
    console.log('🔄 Manual ingestion');
    const result = await runFullIngestion();
    res.json({ success: true, totalAdded: result.totalAdded });
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// Serve static frontend
app.use(express.static(__dirname));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Scheduled ingestion
(async () => {
  console.log('🚀 Initial ingestion...');
  try {
    const result = await runFullIngestion();
    console.log(`✅ Added ${result.totalAdded} articles.`);
  } catch (err) { console.error('❌ Initial ingestion failed:', getErrorMessage(err)); }
})();

setInterval(async () => {
  console.log('⏰ Scheduled ingestion...');
  try {
    const result = await runFullIngestion();
    console.log(`✅ Added ${result.totalAdded} articles.`);
  } catch (err) { console.error('❌ Scheduled ingestion failed:', getErrorMessage(err)); }
}, 15 * 60 * 1000);

app.listen(port, () => console.log(`✅ Server running on port ${port}`));
