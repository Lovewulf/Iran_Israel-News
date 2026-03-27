import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  Activity, 
  ChevronRight, 
  Calendar, 
  ShieldCheck, 
  AlertCircle,
  RefreshCw,
  Zap,
  TrendingUp,
  BarChart3,
  ShieldAlert
} from 'lucide-react';
import { AIReport, Article } from '../types';
import { getAIReports, getArticles } from '../services/firestoreService';
import { generateSituationReport, saveReport } from '../services/aiService';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';

const ReportCard = ({ report, idx }: { report: AIReport, idx: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden hover:border-primary/50 transition-all backdrop-blur-sm group"
    >
      <div className="p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border",
              report.type === 'flash' ? "border-destructive/50 text-destructive bg-destructive/5" : "border-primary/50 text-primary bg-primary/5"
            )}>
              {report.type} Report
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              {report.generated_at.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
          {report.is_verified && (
            <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em] flex items-center gap-1.5 px-3 py-1 bg-green-500/5 border border-green-500/30 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              Verified Analysis
            </span>
          )}
        </div>

        <h3 className="text-2xl font-black tracking-tighter mb-6 group-hover:text-primary transition-colors leading-none">
          {report.title}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Impact Score</p>
            <p className="text-xl font-black text-primary">{report.impact_score}/10</p>
          </div>
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Strategic Status</p>
            <p className="text-xl font-black uppercase tracking-tighter">{report.status}</p>
          </div>
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Confidence</p>
            <p className="text-xl font-black text-green-500">High</p>
          </div>
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Sources</p>
            <p className="text-xl font-black">{report.source_article_ids.length}</p>
          </div>
        </div>

        <div className={cn(
          "prose prose-sm prose-invert max-w-none text-zinc-400 leading-relaxed font-medium",
          !isExpanded && "line-clamp-6"
        )}>
          <Markdown>{report.content}</Markdown>
        </div>

        <div className="flex items-center justify-between mt-8 pt-8 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center">
                  <FileText className="w-3 h-3 text-zinc-500" />
                </div>
              ))}
            </div>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">
              Grounded in Intelligence Data
            </span>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] font-black text-primary hover:text-white flex items-center gap-2 uppercase tracking-[0.2em] transition-colors"
          >
            {isExpanded ? 'Collapse Analysis' : 'Read Full Report'} <ChevronRight className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90")} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const AIReports = () => {
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

  return (
    <div className="space-y-12 pb-20">
      <header className="relative py-20 px-10 bg-zinc-950 text-white rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-50" />
        <div className="scanline opacity-10" />
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
          <Sparkles className="w-80 h-80" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                AI Intelligence Engine
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border-l border-white/10 pl-4">
                <Zap className="w-3.5 h-3.5 text-yellow-500 animate-pulse" /> 
                High Precision Mode Active
              </div>
            </div>
            
            <h1 className="text-7xl font-black tracking-tighter leading-[0.85] mb-8 uppercase italic">
              Situation <br />
              <span className="text-primary">Assessments</span>
            </h1>
            
            <p className="text-xl text-white/50 leading-relaxed font-medium max-w-2xl">
              Automated strategic reports synthesized by the Sentinel AI engine. 
              Each assessment is cross-referenced with verified intelligence data 
              to provide high-fidelity impact scoring and risk analysis.
            </p>
          </div>

          <div className="dropdown relative group/menu">
            <button 
              disabled={generating}
              className="px-10 py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center gap-4 hover:bg-primary hover:text-white transition-all disabled:opacity-50 shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:-translate-y-1 active:scale-95"
            >
              {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {generating ? 'Synthesizing...' : 'Generate Assessment'}
            </button>
            <div className="absolute right-0 mt-6 w-72 bg-zinc-900 border border-white/10 rounded-[1.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-50 p-4 backdrop-blur-xl">
              <div className="space-y-2">
                <button onClick={() => handleGenerate('flash')} className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white rounded-xl transition-all flex items-center justify-between group/item">
                  Flash Report
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all" />
                </button>
                <button onClick={() => handleGenerate('daily')} className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white rounded-xl transition-all flex items-center justify-between group/item">
                  Daily Brief
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all" />
                </button>
                <button onClick={() => handleGenerate('strategic')} className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white rounded-xl transition-all flex items-center justify-between group/item">
                  Strategic Analysis
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-10">
        {loading ? (
          <div className="py-40 text-center">
            <Activity className="w-20 h-20 text-primary animate-spin mx-auto mb-8 opacity-20" />
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] animate-pulse">Accessing Strategic Knowledge Base...</p>
          </div>
        ) : reports.length > 0 ? (
          reports.map((report, idx) => (
            <ReportCard key={report.id} report={report} idx={idx} />
          ))
        ) : (
          <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-zinc-900/20 relative overflow-hidden">
            <div className="scanline opacity-5" />
            <FileText className="w-24 h-24 text-white/5 mx-auto mb-8" />
            <h3 className="text-2xl font-black tracking-tighter text-white/20 uppercase mb-4">No assessments available</h3>
            <p className="text-sm text-white/10 font-medium max-w-md mx-auto leading-relaxed">
              The intelligence engine is idle. Initiate a situation assessment to begin 
              synthesizing strategic reports from ingested data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
