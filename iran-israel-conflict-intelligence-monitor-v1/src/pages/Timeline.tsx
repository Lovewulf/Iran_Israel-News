import React, { useState, useEffect } from 'react';
import { History, Activity, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { EventCluster, Article } from '../types';
import { getEventClusters } from '../services/firestoreService';

const formatDate = (dateValue: any) => {
  if (!dateValue) return 'Unknown date';
  try {
    const d = new Date(dateValue);
    return d.toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
};

const TimelineEvent = ({ cluster, idx }: { cluster: EventCluster; idx: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!isExpanded && articles.length === 0 && cluster.article_ids?.length) {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .in('id', cluster.article_ids);
        if (error) throw error;
        setArticles(data as Article[]);
      } catch (error) {
        console.error('Failed to fetch related articles:', error);
      } finally {
        setLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  const severityColor = {
    low: 'border-green-500 bg-green-50',
    medium: 'border-yellow-500 bg-yellow-50',
    high: 'border-orange-500 bg-orange-50',
    critical: 'border-red-500 bg-red-50',
  }[cluster.severity] || 'border-gray-500 bg-gray-50';

  return (
    <div className="relative pl-8 pb-8 border-l-2 border-gray-200 last:pb-0">
      <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${severityColor.split(' ')[0]} border-2 border-white`} />
      <div className="mb-1 text-sm text-gray-500">
        {formatDate(cluster.start_time)} – {formatDate(cluster.end_time)}
      </div>
      <h3 className="text-xl font-bold mb-2">{cluster.title}</h3>
      <p className="text-gray-600 mb-3">{cluster.description}</p>
      {cluster.primary_location && (
        <div className="text-sm text-gray-500 mb-2">📍 {cluster.primary_location}</div>
      )}
      <button
        onClick={toggleExpand}
        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {cluster.article_ids?.length || 0} related intelligence reports
      </button>
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-2">
              <Activity className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          ) : articles.length > 0 ? (
            articles.map((article) => (
              <div key={article.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-semibold">{article.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{article.source_name}</span>
                      <span>•</span>
                      <span>{formatDate(article.published_at)}</span>
                    </div>
                  </div>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                    Source <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No detailed articles available.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default function Timeline() {
  const [clusters, setClusters] = useState<EventCluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const data = await getEventClusters();
        setClusters(data);
      } catch (error) {
        console.error('Failed to fetch timeline:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-500">Loading strategic timeline...</p>
        </div>
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg">
        <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-xl font-semibold">No events yet</h3>
        <p className="text-gray-500 mt-1">Major strategic events will appear here as they are identified.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-8">
        <History className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Conflict Timeline</h1>
          <p className="text-gray-500 mt-1">Chronological reconstruction of major strategic events.</p>
        </div>
      </div>
      <div className="space-y-2">
        {clusters.map((cluster, idx) => (
          <TimelineEvent key={cluster.id} cluster={cluster} idx={idx} />
        ))}
      </div>
    </div>
  );
}
