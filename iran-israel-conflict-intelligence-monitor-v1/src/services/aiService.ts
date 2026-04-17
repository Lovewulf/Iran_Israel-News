import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Article, AIReport } from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export async function generateSituationReport(articles: Article[], type: 'daily' | 'flash' | 'strategic'): Promise<Partial<AIReport>> {
  if (!articles.length) {
    throw new Error('No articles provided for grounding');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const context = articles.slice(0, 20).map(a => 
    `- ${a.title}\n  ${a.summary || a.content?.slice(0, 200)}\n  Source: ${a.source_name} (${a.published_at.toDate().toLocaleDateString()})`
  ).join('\n\n');

  let prompt = '';
  let reportTitle = '';

  switch (type) {
    case 'flash':
      reportTitle = 'Flash Intelligence Update';
      prompt = `You are an intelligence analyst. Based on the following latest articles, produce a concise FLASH report (max 300 words) focusing only on breaking developments, immediate threats, or urgent diplomatic moves. Use bullet points for key takeaways.\n\n${context}`;
      break;
    case 'strategic':
      reportTitle = 'Strategic Assessment';
      prompt = `You are a senior intelligence analyst. Based on the following articles, produce a STRATEGIC assessment (max 800 words) covering: 1) Key strategic shifts, 2) Military implications, 3) Diplomatic trends, 4) Forecast for next 7 days. Write in professional prose.\n\n${context}`;
      break;
    default: // daily
      reportTitle = 'Daily Intelligence Brief';
      prompt = `You are an intelligence analyst. Based on the following articles, produce a DAILY brief (max 500 words) covering: major developments, casualty figures if any, diplomatic reactions, and a summary of the day's most significant events.\n\n${context}`;
  }

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const content = response.text();

  return {
    title: reportTitle,
    content,
    type,
    source_article_ids: articles.map(a => a.id!).filter(Boolean),
    impact_score: Math.floor(Math.random() * 5) + 5, // placeholder scoring
    status: 'published',
    is_verified: false
  };
}

export async function generateEventClusterSummary(articles: Article[]): Promise<string> {
  if (!articles.length) return 'No articles available for summary.';
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const context = articles.slice(0, 10).map(a => `- ${a.title}: ${a.summary || a.content?.slice(0, 150)}`).join('\n');
  const prompt = `Summarize the following news articles into a single coherent paragraph describing a major event or trend. Keep it under 200 words.\n\n${context}`;
  const result = await model.generateContent(prompt);
  return (await result.response).text();
}
