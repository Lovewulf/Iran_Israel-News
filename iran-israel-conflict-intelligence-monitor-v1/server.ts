import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { runFullIngestion } from './src/services/ingestionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // points to the 'dist' folder where server.js lives

const app = express();
const port = process.env.PORT || 3001;

// 1. Global middleware
app.use(cors());
app.use(express.json());

// 2. API routes – must come before static file serving
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

    console.log(`🤖 Generating report with Gemma 2 9B (prompt length: ${prompt.length})...`);
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://iran-israel-news.onrender.com',
        'X-Title': 'Iran-Israel Conflict Monitor',
      },
      body: JSON.stringify({
        model: 'google/gemma-2-9b-it:free',
        messages: [
          { role: 'system', content: 'You are an expert geopolitical intelligence analyst. Provide concise, factual, and structured reports based on the news provided.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouter API error (${response.status}):`, errorText);
      return res.status(response.status).json({ error: `OpenRouter error: ${response.statusText}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Empty response from OpenRouter');

    console.log('✅ AI report generated successfully');
    res.json({ content: text });
  } catch (error) {
    console.error('❌ Error generating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/ingest', async (req, res) => {
  try {
    console.log('🔄 Manual ingestion triggered');
    const result = await runFullIngestion();
    res.json({ success: true, totalAdded: result.totalAdded });
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// 3. Serve static frontend files (after API routes)
// The frontend build output (index.html, assets, etc.) is in the same 'dist' folder
app.use(express.static(__dirname));

// 4. Catch-all route for client-side routing (must be after static)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 5. Scheduled background tasks (non‑blocking)
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

// 6. Start the server
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📍 Health: http://localhost:${port}/api/health`);
  console.log(`📍 AI reports: POST http://localhost:${port}/api/generate-report`);
  console.log(`📍 Ingestion: POST http://localhost:${port}/api/ingest`);
});
