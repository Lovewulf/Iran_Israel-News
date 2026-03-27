import React, { useState, useEffect } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Zap } from 'lucide-react';
import { Article } from '../types';
import { getBreakingNews } from '../services/firestoreService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { SourceBadge } from './SourceBadge';

export const BreakingNews = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBreaking = async () => {
      const news = await getBreakingNews(5);
      setArticles(news);
      setLoading(false);
    };
    fetchBreaking();
  }, []);

  if (loading || articles.length === 0) return null;

  const next = () => setCurrentIndex((prev) => (prev + 1) % articles.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length);

  const current = articles[currentIndex];

  return (
    <div className="relative bg-zinc-950 text-white border border-white/10 rounded-3xl p-8 overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-destructive/50" />
      <div className="absolute top-1 left-0 w-full h-px bg-white/5" />
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-destructive/20 border border-destructive/30 rounded-full">
            <div className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-destructive uppercase tracking-[0.2em]">
              Live Alert
            </span>
          </div>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            Intelligence Flash
          </span>
        </div>
        
        {articles.length > 1 && (
          <div className="flex gap-2">
            <button 
              onClick={prev}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={next}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tighter leading-[1.1] text-white">
              {current.title}
            </h2>
            <p className="text-white/60 line-clamp-2 text-sm leading-relaxed font-medium">
              {current.summary || current.content}
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-6 border-t border-white/5">
            <div className="flex items-center gap-4">
              <SourceBadge origin={current.content_origin} isVerified={current.is_verified} />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                {current.source_name}
              </span>
              <div className="w-1 h-1 bg-white/20 rounded-full" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {current.published_at.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <a 
              href={current.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary hover:text-white transition-all flex items-center gap-2"
            >
              Full Intel <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Background Decorative Element */}
      <div className="absolute -bottom-12 -right-12 opacity-5 pointer-events-none">
        <Zap className="w-48 h-48" />
      </div>
    </div>
  );
};
