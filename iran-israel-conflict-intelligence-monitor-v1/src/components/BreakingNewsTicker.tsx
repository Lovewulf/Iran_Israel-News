import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Zap } from 'lucide-react';

interface BreakingArticle {
  id: string;
  title: string;
  url: string;
  source_name: string;
  published_at: string;
}

export default function BreakingNewsTicker() {
  const [articles, setArticles] = useState<BreakingArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBreakingNews = async () => {
      // Get articles from last 24 hours that are marked breaking or contain keywords
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, url, source_name, published_at')
        .or('is_breaking.eq.true,title.ilike.%breaking%,title.ilike.%urgent%,title.ilike.%developing%')
        .gte('published_at', oneDayAgo.toISOString())
        .order('published_at', { ascending: false })
        .limit(15);
      if (error) console.error('Error fetching breaking news:', error);
      else setArticles(data || []);
      setLoading(false);
    };
    fetchBreakingNews();
    const interval = setInterval(fetchBreakingNews, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="h-10 bg-gray-100 animate-pulse rounded"></div>;
  if (articles.length === 0) return null;

  // Duplicate articles for seamless loop
  const tickerItems = [...articles, ...articles];

  return (
    <div className="w-full bg-red-600 overflow-hidden whitespace-nowrap shadow-md rounded-lg border border-red-700">
      <div className="inline-flex items-center animate-scroll">
        {tickerItems.map((article, idx) => (
          <a
            key={`${article.id}-${idx}`}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-white hover:bg-red-700 transition-colors duration-200"
          >
            <Zap className="w-4 h-4 fill-yellow-300 text-yellow-300" />
            <span className="font-medium">{article.title}</span>
            <span className="text-xs opacity-80">— {article.source_name}</span>
            <span className="text-xs opacity-60 mx-2">•</span>
          </a>
        ))}
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
