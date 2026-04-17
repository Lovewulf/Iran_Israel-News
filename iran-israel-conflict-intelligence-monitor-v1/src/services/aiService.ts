import type { Article, AIReport } from '../types';

export async function generateSituationReport(
  articles: Article[],
  type: 'daily' | 'flash' | 'strategic'
): Promise<Partial<AIReport>> {
  if (!articles.length) {
    throw new Error('No articles provided for grounding');
  }

  // Prepare context (limit to 20 most recent articles)
  const context = articles.slice(0, 20).map(a => 
    `- ${a.title}\n  ${a.summary || a.content?.slice(0, 200)}\n  Source: ${a.source_name}\n  Date: ${new Date(a.published_at).toLocaleDateString()}`
  ).join('\n\n');

  let prompt = '';
  let reportTitle = '';

  switch (type) {
    case 'flash':
      reportTitle = 'Flash Intelligence Update';
      prompt = `You are an experienced geopolitical intelligence analyst. Based on the following news articles, produce a CONCISE FLASH REPORT (max 300 words) for senior decision-makers. Structure as:
      
      **Key Developments** (bullet points)
      **Immediate Threats** (if any)
      **Recommended Actions** (brief)
      
      Use professional, factual language. Avoid speculation. Base everything strictly on the provided articles.
      
      ${context}`;
      break;
      
    case 'strategic':
      reportTitle = 'Strategic Assessment';
      prompt = `You are a senior intelligence analyst. Based on the following articles, produce a DETAILED STRATEGIC ASSESSMENT (max 800 words) with the following sections:
      
      **1. Executive Summary** (2-3 sentences)
      **2. Key Strategic Shifts** (military, diplomatic, economic)
      **3. Actor Analysis** (Iran, Israel, US, regional proxies)
      **4. Risk Assessment** (scale 1-10 for escalation, war, diplomacy collapse)
      **5. Forecast for Next 7 Days** (most likely scenarios)
      
      Use professional, evidence-based language. Cite article sources implicitly. Avoid speculation beyond trends.
      
      ${context}`;
      break;
      
    default: // daily
      reportTitle = 'Daily Intelligence Brief';
      prompt = `You are an intelligence analyst. Based on the following news articles, produce a DAILY BRIEF (max 500 words) for military and diplomatic staff. Structure as:
      
      **Top Developments** (3-5 bullet points)
      **Casualty & Incident Report** (if available)
      **Diplomatic Reactions** (key statements)
      **What to Watch Today**
      
      Be concise, factual, and actionable.
      
      ${context}`;
  }

  try {
    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error(`Report generation failed: ${response.statusText}`);
    const data = await response.json();

    // Extract impact score from content if possible (simple heuristic)
    let impactScore = 5;
    if (data.content.includes('Risk Assessment') || data.content.includes('score')) {
      const match = data.content.match(/risk:?\s*(\d+)/i);
      if (match) impactScore = Math.min(10, parseInt(match[1]) || 5);
    }

    return {
      title: reportTitle,
      content: data.content,
      type,
      source_article_ids: articles.map(a => a.id!).filter(Boolean),
      impact_score: impactScore,
      status: 'published',
      is_verified: false,
    };
  } catch (error) {
    console.error('AI report generation error:', error);
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
