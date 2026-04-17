import type { Article, AIReport } from '../types';

// Track last report generation time and article IDs
let lastReportTimestamp: Date | null = null;
let lastReportArticleIds: string[] = [];

export async function generateSituationReport(
  articles: Article[],
  type: 'daily' | 'flash' | 'strategic'
): Promise<Partial<AIReport>> {
  if (!articles.length) {
    throw new Error('No articles provided for grounding');
  }

  // Check if there are new articles since last report
  const currentArticleIds = articles.map(a => a.id!).filter(Boolean);
  const newestArticleDate = new Date(Math.max(...articles.map(a => new Date(a.published_at).getTime())));
  
  if (lastReportTimestamp && lastReportArticleIds.length > 0) {
    // If the set of article IDs is identical, no new news
    const hasNewArticles = !currentArticleIds.every(id => lastReportArticleIds.includes(id)) ||
                           currentArticleIds.length !== lastReportArticleIds.length;
    
    if (!hasNewArticles && type !== 'flash') {
      // For daily/strategic, skip if no new articles
      const lastReportDate = lastReportTimestamp.toLocaleDateString();
      return {
        title: `${type === 'daily' ? 'Daily' : 'Strategic'} Intelligence Brief (No New Updates)`,
        content: `⚠️ No significant new developments have been reported since ${lastReportDate}. Please refer to the most recent report for current analysis.\n\nTo generate a fresh report, wait for new articles to be ingested (the system fetches news every 15 minutes).`,
        type,
        source_article_ids: currentArticleIds,
        impact_score: 5,
        status: 'draft',
        is_verified: false,
      };
    }
  }

  // Update tracking
  lastReportTimestamp = new Date();
  lastReportArticleIds = currentArticleIds;

  // Prepare context with more structured data (limit to 25 articles for deeper analysis)
  const context = articles.slice(0, 25).map(a => 
    `- **${a.title}**\n  Summary: ${a.summary || a.content?.slice(0, 250)}\n  Source: ${a.source_name}\n  Date: ${new Date(a.published_at).toLocaleDateString()}`
  ).join('\n\n');

  let prompt = '';
  let reportTitle = '';

  switch (type) {
    case 'flash':
      reportTitle = 'Flash Intelligence Update';
      prompt = `You are an expert geopolitical intelligence analyst. Based STRICTLY on the following news articles, produce a CONCISE FLASH REPORT (max 350 words) for senior decision-makers.

**REQUIREMENTS:**
- Focus ONLY on breaking developments, immediate threats, or urgent diplomatic moves from the last 24 hours.
- Cross-reference multiple sources if available; note any contradictions.
- Use bullet points for key takeaways.
- Add a "Confidence Level" (High/Medium/Low) based on source reliability and corroboration.

**ARTICLES:**
${context}

Generate the flash report now.`;
      break;
      
    case 'strategic':
      reportTitle = 'Strategic Assessment';
      prompt = `You are a senior intelligence analyst. Based SOLELY on the following articles, produce a DETAILED STRATEGIC ASSESSMENT (max 1000 words).

**STRUCTURE:**
**1. Executive Summary** (3-4 sentences capturing the essence)
**2. Key Strategic Shifts** (military, diplomatic, economic – cite specific articles)
**3. Actor Analysis** (Iran, Israel, US, regional proxies – infer intentions from actions)
**4. Contradictions & Discrepancies** (if different sources report conflicting info)
**5. Risk Assessment** (scale 1-10 for: a) escalation, b) war, c) diplomacy collapse)
**6. Forecast for Next 7 Days** (most likely scenarios with reasoning)

**ARTICLES:**
${context}

Write the strategic assessment in professional, evidence-based language. Avoid speculation beyond what the articles imply.`;
      break;
      
    default: // daily
      reportTitle = 'Daily Intelligence Brief';
      prompt = `You are an intelligence analyst. Based ONLY on the following news articles, produce a DAILY BRIEF (max 600 words) for military and diplomatic staff.

**STRUCTURE:**
**Top Developments** (3-5 bullet points, each with source attribution)
**Casualty & Incident Report** (if available, with numbers and locations)
**Diplomatic Reactions** (key statements from Iran, Israel, US, UN, etc.)
**What to Watch Today** (2-3 emerging trends or pending events)
**Source Reliability Note** (mention any conflicting reports or unconfirmed info)

**ARTICLES:**
${context}

Write concisely, factually, and actionably.`;
  }

  try {
    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error(`Report generation failed: ${response.statusText}`);
    const data = await response.json();

    // Extract impact score from content (improved heuristic)
    let impactScore = 5;
    if (data.content) {
      const riskMatch = data.content.match(/risk:?\s*(\d+)/i);
      if (riskMatch) impactScore = Math.min(10, parseInt(riskMatch[1]) || 5);
      else if (data.content.includes('Critical')) impactScore = 8;
      else if (data.content.includes('High')) impactScore = 7;
      else if (data.content.includes('Moderate')) impactScore = 5;
      else if (data.content.includes('Low')) impactScore = 3;
    }

    return {
      title: reportTitle,
      content: data.content,
      type,
      source_article_ids: currentArticleIds,
      impact_score: impactScore,
      status: 'published',
      is_verified: false,
    };
  } catch (error) {
    console.error('AI report generation error:', error);
    return {
      title: reportTitle,
      content: `⚠️ AI service temporarily unavailable. Please try again later.\n\nBased on ${articles.length} articles, the key developments are: ${articles.slice(0, 5).map(a => a.title).join('; ')}`,
      type,
      source_article_ids: currentArticleIds,
      impact_score: 5,
      status: 'draft',
      is_verified: false,
    };
  }
}
