import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import { runFullIngestion } from './src/services/ingestionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the React build (Vite dist)
app.use(express.static(path.join(__dirname, 'dist')));

// Gemini AI endpoint
app.post('/api/generate-report', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ content: text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// Ingestion endpoint (manual trigger)
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📍 Health: http://localhost:${port}/api/health`);
  console.log(`📍 Ingestion: POST http://localhost:${port}/api/ingest`);
});
