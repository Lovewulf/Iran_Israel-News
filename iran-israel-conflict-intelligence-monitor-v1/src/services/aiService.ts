import type { Article, AIReport } from '../types';

export async function generateSituationReport(
  articles: Article[],
  type: 'daily' | 'flash' | 'strategic'
): Promise<Partial<AIReport>> {
  if (!articles.length) throw new Error('No articles provided');

  // Sort by date (newest first)
  const sorted = [...articles].sort((a,b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  const latest20 = sorted.slice(0, 20);
  const context = latest20.map(a => 
    `- ${a.title}\n  ${a.summary || a.content?.slice(0, 300)}\n  Source: ${a.source_name}\n  Date: ${new Date(a.published_at).toLocaleDateString()}`
  ).join('\n\n');

  let prompt = '';
  let reportTitle = '';

  switch (type) {
    case 'flash':
      reportTitle = 'Flash Intelligence Update';
      prompt = `You are an experienced geopolitical intelligence analyst. Based STRICTLY on the following news articles, produce a CONCISE FLASH REPORT (max 400 words) for senior decision-makers. Include:

**Key Developments** (3-5 bullet points, with specific dates/times if available)
**Immediate Threats** (any imminent military, diplomatic, or economic risks)
**Contradictions or Uncertainties** (if sources disagree or info is unverified)
**Recommended Actions** (2-3 brief, actionable steps)

Be factual, avoid speculation. Cite sources implicitly.

${context}`;
      break;
      
    case 'strategic':
      reportTitle = 'Strategic Assessment';
      prompt = `You are a senior intelligence analyst. Based SOLELY on the following articles, produce a DETAILED STRATEGIC ASSESSMENT (max 1200 words). Structure as:

**1. Executive Summary** (3-4 sentences capturing the essence)
**2. Key Strategic Shifts** (military, diplomatic, economic – note any changes from previous patterns)
**3. Actor Analysis** (Iran, Israel, US, regional proxies – their stated positions, actions, and apparent red lines)
**4. Risk Assessment** (provide numeric scores 1-10 for: escalation to open conflict, diplomatic breakthrough, economic disruption – with brief justification)
**5. Forecast for Next 7 Days** (most likely scenarios, with probability percentages if possible)
**6. Intelligence Gaps** (what information is missing to fully assess the situation)

Use evidence-based language. Highlight any contradictions between sources.

${context}`;
      break;
      
    default: // daily
      reportTitle = 'Daily Intelligence Brief';
      prompt = `You are an intelligence analyst. Based ONLY on the following news articles, produce a DAILY BRIEF (max 700 words) for military and diplomatic staff. Structure as:

**Top Developments** (3-5 bullet points, each with a brief explanation)
**Casualty & Incident Report** (if available – numbers, locations, significance)
**Diplomatic Reactions** (key statements from governments and international bodies)
**Media Narrative Analysis** (how different outlets frame the same event – note any bias or inconsistency)
**What to Watch Today** (2-3 specific events or indicators to monitor)

Be concise, factual, and actionable. If information is missing, state that explicitly.

${context}`;
  }

  try {
    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    let impactScore = 5;
    if (data.content) {
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
    console.error('AI report error:', error);
    return {
      title: reportTitle,
      content: `⚠️ AI service error. Please try later.\n\nBased on ${articles.length} articles: ${articles.slice(0,3).map(a=>a.title).join('; ')}`,
      type,
      source_article_ids: articles.map(a => a.id!).filter(Boolean),
      impact_score: 5,
      status: 'draft',
      is_verified: false,
    };
  }
}
