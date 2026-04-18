import type { Article, AIReport } from '../types';

function computeFallbackScore(content: string): number {
  const keywords = {
    high: ['escalation', 'crisis', 'war', 'attack', 'strike', 'killed', 'missile', 'threat', 'emergency', 'collapse', 'violence', 'casualties'],
    medium: ['tension', 'diplomatic', 'sanctions', 'protest', 'military', 'drone', 'navy', 'guard', 'revolutionary', 'ceasefire'],
    low: ['talk', 'meeting', 'statement', 'deny', 'claim', 'report', 'analysis', 'forecast', 'negotiation'],
  };
  let highCount = 0, mediumCount = 0, lowCount = 0;
  const lower = content.toLowerCase();
  keywords.high.forEach(k => { if (lower.includes(k)) highCount++; });
  keywords.medium.forEach(k => { if (lower.includes(k)) mediumCount++; });
  keywords.low.forEach(k => { if (lower.includes(k)) lowCount++; });
  if (highCount >= 3) return 8;
  if (highCount >= 1) return 7;
  if (mediumCount >= 3) return 6;
  if (mediumCount >= 1) return 5;
  if (lowCount >= 3) return 4;
  return 5;
}

export async function generateSituationReport(
  articles: Article[],
  type: 'daily' | 'flash' | 'strategic',
  options?: { provider?: 'openai' | 'openrouter'; model?: string }
): Promise<Partial<AIReport>> {
  if (!articles.length) throw new Error('No articles provided');

  const sorted = [...articles].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  const latestArticles = sorted.slice(0, 50);
  const context = latestArticles.map(a => 
    `- [${a.source_name}] ${a.title}\n  ${a.summary || a.content?.slice(0, 300)}\n  Published: ${new Date(a.published_at).toLocaleString()}`
  ).join('\n\n');

  let prompt = '';
  let reportTitle = '';

  const bilingualInstruction = `
IMPORTANT: After completing the English report, produce an EXACT Urdu translation of the entire report. Use **Pakistani Urdu** (اردو) as written in Pakistan. Do NOT use Persian (Farsi). Start with "**اردو ترجمہ**" on a new line.`;

  switch (type) {
    case 'flash':
      reportTitle = 'Flash Intelligence Update';
      prompt = `You are a senior geopolitical intelligence analyst. Based STRICTLY on the following 50 news articles, produce a DETAILED FLASH REPORT (600-800 words) for decision-makers. Structure as:

**CRITICAL DEVELOPMENTS** (5-7 bullet points with specific dates/times, contradictions)
**IMMEDIATE THREAT ASSESSMENT** (list each threat with confidence level and potential impact)
**CAUSAL ANALYSIS** (detailed explanation of underlying drivers)
**RECOMMENDED ACTIONS** (3-5 specific, actionable steps)
**INTELLIGENCE GAPS** (what is still unknown)

At the very end of the English report, on a new line, write: IMPACT SCORE: X/10 (1-10).

${bilingualInstruction}

${context}`;
      break;

    case 'strategic':
      reportTitle = 'Strategic Assessment';
      prompt = `You are a senior intelligence analyst. Based SOLELY on the following 50 articles, produce a DETAILED STRATEGIC ASSESSMENT (1800-2000 words). Structure as:

**1. EXECUTIVE SUMMARY** (5-6 sentences capturing essence and trajectory)
**2. KEY STRATEGIC SHIFTS** (military, diplomatic, economic – with confidence levels)
**3. ACTOR ANALYSIS** (Iran, Israel, US, regional proxies – their red lines, internal divisions)
**4. CAUSAL CHAIN** (root causes, triggers, cascading effects – a detailed narrative)
**5. RISK MATRIX** (use a Markdown table: scenario, probability 1-10, impact 1-10, brief justification)
**6. FORECAST (7 & 30 DAYS)** (most likely, optimistic, pessimistic – each with probability)
**7. SCENARIO PLANNING** (describe two alternative scenarios with their triggers)
**8. INTELLIGENCE GAPS** (specific missing information that would change the assessment)

At the very end of the English report, on a new line, write: IMPACT SCORE: X/10.

${bilingualInstruction}

${context}`;
      break;

    default: // daily
      reportTitle = 'Daily Intelligence Brief';
      prompt = `You are an intelligence analyst. Based ONLY on the following 50 articles, produce a COMPREHENSIVE DAILY BRIEF (1000-1200 words). Structure as:

**TOP DEVELOPMENTS** (8-10 bullet points with significance)
**CASUALTY & INCIDENT REPORT** (detailed table of numbers, locations, trends)
**DIPLOMATIC REACTIONS** (analysis of key statements and shifts in tone)
**MEDIA NARRATIVE ANALYSIS** (compare 3-5 major outlets)
**WHAT TO WATCH TODAY** (5-7 specific indicators with rationale)
**BRIEF FORECAST** (3-4 sentences on expected trajectory)
**INTELLIGENCE GAPS** (missing information)

At the very end of the English report, on a new line, write: IMPACT SCORE: X/10.

${bilingualInstruction}

${context}`;
  }

  try {
    const provider = options?.provider || 'openai';
    const modelName = options?.model || (provider === 'openai' ? 'gpt-3.5-turbo' : undefined);

    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider, modelName }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    let content = data.content || '';

    let impactScore = 5;
    const scoreMatch = content.match(/IMPACT SCORE:\s*(\d+)\/10/i);
    if (scoreMatch) {
      impactScore = Math.min(10, Math.max(1, parseInt(scoreMatch[1]) || 5));
      content = content.replace(/IMPACT SCORE:\s*\d+\/10\s*/i, '').trim();
    } else {
      impactScore = computeFallbackScore(content);
    }

    return {
      title: reportTitle,
      content: content,
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
