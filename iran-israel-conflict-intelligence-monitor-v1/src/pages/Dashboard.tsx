import { useEffect, useState } from 'react';
import { getBreakingNews, getLatestArticles } from '../services/newsService';
import type { Article } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink, Zap } from 'lucide-react';

// Helper to format date safely
const formatDate = (dateValue: any) => {
  if (!dateValue) return 'Recently';
  try {
    const d = new Date(dateValue);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
};

// Helper to get source badge color
const getSourceColor = (source: string) => {
  const colors: Record<string, string> = {
    'Reuters': 'bg-gray-700 text-white',
    'BBC': 'bg-red-600 text-white',
    'Al Jazeera': 'bg-green-700 text-white',
    'Times of Israel': 'bg-blue-800 text-white',
    'Jerusalem Post': 'bg-indigo-700 text-white',
    'AP News': 'bg-yellow-700 text-white',
  };
  return colors[source] || 'bg-gray-500 text-white';
};

export default function Dashboard() {
  const [breaking, setBreaking] = useState<Article[]>([]);
  const [recent, setRecent] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const [breakingData, recentData] = await Promise.all([
          getBreakingNews(),
          getLatestArticles(12) // fetch more for grid
        ]);
        setBreaking(breakingData);
        setRecent(recentData);
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('Failed to load news. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
    const interval = setInterval(loadDashboard, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        <p className="text-gray-500">Loading latest intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Hero article = most recent (first in 'recent' array)
  const heroArticle = recent.length > 0 ? recent[0] : null;
  const restArticles = recent.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Iran–Israel Conflict Monitor</h1>
        <p className="text-gray-600 mt-2 text-lg">Real‑time intelligence & news from global sources</p>
      </div>

      {/* Breaking News Bar (if any) */}
      {breaking.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-600" />
            <span className="font-bold text-red-600 uppercase text-sm">Breaking News</span>
          </div>
          <div className="mt-2 space-y-2">
            {breaking.slice(0, 3).map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:underline"
              >
                <span className="font-semibold">{article.title}</span>
                <span className="text-sm text-gray-500 ml-2">– {article.source_name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Hero Section (Latest Top Story) */}
      {heroArticle && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="md:flex">
            <div className="md:w-1/2">
              {heroArticle.image_url ? (
                <img
                  src={heroArticle.image_url}
                  alt={heroArticle.title}
                  className="w-full h-64 md:h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className="hidden bg-gray-100 w-full h-64 md:h-full flex items-center justify-center text-gray-400">
                No image
              </div>
            </div>
            <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${getSourceColor(heroArticle.source_name)}`}>
                  {heroArticle.source_name}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(heroArticle.published_at)}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                {heroArticle.title}
              </h2>
              <p className="text-gray-600 text-base mb-4 leading-relaxed">
                {heroArticle.summary || heroArticle.content?.slice(0, 200)}...
              </p>
              <a
                href={heroArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-800 transition"
              >
                Read full story <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Recent News Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          📰 Latest Developments
          <span className="text-sm font-normal text-gray-500">from around the world</span>
        </h2>
        {restArticles.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No additional news at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restArticles.map((article) => (
              <article
                key={article.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col"
              >
                {article.image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={article.image_url}
                      alt=""
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getSourceColor(article.source_name)}`}>
                      {article.source_name}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(article.published_at)}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                      {article.title}
                    </a>
                  </h3>
                  <p className="text-gray-500 text-sm line-clamp-3 mb-4">
                    {article.summary || article.content?.slice(0, 120)}...
                  </p>
                  <div className="mt-auto">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 text-sm font-medium hover:underline inline-flex items-center gap-1"
                    >
                      Read more <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* AI Reports teaser */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-8 text-center shadow-sm border border-indigo-100">
        <h2 className="text-2xl font-bold text-gray-900">🤖 AI Intelligence Reports</h2>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
          Daily strategic briefs generated by Google Gemini AI, based on the latest articles.
        </p>
        <Link
          to="/reports"
          className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          View Reports
        </Link>
      </div>

      {/* View all news link */}
      <div className="text-center pt-4">
        <Link to="/live-feed" className="text-blue-600 hover:underline font-medium">
          See all news in Live Feed →
        </Link>
      </div>
    </div>
  );
}
