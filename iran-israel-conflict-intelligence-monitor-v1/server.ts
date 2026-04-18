import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { runFullIngestion } from './src/services/ingestionService.js';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

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

// ========== Health check ==========
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== OpenRouter / OpenAI AI report generation ==========
app.post('/api/generate-report', async (req, res) => {
  const { prompt, provider = 'openai', modelName } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // --- OpenAI Provider ---
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY not set');
      return res.status(500).json({ error: 'OpenAI API key not configured.' });
    }
    const openai = new OpenAI({ apiKey });
    try {
      const completion = await openai.chat.completions.create({
        model: modelName || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert geopolitical intelligence analyst. Provide concise, factual, and structured reports based on the news provided.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 2500,
      });
      const text = completion.choices[0]?.message?.content || '';
      if (!text) throw new Error('Empty response from OpenAI');
      console.log('✅ Report generated via OpenAI');
      return res.json({ content: text });
    } catch (error) {
      console.error('❌ OpenAI error:', error);
      return res.status(500).json({ error: getErrorMessage(error) });
    }
  }

  // --- OpenRouter Provider (free fallback) ---
  if (provider === 'openrouter') {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenRouter API key not configured.' });
    }
    const modelsToTry = modelName ? [modelName] : [
      'meta-llama/llama-3.2-3b-instruct:free',
      'microsoft/phi-3-mini-128k-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
      'google/gemma-2-9b-it:free',
      'openrouter/free',
    ];
    for (const model of modelsToTry) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://iran-israel-news.onrender.com',
            'X-Title': 'Iran-Israel Conflict Monitor',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 2500,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || '';
          if (text) {
            console.log(`✅ Report generated via OpenRouter (${model})`);
            return res.json({ content: text });
          }
        }
      } catch (err) {
        console.warn(`OpenRouter model ${model} failed:`, getErrorMessage(err));
      }
    }
    return res.status(503).json({ error: 'All OpenRouter models failed. Please try again later.' });
  }

  return res.status(400).json({ error: 'Invalid provider. Use "openai" or "openrouter".' });
});

// ========== Generate short tactical analysis for a single article (map popup) ==========
app.post('/api/analyze-article', async (req, res) => {
  const { articleId, title, summary } = req.body;
  if (!articleId || !title) {
    return res.status(400).json({ error: 'Missing articleId or title' });
  }

  // Use OpenAI (preferred) or fallback to OpenRouter
  const openaiKey = process.env.OPENAI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openaiKey && !openrouterKey) {
    return res.status(500).json({ error: 'No AI API key configured (OpenAI or OpenRouter).' });
  }

  // Supabase client for caching
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Supabase credentials missing.' });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check if already cached
  const { data: existing } = await supabase
    .from('articles')
    .select('short_analysis')
    .eq('id', articleId)
    .single();

  if (existing?.short_analysis) {
    return res.json({ analysis: existing.short_analysis });
  }

  const prompt = `You are a military analyst. In ONE short sentence (max 20 words), describe the tactical significance of this event: "${title}". ${summary ? `Details: ${summary.substring(0, 200)}` : ''}`;

  let analysis = '';

  // Try OpenAI first
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
        temperature: 0.3,
      });
      analysis = completion.choices[0]?.message?.content?.trim() || '';
    } catch (err) {
      console.warn('OpenAI analysis failed, falling back to OpenRouter:', getErrorMessage(err));
    }
  }

  // Fallback to OpenRouter if needed
  if (!analysis && openrouterKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://iran-israel-news.onrender.com',
          'X-Title': 'Iran-Israel Conflict Monitor',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.2-3b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 60,
          temperature: 0.3,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        analysis = data.choices?.[0]?.message?.content?.trim() || '';
      }
    } catch (err) {
      console.warn('OpenRouter analysis failed:', getErrorMessage(err));
    }
  }

  if (!analysis) {
    analysis = 'No tactical analysis available.';
  }

  // Cache in database
  await supabase.from('articles').update({ short_analysis: analysis }).eq('id', articleId);

  res.json({ analysis });
});

// ========== Manual ingestion endpoint ==========
app.post('/api/ingest', async (req, res) => {
  try {
    console.log('🔄 Manual ingestion triggered');
    const result = await runFullIngestion();
    res.json({ success: true, totalAdded: result.totalAdded });
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ========== Serve static frontend files ==========
app.use(express.static(__dirname));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== Scheduled ingestion every 15 minutes ==========
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

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📍 Health: http://localhost:${port}/api/health`);
  console.log(`📍 AI reports: POST http://localhost:${port}/api/generate-report`);
  console.log(`📍 Map analysis: POST http://localhost:${port}/api/analyze-article`);
  console.log(`📍 Ingestion: POST http://localhost:${port}/api/ingest`);
});
