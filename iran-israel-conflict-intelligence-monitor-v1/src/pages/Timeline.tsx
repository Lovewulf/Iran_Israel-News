import React, { useState, useEffect } from 'react';
import { 
  History, 
  Calendar, 
  ChevronRight, 
  ArrowUpRight,
  ShieldAlert,
  Activity,
  ChevronDown,
  ChevronUp,
  Globe,
  Zap,
  Clock,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { EventCluster, Article } from '../types';
import { getEventClusters, getArticles } from '../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { where } from 'firebase/firestore';
import { SourceBadge } from '../components/SourceBadge';

const TimelineEvent = ({ cluster, idx }: { cluster: EventCluster, idx: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!isExpanded && articles.length === 0) {
      setLoading(true);
      try {
        const related = await getArticles(10, [where('cluster_id', '==', cluster.id)]);
        setArticles(related);
      } catch (error) {
        console.error('Failed to fetch related articles:', error);
      } finally {
        setLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.1 }}
      className="relative pl-16 pb-16 border-l-2 border-zinc-800 last:border-l-0 group"
    >
      <div className={cn(
        "absolute left-[-13px] top-0 w-6 h-6 rounded-full border-4 border-zinc-950 flex items-center justify-center z-10 transition-all duration-500",
        cluster.impact_level >= 4 ? "bg-destructive shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
      )}>
        <Zap className="w-3 h-3 text-white" />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 hover:border-primary/50 transition-all backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Globe className="w-32 h-32" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-full">
              <Calendar className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                {cluster.start_date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
              cluster.impact_level >= 4 ? "border-destructive/50 text-destructive bg-destructive/5" : "border-primary/50 text-primary bg-primary/5"
            )}>
              Impact Level {cluster.impact_level}
            </span>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
              cluster.status === 'active' ? "border-green-500/50 text-green-500 bg-green-500/5" : "border-zinc-700 text-zinc-500 bg-zinc-800"
            )}>
              {cluster.status}
            </span>
          </div>

          <h3 className="text-3xl font-black tracking-tighter mb-4 group-hover:text-primary transition-colors leading-none">
            {cluster.title}
          </h3>
          <p className="text-zinc-400 leading-relaxed mb-8 max-w-2xl font-medium">
            {cluster.description}
          </p>

          <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
            <button 
              onClick={toggleExpand}
              className="text-[10px] font-black text-primary hover:text-white flex items-center gap-2 uppercase tracking-[0.2em] transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {cluster.article_ids.length} Intelligence Reports
            </button>
            <Link to={`/cluster/${cluster.id}`} className="text-[10px] font-black text-zinc-500 hover:text-primary flex items-center gap-2 uppercase tracking-[0.2em] transition-colors">
              Strategic Analysis <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loading ? (
                    <div className="col-span-2 py-8 text-center">
                      <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto opacity-20" />
                    </div>
                  ) : articles.length > 0 ? (
                    articles.map(article => (
                      <div key={article.id} className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl hover:border-primary/30 transition-all group/item">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <SourceBadge origin={article.content_origin} isVerified={article.is_verified} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                              {article.source_name}
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                            {article.published_at.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold tracking-tight mb-4 leading-snug group-hover/item:text-primary transition-colors">{article.title}</h4>
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[9px] font-black text-zinc-500 hover:text-primary flex items-center gap-1 uppercase tracking-widest transition-colors"
                        >
                          Source Link <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 py-8 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No detailed reports available.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export const Timeline = () => {
  const [clusters, setClusters] = useState<EventCluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const active = await getEventClusters('active');
        const archived = await getEventClusters('archived');
        setClusters([...active, ...archived]);
      } catch (error) {
        console.error('Failed to fetch timeline:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, []);

  return (
    <div className="space-y-12 pb-20">
      <header className="relative py-20 px-10 bg-zinc-950 text-white rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-50" />
        <div className="scanline opacity-10" />
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
          <History className="w-80 h-80" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              Strategic Archive
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border-l border-white/10 pl-4">
              <Clock className="w-3.5 h-3.5" /> 
              Chronological Reconstruction Active
            </div>
          </div>
          
          <h1 className="text-7xl font-black tracking-tighter leading-[0.85] mb-8 uppercase italic">
            Conflict <br />
            <span className="text-primary">Timeline</span>
          </h1>
          
          <p className="text-xl text-white/50 leading-relaxed font-medium max-w-2xl">
            A high-fidelity chronological reconstruction of major strategic events, 
            diplomatic shifts, and military escalations. Each cluster aggregates 
            multiple intelligence sources into a single strategic narrative.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto pt-10">
        {loading ? (
          <div className="py-40 text-center">
            <Activity className="w-20 h-20 text-primary animate-spin mx-auto mb-8 opacity-20" />
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] animate-pulse">Reconstructing Strategic Timeline...</p>
          </div>
        ) : clusters.length > 0 ? (
          <div className="space-y-0">
            {clusters.map((cluster, idx) => (
              <TimelineEvent key={cluster.id} cluster={cluster} idx={idx} />
            ))}
          </div>
        ) : (
          <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-zinc-900/20 relative overflow-hidden">
            <div className="scanline opacity-5" />
            <History className="w-24 h-24 text-white/5 mx-auto mb-8" />
            <h3 className="text-2xl font-black tracking-tighter text-white/20 uppercase mb-4">Timeline is currently empty</h3>
            <p className="text-sm text-white/10 font-medium max-w-md mx-auto leading-relaxed">
              Major strategic events will appear here as they are identified and 
              clustered by the AI engine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


