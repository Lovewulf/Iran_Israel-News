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
app.use(express.static(__dirname));

// ========== OpenRouter AI Endpoint ==========
app.post('/api/generate-report', async (req, res) => {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    console.error('❌ OPENROUTER_API_KEY is not set');
    return res.status(500).json({ error: 'OpenRouter API key not configured.' });
  }

  try {
    let { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Truncate prompt to 4000 chars to avoid token limits (adjust as needed)
    if (prompt.length > 4000) {
      console.log(`⚠️ Prompt truncated from ${prompt.length} to 4000 chars`);
      prompt = prompt.substring(0, 4000);
    }

    console.log(`🤖 Generating report with OpenRouter (prompt length: ${prompt.length})...`);
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://iran-israel-news.onrender.com', // Replace with your app's URL
        'X-Title': 'Iran-Israel Conflict Monitor',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free', // Free model (generous limits)
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
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ OpenRouter API error (${response.status}):`, errorData);
      return res.status(response.status).json({ error: `OpenRouter API error: ${response.statusText}` });
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';
    if (!text) throw new Error('Empty response from OpenRouter');

    console.log('✅ AI report generated successfully');
    res.json({ content: text });
  } catch (error) {
    console.error('❌ Error generating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
