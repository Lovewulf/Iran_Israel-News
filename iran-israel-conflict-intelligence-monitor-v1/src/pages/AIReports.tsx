import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Activity, ChevronRight, Calendar, ShieldCheck, RefreshCw, Zap, TrendingUp, ShieldAlert, Trash2 } from 'lucide-react';
import { AIReport, Article } from '../types';
import { getAIReports, getArticles, saveReport, deleteAllReports } from '../services/firestoreService';
import { generateSituationReport } from '../services/aiService';
import { motion } from 'framer-motion';
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
          <div className="text-red-500">⚠️ No content available.</div>
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
  const [newAvailable, setNewAvailable] = useState({ daily: false, flash: false, strategic: false });

  const fetchReports = async () => {
    try {
      const data = await getAIReports(20);
      setReports(data);
      await checkNewArticlesSinceLastReport(data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNewArticlesSinceLastReport = async (existingReports: AIReport[]) => {
    const allArticles = await getArticles(100);
    if (!allArticles.length) return;

    const getLastReportDate = (type: string) => {
      const last = existingReports.find(r => r.type === type);
      return last ? new Date(last.generated_at) : null;
    };

    const hasNewArticles = (lastDate: Date | null) => {
      if (!lastDate) return allArticles.length > 0;
      return allArticles.some(a => new Date(a.published_at) > lastDate);
    };

    setNewAvailable({
      daily: hasNewArticles(getLastReportDate('daily')),
      flash: hasNewArticles(getLastReportDate('flash')),
      strategic: hasNewArticles(getLastReportDate('strategic')),
    });
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // ✅ Generation allowed anytime – no duplicate blocking
  const handleGenerate = async (type: AIReport['type']) => {
    setGenerating(true);
    setGeneratingType(type);
    try {
      const articles = await getArticles(30);
      if (articles.length === 0) {
        alert("No articles found. Ingest some data first.");
        return;
      }
      const newReport = await generateSituationReport(articles, type);
      await saveReport(newReport);
      await fetchReports();
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert("Failed to generate report. Check console.");
    } finally {
      setGenerating(false);
      setGeneratingType(null);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('⚠️ Delete ALL AI reports? This action cannot be undone.')) {
      try {
        await deleteAllReports();
        await fetchReports();
        alert('All reports deleted.');
      } catch (error) {
        console.error('Failed to delete reports:', error);
        alert('Error deleting reports.');
      }
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
        <button
          onClick={handleClearAll}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-700 transition"
        >
          <Trash2 className="w-4 h-4" /> Clear All Reports
        </button>
      </div>

      <div className="flex gap-3 mb-8 flex-wrap">
        <button
          onClick={() => handleGenerate('flash')}
          disabled={generating}
          className="relative px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {generatingType === 'flash' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Flash Report
          {newAvailable.flash && !generating && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center">!</span>
            </span>
          )}
        </button>
        <button
          onClick={() => handleGenerate('daily')}
          disabled={generating}
          className="relative px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition disabled:opacity-50"
        >
          {generatingType === 'daily' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
          Daily Brief
          {newAvailable.daily && !generating && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center">!</span>
            </span>
          )}
        </button>
        <button
          onClick={() => handleGenerate('strategic')}
          disabled={generating}
          className="relative px-4 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-amber-800 transition disabled:opacity-50"
        >
          {generatingType === 'strategic' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          Strategic Assessment
          {newAvailable.strategic && !generating && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center">!</span>
            </span>
          )}
        </button>
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
