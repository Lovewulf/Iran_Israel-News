import { useEffect, useState, useRef, useCallback } from 'react';
import { getLatestArticles, Article } from '../services/newsService';

export default function LiveFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastArticleRef = useRef<HTMLDivElement | null>(null);

  const ARTICLES_PER_PAGE = 20;

  const loadArticles = useCallback(async (pageNum: number, reset = false) => {
    try {
      const allArticles = await getLatestArticles(pageNum * ARTICLES_PER_PAGE);
      const newArticles = allArticles.slice((pageNum - 1) * ARTICLES_PER_PAGE, pageNum * ARTICLES_PER_PAGE);
      
      if (reset) {
        setArticles(newArticles);
      } else {
        setArticles(prev => [...prev, ...newArticles]);
      }
      
      setHasMore(newArticles.length === ARTICLES_PER_PAGE);
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles(1, true);
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage(prev => prev + 1);
        loadArticles(page + 1);
      }
    });
    
    if (lastArticleRef.current) {
      observerRef.current.observe(lastArticleRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, page, loadArticles]);

  if (loading && articles.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Live News Feed</h1>
        <p className="text-gray-600 mt-1">Real-time updates from global news sources</p>
      </div>

      <div className="space-y-4">
        {articles.map((article, index) => (
          <article
            key={article.id}
            ref={index === articles.length - 1 ? lastArticleRef : null}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
          >
            <a href={article.link} target="_blank" rel="noopener noreferrer" className="block">
              <div className="md:flex">
                {article.imageUrl && (
                  <div className="md:w-48 h-48 md:h-auto">
                    <img
                      src={article.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="bg-gray-100 px-2 py-1 rounded">{article.source}</span>
                    <span>•</span>
                    <span>{new Date(article.publishedAt).toLocaleString()}</span>
                    {article.isBreaking && (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">BREAKING</span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600">
                    {article.title}
                  </h2>
                  <p className="text-gray-600 line-clamp-3">{article.summary}</p>
                  <div className="mt-3 text-blue-500 text-sm font-medium">
                    Read full article →
                  </div>
                </div>
              </div>
            </a>
          </article>
        ))}
      </div>

      {loading && articles.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      )}

      {!hasMore && articles.length > 0 && (
        <div className="text-center text-gray-500 py-8">
          You've reached the end – no more articles.
        </div>
      )}

      {articles.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
          <p className="text-lg">No news articles yet.</p>
          <p className="text-sm mt-2">Run the ingestion endpoint to fetch latest news.</p>
        </div>
      )}
    </div>
  );
}

export default LiveFeed;
