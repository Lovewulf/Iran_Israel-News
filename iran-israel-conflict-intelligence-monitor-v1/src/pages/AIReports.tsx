import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Activity, ChevronRight, Calendar, ShieldCheck, AlertCircle, RefreshCw, Zap, TrendingUp, BarChart3, ShieldAlert } from 'lucide-react';
import { AIReport, Article } from '../types';
import { getAIReports, getArticles, saveReport } from '../services/firestoreService';
import { generateSituationReport } from '../services/aiService';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';

const ReportCard = ({ report, idx }: { report: AIReport, idx: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all"
    >
      <div className="p-5 border-b border-border bg-muted/20">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded">
              {report.type} Report
            </span>
            <span className="text-xs text-muted-foreground">
              {report.generated_at.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            {report.is_verified && (
              <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2">{report.title}</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-yellow-500" />
            <span>Impact Score: <strong>{report.impact_score}/10</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldAlert className="w-4 h-4 text-blue-500" />
            <span>Status: <strong>{report.status}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4 text-green-500" />
            <span>Sources: <strong>{report.source_article_ids.length}</strong></span>
          </div>
        </div>
      </div>
      
      <div className="p-5">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown>{report.content.slice(0, isExpanded ? undefined : 300)}{!isExpanded && report.content.length > 300 ? '...' : ''}</Markdown>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 text-xs font-bold text-primary hover:underline flex items-center gap-1 uppercase tracking-wider"
        >
          {isExpanded ? 'Collapse Analysis' : 'Read Full Report'} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

export default function AIReports() {
  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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
    try {
      const articles = await getArticles(20);
      if (articles.length === 0) {
        alert("No articles found for grounding. Ingest some data first.");
        return;
      }
      const newReport = await generateSituationReport(articles, type);
      await saveReport(newReport);
      const updated = await getAIReports(20);
      setReports(updated);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert("Failed to generate report. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading intelligence reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            AI Intelligence Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated strategic reports synthesized by the Sentinel AI engine. Each assessment is cross-referenced with verified intelligence data.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleGenerate('flash')}
            disabled={generating}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Flash Report
          </button>
          <button
            onClick={() => handleGenerate('daily')}
            disabled={generating}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-secondary/80"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            Daily Assessment
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 bg-muted/20 rounded-lg">
          <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-xl font-semibold">No reports available</h3>
          <p className="text-muted-foreground mt-1">
            Click "Generate Assessment" to create your first intelligence report.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report, idx) => (
            <ReportCard key={report.id} report={report} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
