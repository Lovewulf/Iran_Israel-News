import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, AlertTriangle, Shield, FileText, ExternalLink, ArrowLeft, Activity, Clock } from 'lucide-react';
import { EventCluster, Article } from '../types';
import { getEventClusterById, getArticles } from '../services/firestoreService';
import { cn } from '../lib/utils';
import { SourceBadge } from '../components/SourceBadge';

const formatDate = (dateValue: any) => {
  if (!dateValue) return 'Unknown date';
  try {
    const d = new Date(dateValue);
    return d.toLocaleString();
  } catch {
    return 'Invalid date';
  }
};

const severityColors = {
  low: "bg-green-500/10 text-green-500 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20"
};

const ArticleCard = ({ article }: { article: Article }) => (
  <a
    href={article.url}
    target="_blank"
    rel="noopener noreferrer"
    className="block bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all hover:border-primary/30"
  >
    <div className="flex justify-between items-start gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <SourceBadge source={article.source_name} type={article.source_type} />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(article.published_at)}
          </span>
        </div>
        <h4 className="font-semibold text-lg mb-2">{article.title}</h4>
        <p className="text-muted-foreground text-sm line-clamp-2">
          {article.summary || article.content?.slice(0, 200)}
        </p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
    </div>
  </a>
);

export default function EventClusterDetails() {
  const { id } = useParams<{ id: string }>();
  const [cluster, setCluster] = useState<EventCluster | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) {
        setError("No cluster ID provided");
        setLoading(false);
        return;
      }
      try {
        const clusterData = await getEventClusterById(id);
        if (!clusterData) {
          setError("Event cluster not found");
          setLoading(false);
          return;
        }
        setCluster(clusterData);
        if (clusterData.article_ids?.length) {
          const allArticles = await getArticles(50);
          const related = allArticles.filter(a => clusterData.article_ids.includes(a.id || ''));
          setArticles(related);
        }
      } catch (err) {
        console.error("Failed to load cluster details:", err);
        setError("Failed to load event details");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading strategic event details...</p>
        </div>
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="text-center py-16 bg-muted/20 rounded-lg">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h3 className="text-xl font-semibold">Unable to Load Event</h3>
        <p className="text-muted-foreground mt-1">{error || "Cluster not found"}</p>
        <Link to="/timeline" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Timeline
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Link to="/timeline" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Timeline
      </Link>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border", severityColors[cluster.severity])}>
            {cluster.severity.toUpperCase()} IMPACT
          </span>
          <span className="text-xs bg-muted px-3 py-1 rounded-full">
            {cluster.status === 'active' ? '🟢 Active' : '📦 Archived'}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(cluster.start_time)} – {formatDate(cluster.end_time)}
          </span>
        </div>
        <h1 className="text-3xl font-bold mb-4">{cluster.title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">{cluster.description}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {cluster.primary_location && (
          <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
            <MapPin className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Primary Location</p>
              <p className="font-medium">{cluster.primary_location}</p>
            </div>
          </div>
        )}
        {cluster.tags && cluster.tags.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {cluster.tags.map(tag => (
                  <span key={tag} className="text-xs bg-background px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {cluster.ai_summary && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">AI-Generated Strategic Summary</h3>
          </div>
          <p className="text-muted-foreground">{cluster.ai_summary}</p>
        </div>
      )}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Intelligence Sources ({articles.length})
        </h2>
        {articles.length === 0 ? (
          <div className="text-center py-8 bg-muted/10 rounded-lg text-muted-foreground">
            No source articles associated with this event.
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
