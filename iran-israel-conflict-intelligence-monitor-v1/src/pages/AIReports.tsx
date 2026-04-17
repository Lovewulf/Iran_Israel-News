import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Activity, ChevronRight, Calendar, ShieldCheck, RefreshCw, Zap, TrendingUp, ShieldAlert } from 'lucide-react';
import { AIReport, Article } from '../types';
import { getAIReports, getArticles, saveReport } from '../services/firestoreService';
import { generateSituationReport } from '../services/aiService';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';

const formatDate = (dateValue: any) => {
  if (!dateValue) return 'Unknown date';
  try {
    const d = new Date(dateValue);
    return d.toLocaleString();
  } catch {
    return 'Invalid date';
  }
};

const getImpactColor = (score: number) => {
  if (score >= 8) return 'bg-red-100 text-red-800 border-red-300';
  if (score >= 6) return 'bg-orange-100 text-orange-800 border-orange-300';
  if (score >= 4) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-green-100 text-green-800 border-green-300';
};

const getImpactLabel = (score: number) => {
  if (score >= 8) return 'Critical';
  if (score >= 6) return 'High';
  if (score >= 4) return 'Moderate';
  return 'Low';
};

const ReportCard = ({ report, idx }: { report: AIReport; idx: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const impactColor = getImpactColor(report.impact_score || 5);
  const impactLabel = getImpactLabel(report.impact_score || 5);

  const content = report.content || '';
  const displayContent = isExpanded ? content : content.slice(0, 500) + (content.length > 500 ? '...' : '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all"
    >
      <div className="p-5 border-b border-gray-100 bg-gray-50">
        <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
              {report.type} Report
            </span>
            <span className="text-xs text-gray-500">{formatDate(report.generated_at)}</span>
            {report.is_verified && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            )}
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${impactColor}`}>
              Impact: {impactLabel} ({report.impact_score}/10)
            </span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{report.title}</h3>
        <div className="flex gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>Sources: <strong>{report.source_article_ids?.length || 0}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{formatDate(report.generated_at)}</span>
          </div>
        </div>
      </div>
      <div className="p-5">
        {content ? (
          <>
            <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-li:text-gray-700">
              <Markdown>{displayContent}</Markdown>
            </div>
            {content.length > 500 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-4 text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 uppercase tracking-wider"
              >
                {isExpanded ? 'Collapse Analysis' : 'Read Full Report'} <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <div className="text-red-500">⚠️ No content available for this report.</div>
        )}
      </div>
    </motion.div>
  );
};

export default function AIReports() {
  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<'daily' | 'flash' | 'strategic' | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getAIReports(20);
        setReports(data);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleGenerate = async (type: AIReport['type']) => {
    setGenerating(true);
    setGeneratingType(type);
    try {
      const articles = await getArticles(50);
      if (articles.length === 0) {
        alert("No articles found. Ingest some data first.");
        return;
      }
      const newReport = await generateSituationReport(articles, type);
      await saveReport(newReport);
      const updated = await getAIReports(20);
      setReports(updated);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert("Failed to generate report. Check console.");
    } finally {
      setGenerating(false);
      setGeneratingType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-gray-500">Loading intelligence reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            AI Intelligence Reports
          </h1>
          <p className="text-gray-500 mt-1">
            Automated strategic reports synthesized by Groq AI based on recent articles.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleGenerate('flash')}
            disabled={generating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {generatingType === 'flash' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Flash Report
          </button>
          <button
            onClick={() => handleGenerate('daily')}
            disabled={generating}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition disabled:opacity-50"
          >
            {generatingType === 'daily' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            Daily Brief
          </button>
          <button
            onClick={() => handleGenerate('strategic')}
            disabled={generating}
            className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-amber-800 transition disabled:opacity-50"
          >
            {generatingType === 'strategic' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Strategic Assessment
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <ShieldAlert className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-gray-700">No reports available</h3>
          <p className="text-gray-500 mt-1">
            Click one of the buttons above to generate your first intelligence report.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report, idx) => (
            <ReportCard key={report.id} report={report} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
