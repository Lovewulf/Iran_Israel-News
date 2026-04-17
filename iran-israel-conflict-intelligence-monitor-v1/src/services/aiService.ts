import type { Article, AIReport } from '../types';

export async function generateSituationReport(
  articles: Article[],
  type: 'daily' | 'flash' | 'strategic'
): Promise<Partial<AIReport>> {
  // Prepare context from articles
  const context = articles.slice(0, 20).map(a => 
    `- ${a.title}\n  ${a.summary || a.content?.slice(0, 200)}\n  Source: ${a.source_name}\n  Date: ${new Date(a.published_at).toLocaleDateString()}`
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

  try {
    // Call our backend API endpoint (server.ts)
    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Report generation failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      title: reportTitle,
      content: data.content,
      type,
      source_article_ids: articles.map(a => a.id!).filter(Boolean),
      impact_score: Math.floor(Math.random() * 5) + 5, // placeholder scoring
      status: 'published',
      is_verified: false,
    };
  } catch (error) {
    console.error('AI report generation error:', error);
    // Return a fallback mock report
    return {
      title: reportTitle,
      content: `⚠️ AI service temporarily unavailable. Please try again later.\n\nBased on ${articles.length} articles, the key developments are: ${articles.slice(0, 3).map(a => a.title).join('; ')}`,
      type,
      source_article_ids: articles.map(a => a.id!).filter(Boolean),
      impact_score: 5,
      status: 'draft',
      is_verified: false,
    };
  }
}

export async function generateEventClusterSummary(articles: Article[]): Promise<string> {
  if (!articles.length) return 'No articles available for summary.';

  const context = articles.slice(0, 10).map(a => 
    `- ${a.title}: ${a.summary || a.content?.slice(0, 150)}`
  ).join('\n');

  const prompt = `Summarize the following news articles into a single coherent paragraph describing a major event or trend. Keep it under 200 words.\n\n${context}`;

  try {
    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error('Summary generation failed');
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Event cluster summary error:', error);
    return `Unable to generate summary at this time. The articles discuss: ${articles.map(a => a.title).join('; ')}`;
  }
}
