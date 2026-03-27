import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  ShieldAlert, 
  Clock, 
  ChevronRight, 
  ArrowUpRight,
  ExternalLink,
  Zap,
  Globe,
  FileText,
  AlertTriangle,
  Database,
  RefreshCw,
  BarChart3,
  Image as ImageIcon,
  Map as MapIcon,
  Layers,
  Search
} from 'lucide-react';
import { BreakingNews } from '../components/BreakingNews';
import { Article, EventCluster, AIReport } from '../types';
import { getArticles, getEventClusters, getAIReports } from '../services/firestoreService';
import { ensureInitialContent, refreshSources } from '../services/ingestionService';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { SourceBadge } from '../components/SourceBadge';

const IntelligenceTicker = ({ articles }: { articles: Article[] }) => {
  return (
    <div className="bg-zinc-950 border-y border-white/5 py-3 overflow-hidden whitespace-nowrap relative">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10" />
      <div className="flex animate-[marquee_60s_linear_infinite] gap-12 items-center">
        {articles.map((article, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">FLASH</span>
            </div>
            <span className="text-xs font-black text-white/80 tracking-tight uppercase">{article.title}</span>
            <span className="text-white/10 font-black tracking-widest">[{article.source_name}]</span>
            <span className="text-white/20">/ / /</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

const StrategicHeatmap = () => {
  const regions = [
    { name: 'Northern Border', risk: 85, trend: 'up', status: 'Critical' },
    { name: 'Southern Sector', risk: 45, trend: 'stable', status: 'Monitored' },
    { name: 'Eastern Front', risk: 92, trend: 'up', status: 'Active Conflict' },
    { name: 'Maritime Zone', risk: 30, trend: 'down', status: 'Stable' },
    { name: 'Cyber Infrastructure', risk: 78, trend: 'up', status: 'High Alert' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {regions.map((region) => (
        <div key={region.name} className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5" />
          <div 
            className={cn(
              "absolute top-0 left-0 h-1 transition-all duration-1000",
              region.risk > 80 ? "bg-primary shadow-[0_0_10px_rgba(239,68,68,0.5)]" : region.risk > 50 ? "bg-orange-500" : "bg-green-500"
            )}
            style={{ width: `${region.risk}%` }}
          />
          
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">{region.name}</span>
            {region.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-primary" />}
            {region.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-green-500" />}
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black tracking-tighter">{region.risk}%</span>
            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Risk</span>
          </div>
          <p className={cn(
            "text-[9px] font-black uppercase tracking-widest",
            region.risk > 80 ? "text-primary" : "text-white/40"
          )}>
            {region.status}
          </p>
        </div>
      ))}
    </div>
  );
};
const StatCard = ({ icon: Icon, label, value, color, trend }: { icon: any, label: string, value: string | number, color: string, trend?: string }) => (
  <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 flex flex-col gap-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden backdrop-blur-sm">
    <div className="scanline opacity-5" />
    <div className="flex items-center justify-between relative z-10">
      <div className={cn("p-4 rounded-2xl border border-white/10 shadow-lg", color)}>
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <span className={cn(
          "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
          trend.startsWith('+') ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-primary/10 text-primary border-primary/20'
        )}>
          {trend}
        </span>
      )}
    </div>
    <div className="relative z-10">
      <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">{label}</p>
      <p className="text-4xl font-black tracking-tighter group-hover:text-primary transition-colors italic uppercase">{value}</p>
    </div>
  </div>
);

const EventClusterCard = ({ cluster }: { cluster: EventCluster }) => (
  <div className="bg-card border rounded-2xl p-6 hover:border-primary/50 transition-all group relative overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300">
    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={`w-2.5 h-2.5 rounded-full ${cluster.impact_level >= 4 ? 'bg-destructive animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-orange-500'}`} />
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Impact Level {cluster.impact_level}
        </span>
      </div>
      <Link to={`/cluster/${cluster.id}`} className="text-muted-foreground hover:text-primary p-1 rounded-full hover:bg-primary/10 transition-colors">
        <ArrowUpRight className="w-5 h-5" />
      </Link>
    </div>
    <h3 className="text-lg font-black tracking-tighter mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
      {cluster.title}
    </h3>
    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-6 font-medium">
      {cluster.description}
    </p>
    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em] pt-4 border-t border-dashed">
      <span className="flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" /> {cluster.article_ids.length} Intel Reports
      </span>
      <span className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> {cluster.start_date.toDate().toLocaleDateString()}
      </span>
    </div>
  </div>
);

const IntelligenceGallery = ({ articles }: { articles: Article[] }) => {
  const imageArticles = articles.filter(a => a.image_url).slice(0, 6);
  
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-xl font-black tracking-tighter uppercase">Visual Intelligence</h2>
        </div>
        <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Geospatial Evidence Feed</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {imageArticles.map((article, idx) => (
          <motion.div 
            key={article.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="relative aspect-[16/10] rounded-2xl overflow-hidden group cursor-pointer border border-white/5 bg-zinc-900"
          >
            <img 
              src={article.image_url} 
              alt={article.title}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100 grayscale group-hover:grayscale-0"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
              <div className="flex items-center gap-2 mb-2">
                <SourceBadge origin={article.content_origin} isVerified={article.is_verified} />
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{article.image_source || article.source_name}</span>
              </div>
              <h4 className="text-sm font-black text-white line-clamp-2 leading-tight tracking-tight group-hover:text-primary transition-colors">{article.title}</h4>
              {article.image_caption && (
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-2 line-clamp-1">{article.image_caption}</p>
              )}
            </div>
            <div className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 border border-white/10">
              <ExternalLink className="w-4 h-4 text-white" />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const StrategicMap = () => (
  <section className="bg-zinc-950 rounded-3xl p-8 border border-white/10 relative overflow-hidden group">
    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/20 blur-[100px] rounded-full" />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
            <MapIcon className="w-6 h-6 text-primary" />
            Regional Strategic Map
          </h2>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-1">Geospatial Intelligence Overlay v4.2</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
            <Layers className="w-4 h-4 text-white" />
          </button>
          <button className="p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
            <Search className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      
      <div className="aspect-[21/9] bg-zinc-900/50 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
        {/* Mock Map Grid */}
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-10">
          {Array.from({ length: 72 }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-white/20" />
          ))}
        </div>
        
        {/* Mock Map Content */}
        <div className="text-center space-y-4 relative z-10">
          <div className="w-20 h-20 border-2 border-primary/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <div className="w-12 h-12 border border-primary/50 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full" />
            </div>
          </div>
          <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Sector Monitoring Active</p>
        </div>
        
        {/* Map Legend */}
        <div className="absolute bottom-6 left-6 flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-destructive rounded-full" />
            <span className="text-[9px] font-bold text-white/40 uppercase">High Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <span className="text-[9px] font-bold text-white/40 uppercase">Active Intel</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-[9px] font-bold text-white/40 uppercase">Safe Zone</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const Dashboard = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [clusters, setClusters] = useState<EventCluster[]>([]);
  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      if (forceRefresh) {
        setRefreshing(true);
        await refreshSources();
        setRefreshing(false);
      } else {
        await ensureInitialContent();
      }

      const [latestArticles, activeClusters, latestReports] = await Promise.all([
        getArticles(12),
        getEventClusters('active'),
        getAIReports(3)
      ]);
      
      // Prioritize live RSS items
      const sortedArticles = [...latestArticles].sort((a, b) => {
        if (a.content_origin === 'live_rss' && b.content_origin !== 'live_rss') return -1;
        if (a.content_origin !== 'live_rss' && b.content_origin === 'live_rss') return 1;
        return 0;
      });

      setArticles(sortedArticles);
      setClusters(activeClusters);
      setReports(latestReports);
    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message || 'Failed to load intelligence data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-12 h-12 text-primary animate-spin opacity-20" />
        <p className="text-muted-foreground font-medium animate-pulse uppercase tracking-widest text-xs">Synchronizing Intelligence Feed...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Hero / Executive Summary Area */}
      <header className="relative py-16 px-10 bg-zinc-950 text-white rounded-[2.5rem] overflow-hidden border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
        <div className="scanline opacity-10" />
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
          <Globe className="w-96 h-96" />
        </div>
        
        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <span className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              LIVE STRATEGIC COMMAND
            </span>
            <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span>Network Active</span>
            </div>
          </div>
          
          <h1 className="text-7xl font-black tracking-tighter leading-[0.85] mb-8 uppercase italic">
            Strategic <br />
            <span className="text-primary not-italic">Situation Report</span>
          </h1>
          
          <p className="text-xl text-white/50 leading-relaxed font-medium mb-10 max-w-2xl">
            Real-time multi-source intelligence aggregation. Monitoring regional conflicts, 
            strategic movements, and geopolitical shifts with AI-driven synthesis.
          </p>

          <div className="flex flex-wrap gap-6">
            <button 
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="px-8 py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl hover:shadow-primary/20"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing ? 'animate-spin' : '')} />
              {refreshing ? 'Synchronizing...' : 'Refresh Intelligence'}
            </button>
            <Link 
              to="/reports"
              className="px-8 py-4 bg-white/5 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-white/10 transition-all border border-white/10 backdrop-blur-md"
            >
              Access Assessments
            </Link>
          </div>
        </div>
      </header>

      <IntelligenceTicker articles={articles} />

      {/* Strategic Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Activity} 
          label="Active Clusters" 
          value={clusters.length} 
          color="bg-primary/10 text-primary" 
          trend="+2 New"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Intel Volume (24h)" 
          value={articles.length} 
          color="bg-blue-500/10 text-blue-500" 
          trend="+15%"
        />
        <StatCard 
          icon={BarChart3} 
          label="Strategic Risk" 
          value="Elevated" 
          color="bg-orange-500/10 text-orange-500" 
        />
        <StatCard 
          icon={ShieldAlert} 
          label="Threat Level" 
          value="Level 4" 
          color="bg-destructive/10 text-destructive" 
        />
      </div>

      {/* Strategic Heatmap Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-xl font-black tracking-tighter uppercase">Regional Risk Heatmap</h2>
        </div>
        <StrategicHeatmap />
      </div>

      {/* Strategic Map Section */}
      <StrategicMap />

      {/* Intelligence Gallery */}
      <IntelligenceGallery articles={articles} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Primary Intelligence */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Breaking News Carousel */}
          <section>
            <BreakingNews />
          </section>

          {/* Active Clusters Section */}
          <section>
            <div className="flex items-center justify-between mb-8 border-b pb-4">
              <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3 uppercase">
                <Zap className="w-6 h-6 text-primary" />
                Strategic Event Clusters
              </h2>
              <Link to="/timeline" className="text-[10px] font-black text-primary hover:underline flex items-center gap-1 uppercase tracking-widest">
                Full Timeline <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clusters.length > 0 ? (
                clusters.map(cluster => (
                  <EventClusterCard key={cluster.id} cluster={cluster} />
                ))
              ) : (
                <div className="col-span-2 py-20 text-center border-2 border-dashed rounded-3xl bg-muted/20">
                  <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No active clusters detected in current cycle.</p>
                </div>
              )}
            </div>
          </section>

          {/* AI Situation Summary Card */}
          {reports.length > 0 && (
            <section className="bg-primary/5 border border-primary/10 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <BarChart3 className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight uppercase">AI Strategic Assessment</h2>
                </div>
                
                <div className="space-y-6">
                  <div className="p-6 bg-white border rounded-2xl shadow-sm">
                    <h3 className="text-lg font-bold mb-3">{reports[0].title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {reports[0].summary}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Impact Score</p>
                          <p className="text-lg font-black text-primary">{reports[0].impact_score}/10</p>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</p>
                          <p className="text-lg font-black uppercase tracking-tighter">{reports[0].status}</p>
                        </div>
                      </div>
                      <Link to={`/reports/${reports[0].id}`} className="px-4 py-2 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-primary transition-colors">
                        Full Analysis
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Feed and Health */}
        <aside className="lg:col-span-4 space-y-12">
          
          {/* Latest Intelligence Feed */}
          <section>
            <div className="flex items-center justify-between mb-8 border-b pb-4">
              <h2 className="text-xl font-black tracking-tighter flex items-center gap-3 uppercase">
                <Clock className="w-5 h-5 text-primary" />
                Latest Intel
              </h2>
              <Link to="/feed" className="text-[10px] font-black text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
                All Feed
              </Link>
            </div>
            
            <div className="space-y-4">
              {articles.length > 0 ? (
                articles.slice(0, 8).map((article, idx) => (
                  <motion.div 
                    key={article.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-card border rounded-xl p-4 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <SourceBadge origin={article.content_origin} isVerified={article.is_verified} />
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-primary">
                          {article.source_name}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                        {article.published_at.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold tracking-tight leading-snug mb-3 group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h4>
                    <a 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] font-black text-muted-foreground hover:text-primary flex items-center gap-1 uppercase tracking-widest"
                    >
                      Source Link <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </motion.div>
                ))
              ) : (
                <div className="py-12 text-center border rounded-xl bg-muted/10">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No recent intelligence.</p>
                </div>
              )}
            </div>
          </section>

          {/* Source Health Panel */}
          <section className="bg-zinc-900 text-white rounded-3xl p-6 border border-white/5">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Ingestion Health
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-xs font-bold uppercase tracking-widest">RSS Feeds</span>
                </div>
                <span className="text-[10px] font-bold text-white/40 uppercase">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-xs font-bold uppercase tracking-widest">News API</span>
                </div>
                <span className="text-[10px] font-bold text-white/40 uppercase">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-xs font-bold uppercase tracking-widest">YouTube</span>
                </div>
                <span className="text-[10px] font-bold text-white/40 uppercase">Limited</span>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Database Sync</span>
                <span className="text-[10px] font-bold text-green-500 uppercase">99.9%</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="w-[99.9%] h-full bg-primary" />
              </div>
            </div>
          </section>

        </aside>
      </div>
    </div>
  );
};
