import { GoogleGenAI, Type } from "@google/genai";
import { getDbSafe, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { AIReport, Article } from '../types';
import { ENV } from '../config/env';

// Lazy initialization of Gemini API
let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!ENV.KEYS.GEMINI || ENV.KEYS.GEMINI.includes('TODO')) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: ENV.KEYS.GEMINI });
  }
  return aiInstance;
};

export async function generateSummary(text: string): Promise<string> {
  const ai = getAI();
  if (!ai) {
    return "AI features are not configured. Please add GEMINI_API_KEY to environment variables.";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following intelligence report concisely: ${text}`,
    });
    return response.text || "Failed to generate summary.";
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "Error generating summary.";
  }
}

export async function generateSituationReport(articles: Article[], type: AIReport['type']): Promise<Omit<AIReport, 'id' | 'generated_at'>> {
  const ai = getAI();
  if (!ai) {
    throw new Error("AI features are not configured. Please add GEMINI_API_KEY to environment variables.");
  }

  const context = articles.map(a => `[Source: ${a.source_name}] ${a.title}: ${a.summary || a.content}`).join('\n\n');
  const prompt = `You are a senior intelligence analyst. Based on the following news reports, generate a ${type} situation report for the Iran-Israel conflict. 
  Focus on strategic developments, military movements, diplomatic shifts, and escalation risks.
  
  Reports:
  ${context}
  
  Return a JSON object with the following structure:
  {
    "title": "A concise, impactful title",
    "summary": "A 2-3 sentence executive summary",
    "content": "The full report in Markdown format with sections for Key Developments, Strategic Assessment, Escalation Indicators, and Outlook",
    "impact_score": 1-10 (number representing the strategic impact/risk level)
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            content: { type: Type.STRING },
            impact_score: { type: Type.NUMBER }
          },
          required: ["title", "summary", "content", "impact_score"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");

    return {
      title: result.title || `${type.toUpperCase()} Situation Report - ${new Date().toLocaleDateString()}`,
      summary: result.summary || "Strategic assessment of recent regional developments.",
      type,
      content: result.content || "Failed to generate report content.",
      source_article_ids: articles.map(a => a.id).filter((id): id is string => !!id),
      impact_score: result.impact_score || 5,
      status: 'published',
      is_verified: false
    };
  } catch (error) {
    console.error("AI Report Generation Error:", error);
    throw error;
  }
}

export async function saveReport(report: Omit<AIReport, 'id' | 'generated_at'>) {
  const db = getDbSafe();
  if (!db) throw new Error("Firestore is not initialized.");
  
  const path = 'ai_reports';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...report,
      generated_at: serverTimestamp(),
    });
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getReports(limitCount = 10): Promise<AIReport[]> {
  const db = getDbSafe();
  if (!db) return [];
  
  const path = 'ai_reports';
  try {
    const q = query(collection(db, path), orderBy('generated_at', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIReport));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}
