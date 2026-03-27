import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  RefreshCw, 
  ExternalLink, 
  Clock, 
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { Article } from '../types';
import { subscribeToArticles } from '../services/firestoreService';
import { refreshSources } from '../services/ingestionService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { SourceBadge } from '../components/SourceBadge';

export const LiveFeed = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToArticles((newArticles) => {
      setArticles(newArticles);
      setLoading(false);
    }, 50);
    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSources();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredArticles = articles
    .filter(a => 
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.source_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Prioritize live RSS
      if (a.content_origin === 'live_rss' && b.content_origin !== 'live_rss') return -1;
      if (a.content_origin !== 'live_rss' && b.content_origin === 'live_rss') return 1;
      return 0;
    });

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Real-Time Signal Intelligence</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">Live Intel Feed</h1>
          <p className="text-white/40 mt-4 max-w-xl text-sm font-medium leading-relaxed">
            Continuous monitoring of global news cycles, social signals, and official reports. 
            Filtered for strategic relevance and regional impact.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="FILTER SIGNALS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-4 bg-zinc-900 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50 w-72 transition-all"
            />
          </div>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-4 bg-primary text-white rounded-2xl hover:scale-105 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
          >
            <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredArticles.map((article, idx) => (
            <motion.div
              key={article.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: Math.min(idx * 0.05, 0.5) }}
              className={cn(
                "bg-zinc-900/50 border border-white/5 rounded-[2rem] p-8 hover:border-primary/30 transition-all group relative overflow-hidden backdrop-blur-sm",
                article.is_breaking && "border-primary/40 bg-primary/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
              )}
            >
              <div className="scanline opacity-5" />
              
              <div className="flex flex-col md:flex-row gap-10 relative z-10">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <SourceBadge origin={article.content_origin} isVerified={article.is_verified} />
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg",
                        article.is_breaking ? "bg-primary text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]" : "bg-white/5 text-white/60"
                      )}>
                        {article.source_name}
                      </span>
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {article.published_at.toDate().toLocaleString()}
                      </span>
                    </div>
                    {article.is_breaking && (
                      <div className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">
                        <AlertCircle className="w-4 h-4" />
                        <span>Breaking Intelligence</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-2xl font-black tracking-tighter leading-tight group-hover:text-primary transition-colors uppercase italic">
                    {article.title}
                  </h3>
                  <p className="text-white/50 text-base leading-relaxed line-clamp-3 font-medium">
                    {article.summary || article.content}
                  </p>

                  <div className="flex items-center gap-6 pt-4">
                    <a 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-black text-primary hover:text-white flex items-center gap-2 uppercase tracking-[0.2em] transition-colors"
                    >
                      Source Report <ExternalLink className="w-4 h-4" />
                    </a>
                    <button className="text-[10px] font-black text-white/40 hover:text-primary flex items-center gap-2 uppercase tracking-[0.2em] transition-colors">
                      Context Analysis <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {article.image_url && (
                  <div className="w-full md:w-72 h-48 rounded-[1.5rem] overflow-hidden border border-white/10 flex-shrink-0 relative group-hover:border-primary/30 transition-colors">
                    <img 
                      src={article.image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredArticles.length === 0 && !loading && (
          <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-zinc-900/20">
            <Activity className="w-16 h-16 text-white/10 mx-auto mb-6" />
            <h3 className="text-xl font-black tracking-tighter text-white/40 uppercase">No matching signals detected</h3>
            <p className="text-sm text-white/20 mt-2 font-medium">Adjust filter parameters or re-synchronize feed.</p>
          </div>
        )}
      </div>
    </div>
  );
};
