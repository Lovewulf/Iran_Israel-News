import type { Article, AIReport } from '../types';

export async function generateSituationReport(
  articles: Article[],
  type: 'daily' | 'flash' | 'strategic'
): Promise<Partial<AIReport>> {
  const context = articles
    .slice(0, 20)
    .map(
      (a) =>
        `- ${a.title}\n  ${a.summary || a.content?.slice(0, 200)}\n  Source: ${a.source_name}`
    )
    .join('\n\n');

  let prompt = '';
  let reportTitle = '';

  switch (type) {
    case 'flash':
      reportTitle = 'Flash Intelligence Update';
      prompt = `You are an intelligence analyst. Based on the following latest articles, produce a concise FLASH report (max 300 words) focusing only on breaking developments, immediate threats, or urgent diplomatic moves. Use bullet points for key takeaways.\n\n${context}`;
      break;
    case 'strategic':
      reportTitle = 'Strategic Assessment';
      prompt = `You are a senior intelligence analyst. Based on the following articles, produce a STRATEGIC assessment (max 800 words) covering: 1) Key strategic shifts, 2) Military implications, 3) Diplomatic trends, 4) Forecast for next 7 days.\n\n${context}`;
      break;
    default:
      reportTitle = 'Daily Intelligence Brief';
      prompt = `You are an intelligence analyst. Based on the following articles, produce a DAILY brief (max 500 words) covering major developments and diplomatic reactions.\n\n${context}`;
  }

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
    source_article_ids: articles.map((a) => a.id!).filter(Boolean),
    impact_score: Math.floor(Math.random() * 5) + 5,
    status: 'published',
    is_verified: false,
  };
}
