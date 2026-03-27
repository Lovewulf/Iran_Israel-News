import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Zap } from 'lucide-react';
import { Article } from '../types';
import { getBreakingNews } from '../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';
import { SourceBadge } from './SourceBadge';

export const BreakingNews = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBreaking = async () => {
      try {
        const news = await getBreakingNews(5);
        setArticles(news);
      } finally {
        setLoading(false);
      }
    };

    fetchBreaking();
  }, []);

  if (loading || articles.length === 0) return null;

  const next = () => setCurrentIndex((prev) => (prev + 1) % articles.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length);

  const current = articles[currentIndex];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-zinc-950 text-white shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="absolute inset-x-0 top-0 h-1 bg-destructive/60" />

      <div className="relative z-10 p-6 md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
              Breaking
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/45">
              Priority monitor
            </span>
          </div>

          {articles.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Previous breaking article"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={next}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Next breaking article"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="space-y-3">
              <h2 className="max-w-4xl text-2xl font-semibold tracking-tight leading-tight md:text-[30px]">
                {current.title}
              </h2>

              <p className="max-w-3xl line-clamp-2 text-sm leading-6 text-white/65">
                {current.summary || current.content}
              </p>
            </div>

            <div className="flex flex-col gap-4 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <SourceBadge origin={current.content_origin} isVerified={current.is_verified} />

                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
                  {current.source_name}
                </span>

                <span className="h-1 w-1 rounded-full bg-white/25" />

                <span className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                  {current.published_at.toDate().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 self-start rounded-lg bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-primary hover:text-white"
              >
                Open source
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute -bottom-10 -right-10 opacity-[0.04]">
        <Zap className="h-36 w-36" />
      </div>
    </section>
  );
};
