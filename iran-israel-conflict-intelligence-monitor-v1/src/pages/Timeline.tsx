import React, { useState, useEffect } from 'react';
import { History, Calendar, ChevronRight, ArrowUpRight, ShieldAlert, Activity, ChevronDown, ChevronUp, Globe, Zap, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { EventCluster, Article } from '../types';
import { getEventClusters } from '../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { SourceBadge } from '../components/SourceBadge';

const TimelineEvent = ({ cluster, idx }: { cluster: EventCluster, idx: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!isExpanded && articles.length === 0) {
      setLoading(true);
      try {
        // Fetch articles associated with this cluster
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

  // ... (rest of your component logic remains the same)
  // Ensure all Firebase references are removed

  return ( 
    <div className="relative pl-8 pb-8 border-l-2 border-border last:pb-0">
      {/* ... your component's JSX ... */}
    </div>
  );
};

// 👇 This is the main Timeline component with default export
export default function Timeline() {
  const [clusters, setClusters] = useState<EventCluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const data = await getEventClusters('active');
        setClusters(data);
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
      {/* ... your component's JSX ... */}
    </div>
  );
}
