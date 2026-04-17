import type { Article, AIReport } from '../types';

export async function generateSituationReport(
  articles: Article[],
  type: 'daily' | 'flash' | 'strategic'
): Promise<Partial<AIReport>> {
  if (!articles.length) throw new Error('No articles provided');

  // Sort by date (newest first) and take top 50 for maximum context
  const sorted = [...articles].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  const latestArticles = sorted.slice(0, 50);
  const context = latestArticles.map(a => 
    `- [${a.source_name}] ${a.title}\n  ${a.summary || a.content?.slice(0, 300)}\n  Published: ${new Date(a.published_at).toLocaleString()}`
  ).join('\n\n');

  let prompt = '';
  let reportTitle = '';

  switch (type) {
    case 'flash':
      reportTitle = 'Flash Intelligence Update';
      prompt = `You are a senior geopolitical intelligence analyst. Based STRICTLY on the following 50 news articles, produce a CONCISE but DEEP FLASH REPORT (max 450 words) for decision-makers. Structure as:

**CRITICAL DEVELOPMENTS** (3-5 bullet points with specific dates/times, noting any contradictions)
**IMMEDIATE THREAT ASSESSMENT** (list each threat with a confidence level: High/Medium/Low)
**CAUSAL ANALYSIS** (brief explanation of why these events are happening now – underlying drivers)
**RECOMMENDED ACTIONS** (2-3 specific, actionable steps for military/diplomatic staff)

Be factual, avoid speculation. If information is missing, state "Not reported". Use the source names as implicit citations.

${context}`;
      break;

    case 'strategic':
      reportTitle = 'Strategic Assessment';
      prompt = `You are a senior intelligence analyst. Based SOLELY on the following 50 articles, produce a DETAILED STRATEGIC ASSESSMENT (max 1300 words). Structure as:

**1. EXECUTIVE SUMMARY** (4-5 sentences capturing the essence and trajectory)
**2. KEY STRATEGIC SHIFTS** (military, diplomatic, economic – note changes from previous patterns, include confidence levels)
**3. ACTOR ANALYSIS** (Iran, Israel, US, regional proxies – their stated positions, red lines, and apparent internal disagreements)
**4. CAUSAL CHAIN** (root causes, triggers, and cascading effects – a short narrative explaining how we got here)
**5. RISK MATRIX** (provide numeric scores 1-10 and brief justification for: escalation to open conflict, diplomatic breakthrough, economic disruption, regional spillover)
**6. FORECAST (7 & 30 DAYS)** (most likely scenario, optimistic scenario, pessimistic scenario – each with probability percentage)
**7. INTELLIGENCE GAPS** (what critical information is missing to fully assess the situation – be specific)

Use evidence-based language. Highlight any contradictions between sources. If a section lacks data, state "Insufficient reporting".

${context}`;
      break;

    default: // daily
      reportTitle = 'Daily Intelligence Brief';
      prompt = `You are an intelligence analyst. Based ONLY on the following 50 articles, produce a COMPREHENSIVE DAILY BRIEF (max 800 words) for military and diplomatic staff. Structure as:

**TOP DEVELOPMENTS** (5-7 bullet points, each with a brief explanation and implied significance)
**CASUALTY & INCIDENT REPORT** (if available – numbers, locations, trends, and any disputed figures)
**DIPLOMATIC REACTIONS** (key statements from governments and international bodies, noting any shifts in tone)
**MEDIA NARRATIVE ANALYSIS** (how different outlets frame the same event – note any bias or inconsistency)
**WHAT TO WATCH TODAY** (3-5 specific indicators or events to monitor in the next 24 hours, with rationale)
**BRIEF FORECAST** (2-3 sentences on expected near-term trajectory)

Be concise, factual, and actionable. If information is missing, state explicitly.

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

    // Extract impact score from content (improved heuristic)
    let impactScore = 5;
    if (data.content) {
      const riskMatch = data.content.match(/risk.*?(\d+)/i);
      if (riskMatch) impactScore = Math.min(10, parseInt(riskMatch[1]) || 5);
      const escalationMatch = data.content.match(/escalation.*?(\d+)/i);
      if (escalationMatch) impactScore = Math.max(impactScore, Math.min(10, parseInt(escalationMatch[1]) || 5));
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
      content: `⚠️ AI service temporarily unavailable. Please try later.\n\nBased on ${articles.length} articles, the key developments are: ${articles.slice(0, 3).map(a => a.title).join('; ')}`,
      type,
      source_article_ids: articles.map(a => a.id!).filter(Boolean),
      impact_score: 5,
      status: 'draft',
      is_verified: false,
    };
  }
}
