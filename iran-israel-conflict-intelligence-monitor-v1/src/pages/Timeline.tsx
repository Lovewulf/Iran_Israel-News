import React, { useState, useEffect } from 'react';
import { History, Calendar, ChevronRight, ArrowUpRight, ShieldAlert, Activity, ChevronDown, ChevronUp, Globe, Zap, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { EventCluster, Article } from '../types';
import { getEventClusters, getArticles } from '../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { where } from 'firebase/firestore';
import { SourceBadge } from '../components/SourceBadge';

const TimelineEvent = ({ cluster, idx }: { cluster: EventCluster, idx: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!isExpanded && articles.length === 0) {
      setLoading(true);
      try {
        const related = await getArticles(10, [where('cluster_id', '==', cluster.id)]);
        setArticles(related);
      } catch (error) {
        console.error('Failed to fetch related articles:', error);
      } finally {
        setLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  const impactColor = cluster.impact_level >= 4 ? "bg-destructive shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]";

  return (
    <div className="relative pl-8 pb-8 border-l-2 border-border last:pb-0">
      <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${impactColor}`} />
      <div className="mb-2 text-sm text-muted-foreground">
        {cluster.start_date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium mb-3 ${cluster.impact_level >= 4 ? "border-destructive/50 text-destructive bg-destructive/5" : "border-primary/50 text-primary bg-primary/5"}`}>
        Impact Level {cluster.impact_level} • {cluster.status}
      </div>
      <h3 className="text-xl font-bold mb-2">{cluster.title}</h3>
      <p className="text-muted-foreground mb-3">{cluster.description}</p>
      <button
        onClick={toggleExpand}
        className="flex items-center gap-1 text-sm text-primary hover:underline"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {cluster.article_ids.length} Intelligence Reports • Strategic Analysis
      </button>
      {isExpanded && (
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Activity className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : articles.length > 0 ? (
            articles.map(article => (
              <div key={article.id} className="bg-muted/30 p-3 rounded-lg">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-semibold">{article.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{article.source_name}</span>
                      <span>•</span>
                      <span>{article.published_at.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                    Source <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No detailed reports available.</p>
          )}
        </div>
      )}
    </div>
  );
};

// 👇 This is the key change: a default export for the main component
export default function Timeline() {
  const [clusters, setClusters] = useState<EventCluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const active = await getEventClusters('active');
        const archived = await getEventClusters('archived');
        setClusters([...active, ...archived]);
      } catch (error) {
        console.error('Failed to fetch timeline:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, []);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="w-8 h-8 text-primary" />
            Conflict Timeline
          </h1>
          <p className="text-muted-foreground mt-1">
            A high-fidelity chronological reconstruction of major strategic events, diplomatic shifts, and military escalations. Each cluster aggregates multiple intelligence sources into a single strategic narrative.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Reconstructing Strategic Timeline...</p>
          </div>
        </div>
      ) : clusters.length > 0 ? (
        <div className="space-y-2">
          {clusters.map((cluster, idx) => (
            <TimelineEvent key={cluster.id} cluster={cluster} idx={idx} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-muted/20 rounded-lg">
          <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-xl font-semibold">Timeline is currently empty</h3>
          <p className="text-muted-foreground mt-1">
            Major strategic events will appear here as they are identified and clustered by the AI engine.
          </p>
        </div>
      )}
    </div>
  );
}
