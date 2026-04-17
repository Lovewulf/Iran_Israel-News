import { useEffect, useState } from 'react';
import { getBreakingNews, getLatestArticles } from '../services/newsService';
import type { Article } from '../types';
import { Link } from 'react-router-dom';

// Helper to safely format any date value (string, Date, or null)
const formatDate = (dateValue: any) => {
  if (!dateValue) return 'Unknown date';
  try {
    const d = new Date(dateValue);
    return d.toLocaleString();
  } catch {
    return 'Invalid date';
  }
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
          getLatestArticles(6)
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

  return (
    <div className="space-y-8">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Iran–Israel Conflict Monitor</h1>
        <p className="text-gray-600 mt-1">Real‑time intelligence & news dashboard</p>
      </div>

      {/* Breaking News Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
          <h2 className="text-2xl font-bold text-red-600">BREAKING NEWS</h2>
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
            {breaking.length} updates
          </span>
        </div>
        {breaking.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 border border-dashed">
            <p>No breaking news at this moment.</p>
            <p className="text-sm mt-1">Check back soon or run ingestion.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {breaking.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white border-l-4 border-red-600 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col"
              >
                {article.image_url && (
                  <div className="h-44 overflow-hidden bg-gray-100">
                    <img
                      src={article.image_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-4 flex-1">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-red-600">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {article.summary || article.content?.slice(0, 150)}
                  </p>
                  <div className="mt-3 text-xs text-gray-400 flex justify-between items-center">
                    <span className="bg-gray-100 px-2 py-1 rounded">{article.source_name}</span>
                    <span>{formatDate(article.published_at)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Latest Updates */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          📰 Latest Updates
          <span className="text-sm font-normal text-gray-500">from global sources</span>
        </h2>
        <div className="space-y-3">
          {recent.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition border border-gray-100"
            >
              <div className="flex gap-4">
                {article.image_url && (
                  <img
                    src={article.image_url}
                    alt=""
                    className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1">
                    {article.title}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                    {article.summary || article.content?.slice(0, 120)}
                  </p>
                  <div className="mt-2 text-xs text-gray-400 flex gap-3">
                    <span>{article.source_name}</span>
                    <span>•</span>
                    <span>{formatDate(article.published_at)}</span>
                    {article.is_breaking && (
                      <span className="text-red-600 font-semibold">● Breaking</span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
        <div className="mt-6 text-right">
          <Link to="/live-feed" className="text-blue-600 hover:underline font-medium">
            View all news →
          </Link>
        </div>
      </section>

      {/* AI Reports teaser */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">🤖 AI Intelligence Reports</h2>
            <p className="text-gray-600 text-sm">Daily analysis generated by Gemini AI</p>
          </div>
          <Link to="/ai-reports" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            View Reports
          </Link>
        </div>
      </section>
    </div>
  );
}
