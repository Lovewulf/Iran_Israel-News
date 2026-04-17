import { useEffect, useState } from 'react';
import { getBreakingNews, getLatestArticles, Article } from '../services/newsService';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [breaking, setBreaking] = useState<Article[]>([]);
  const [recent, setRecent] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const breakingData = await getBreakingNews();
      const recentData = await getLatestArticles(6);
      setBreaking(breakingData);
      setRecent(recentData);
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Iran–Israel Conflict Monitor</h1>
        <p className="text-gray-600 mt-1">Real-time intelligence & news dashboard</p>
      </div>

      {/* Breaking News Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
          <h2 className="text-2xl font-bold text-red-600">BREAKING NEWS</h2>
        </div>
        {breaking.length === 0 ? (
          <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500">
            No breaking news at the moment. Check back soon.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {breaking.map((article) => (
              <a
                key={article.id}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white border-l-4 border-red-600 rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt=""
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{article.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-3">{article.summary}</p>
                  <div className="mt-3 text-xs text-gray-400 flex justify-between">
                    <span>{article.source}</span>
                    <span>{new Date(article.publishedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Recent News */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Latest Updates</h2>
        <div className="space-y-3">
          {recent.map((article) => (
            <a
              key={article.id}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition"
            >
              <div className="flex gap-4">
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt=""
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{article.title}</h3>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{article.summary}</p>
                  <div className="mt-2 text-xs text-gray-400">
                    {article.source} · {new Date(article.publishedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
        <div className="mt-4 text-right">
          <Link to="/live-feed" className="text-blue-600 hover:underline">
            View all news →
          </Link>
        </div>
      </section>
    </div>
  );
}
