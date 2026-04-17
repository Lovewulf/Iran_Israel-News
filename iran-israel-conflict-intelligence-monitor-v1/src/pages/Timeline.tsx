import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Calendar, Clock, ExternalLink } from 'lucide-react';

interface TimelineArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source_name: string;
  published_at: string;
  image_url: string | null;
}

interface GroupedArticles {
  date: string;
  articles: TimelineArticle[];
}

// Native date formatting (no external libraries)
const formatMonthDayYear = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export default function Timeline() {
  const [groups, setGroups] = useState<GroupedArticles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data, error } = await supabase
          .from('articles')
          .select('id, title, summary, url, source_name, published_at, image_url')
          .gte('published_at', thirtyDaysAgo.toISOString())
          .order('published_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
          setGroups([]);
          setLoading(false);
          return;
        }
        // Group by date (YYYY-MM-DD)
        const grouped: Record<string, TimelineArticle[]> = {};
        data.forEach((article: TimelineArticle) => {
          const dateKey = new Date(article.published_at).toISOString().split('T')[0];
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(article);
        });
        const sortedGroups = Object.entries(grouped)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([date, articles]) => ({ date, articles }));
        setGroups(sortedGroups);
      } catch (err) {
        console.error('Timeline fetch error:', err);
        setError('Failed to load timeline data');
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-red-50 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-700">No events in the last 30 days</h3>
        <p className="text-gray-500 mt-1">Check back later for updates.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">Conflict Timeline</h1>
        <p className="text-gray-500 mt-1">Last 30 days • Chronological order</p>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 w-0.5 bg-gray-200 h-full"></div>

        {groups.map((group, groupIdx) => (
          <div key={group.date} className="mb-12 relative">
            {/* Date marker */}
            <div className="flex justify-center mb-6">
              <div className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-md">
                {formatMonthDayYear(group.date)}
              </div>
            </div>

            {/* Articles for this date */}
            <div className="space-y-6">
              {group.articles.map((article, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <div
                    key={article.id}
                    className={`relative flex flex-col md:flex-row ${
                      isEven ? 'md:flex-row-reverse' : ''
                    } items-start gap-4 md:gap-8`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-md z-10"></div>

                    {/* Card */}
                    <div className={`w-full md:w-5/12 ${isEven ? 'md:text-right' : ''} ml-8 md:ml-0`}>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden border border-gray-100"
                      >
                        {article.image_url && (
                          <div className="h-40 overflow-hidden">
                            <img
                              src={article.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <Clock className="w-3 h-3" />
                            {formatTime(article.published_at)}
                            <span className="mx-1">•</span>
                            <span className="font-medium text-indigo-600">{article.source_name}</span>
                          </div>
                          <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{article.title}</h3>
                          <p className="text-gray-600 text-sm line-clamp-3">
                            {article.summary || 'Click to read full article'}
                          </p>
                          <div className="mt-3 flex items-center gap-1 text-indigo-600 text-sm font-medium">
                            Read more <ExternalLink className="w-3 h-3" />
                          </div>
                        </div>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
