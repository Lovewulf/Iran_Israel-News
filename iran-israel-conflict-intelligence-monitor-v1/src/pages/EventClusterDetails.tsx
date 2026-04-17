import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Activity, 
  ChevronLeft, 
  Calendar, 
  ShieldAlert, 
  Clock, 
  ExternalLink,
  ArrowUpRight,
  FileText,
  Globe,
  Zap,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { EventCluster, Article } from '../types';
import { getEventClusters, getArticles } from '../services/firestoreService';
import { where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const EventClusterDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [cluster, setCluster] = useState<EventCluster | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      const allActive = await getEventClusters('active');
      const allArchived = await getEventClusters('archived');
      const found = [...allActive, ...allArchived].find(c => c.id === id);
      
      if (found) {
        setCluster(found);
        const related = await getArticles(50, [where('cluster_id', '==', id)]);
        setArticles(related);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Activity className="w-12 h-12 text-primary animate-spin opacity-20" />
        <p className="text-muted-foreground font-medium animate-pulse uppercase tracking-widest text-xs">Analyzing Intelligence Cluster...</p>
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="py-24 text-center max-w-md mx-auto">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-6 opacity-20" />
        <h2 className="text-3xl font-black tracking-tighter uppercase mb-4">Cluster Not Found</h2>
        <p className="text-zinc-500 font-medium mb-8">The requested intelligence cluster could not be located in the strategic archive.</p>
        <Link to="/" className="px-6 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all inline-flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="relative py-20 px-10 bg-zinc-950 text-white rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-50" />
        <div className="scanline opacity-10" />
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
          <Globe className="w-80 h-80" />
        </div>
        
        <div className="relative z-10">
          <Link to="/timeline" className="inline-flex items-center gap-3 text-[10px] font-black text-white/40 hover:text-primary uppercase tracking-[0.3em] mb-10 transition-all hover:-translate-x-1">
            <ChevronLeft className="w-4 h-4" /> Back to Strategic Timeline
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="max-w-4xl space-y-8">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border shadow-lg",
                  cluster.impact_level >= 4 
                    ? "border-destructive/50 text-destructive bg-destructive/5 shadow-destructive/20" 
                    : "border-primary/50 text-primary bg-primary/5 shadow-primary/20"
                )}>
                  Impact Level {cluster.impact_level}
                </div>
                <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-green-500/50 text-green-500 bg-green-500/5 shadow-green-500/20">
                  {cluster.status}
                </div>
              </div>
              
              <h1 className="text-7xl font-black tracking-tighter leading-[0.85] uppercase italic">
                {cluster.title}
              </h1>
              
              <div className="flex items-center gap-8 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-3"><Calendar className="w-4 h-4 text-primary" /> {cluster.start_date.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                {cluster.end_date && <span className="flex items-center gap-3"><Clock className="w-4 h-4 text-primary" /> Concluded {cluster.end_date.toDate().toLocaleDateString()}</span>}
              </div>
            </div>
            
            <button className="px-10 py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center gap-4 hover:bg-primary hover:text-white transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:-translate-y-1 active:scale-95">
              <FileText className="w-5 h-5" />
              Synthesize Assessment
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          <section className="bg-zinc-900/50 border border-white/5 rounded-[2rem] p-12 backdrop-blur-sm relative overflow-hidden group">
            <div className="scanline opacity-5" />
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
              <TrendingUp className="w-40 h-40" />
            </div>
            <h2 className="text-xs font-black tracking-[0.3em] uppercase mb-10 flex items-center gap-4 text-white/60">
              <Zap className="w-5 h-5 text-primary" />
              Strategic Narrative
            </h2>
            <p className="text-white/70 leading-relaxed text-2xl font-medium italic">
              "{cluster.description}"
            </p>
          </section>

          <section className="space-y-10">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <h2 className="text-xs font-black tracking-[0.3em] uppercase flex items-center gap-4 text-white/60">
                <FileText className="w-5 h-5 text-primary" />
                Intelligence Feed
              </h2>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                {articles.length} Validated Documents
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {articles.length > 0 ? (
                articles.map((article, idx) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-10 hover:border-primary/30 transition-all group relative overflow-hidden"
                  >
                    <div className="scanline opacity-5" />
                    <div className="flex items-center justify-between mb-6 relative z-10">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                        {article.source_name}
                      </span>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                        {article.published_at.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black tracking-tighter mb-6 group-hover:text-primary transition-colors leading-tight uppercase italic relative z-10">
                      {article.title}
                    </h3>
                    <p className="text-white/40 text-base font-medium line-clamp-3 leading-relaxed mb-8 relative z-10">
                      {article.summary || article.content}
                    </p>
                    <a 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-black text-white/30 hover:text-primary flex items-center gap-3 uppercase tracking-[0.3em] transition-all relative z-10 w-fit"
                    >
                      Access Intelligence Node <ExternalLink className="w-4 h-4" />
                    </a>
                  </motion.div>
                ))
              ) : (
                <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-zinc-900/20">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No detailed reports linked to this cluster.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-12">
          <section className="bg-zinc-900 text-white rounded-[2rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="scanline opacity-5" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 flex items-center gap-3 text-white/60">
              <BarChart3 className="w-4 h-4 text-primary" />
              Strategic Impact
            </h3>
            <div className="space-y-10">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Risk Saturation</span>
                  <span className="text-sm font-black text-primary italic">{cluster.impact_level * 20}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${cluster.impact_level * 20}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={cn(
                      "h-full shadow-[0_0_15px_rgba(239,68,68,0.5)]",
                      cluster.impact_level >= 4 ? "bg-destructive" : "bg-primary"
                    )}
                  />
                </div>
              </div>
              
              <div className="p-8 bg-black/20 rounded-2xl border border-white/5 space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Intelligence Vectors</p>
                <div className="flex flex-wrap gap-3">
                  {['Military', 'Diplomatic', 'Cyber', 'Economic'].map(tag => (
                    <span key={tag} className="px-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] text-white/50">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-primary/5 border border-primary/10 rounded-[2rem] p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5">
              <Activity className="w-32 h-32" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-3 text-primary">
              <Activity className="w-4 h-4" />
              Cluster Metrics
            </h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Intel Units</p>
                <p className="text-5xl font-black tracking-tighter">{cluster.article_ids.length}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Sources</p>
                <p className="text-5xl font-black tracking-tighter">4</p>
              </div>
            </div>
          </section>
          
          <div className="p-10 bg-zinc-950 border border-white/5 rounded-[2rem] relative overflow-hidden">
            <div className="scanline opacity-5" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-white/30">Confidence Index</h4>
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={cn("w-2 h-6 rounded-full", i <= 4 ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-white/5")} />
                ))}
              </div>
              <span className="text-sm font-black text-green-500 uppercase tracking-[0.3em] ml-2 italic">High (88%)</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};


