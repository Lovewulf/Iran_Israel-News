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
  Search,
} from 'lucide-react';
import { BreakingNews } from '../components/BreakingNews';
import { Article, EventCluster, AIReport } from '../types';
import { getArticles, getEventClusters, getAIReports } from '../services/firestoreService';
import { ensureInitialContent, refreshSources } from '../services/ingestionService';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { SourceBadge } from '../components/SourceBadge';

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-3">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

const IntelligenceTicker = ({ articles }: { articles: Article[] }) => {
  if (!articles.length) return null;

  const tickerItems = articles.slice(0, 8);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card/70">
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Live ticker
        </span>
        <span className="text-[11px] text-muted-foreground">
          Rolling headlines from the latest ingested reports
        </span>
      </div>

      <div className="overflow-hidden whitespace-nowrap px-4 py-3">
        <div className="flex animate-[marquee_55s_linear_infinite] gap-10">
          {[...tickerItems, ...tickerItems].map((article, i) => (
            <div key={`${article.id}-${i}`} className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="max-w-[420px] truncate text-xs font-medium text-foreground/90">
                {article.title}
              </span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {article.source_name}
              </span>
            </div>
          ))}
        </div>
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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      {regions.map((region) => (
        <div
          key={region.name}
          className="relative overflow-hidden rounded-xl border border-border bg-card/70 p-4"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {region.name}
            </span>
            {region.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-primary" />}
            {region.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-green-500" />}
          </div>

          <div className="mb-2 flex items-end gap-2">
            <span className="text-2xl font-semibold tracking-tight">{region.risk}%</span>
            <span className="pb-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Risk
            </span>
          </div>

          <p
            className={cn(
              'text-[11px] font-medium',
              region.risk > 80 ? 'text-primary' : region.risk > 50 ? 'text-orange-500' : 'text-green-600'
            )}
          >
            {region.status}
          </p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full',
                region.risk > 80 ? 'bg-primary' : region.risk > 50 ? 'bg-orange-500' : 'bg-green-500'
              )}
              style={{ width: `${region.risk}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
  trend,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  trend?: string;
}) => (
  <div className="rounded-xl border border-border bg-card/70 p-5 shadow-sm transition-colors hover:border-primary/20">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color)}>
        <Icon className="h-5 w-5" />
      </div>
      {trend && (
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  </div>
);

const EventClusterCard = ({ cluster }: { cluster: EventCluster }) => (
  <div className="group rounded-xl border border-border bg-card/70 p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            cluster.impact_level >= 4 ? 'bg-destructive' : 'bg-orange-500'
          )}
        />
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Impact {cluster.impact_level}
        </span>
      </div>

      <Link
        to={`/cluster/${cluster.id}`}
        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>

    <h3 className="mb-2 text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
      {cluster.title}
    </h3>

    <p className="mb-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
      {cluster.description}
    </p>

    <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        {cluster.article_ids.length} reports
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        {cluster.start_date.toDate().toLocaleDateString()}
      </span>
    </div>
  </div>
);

const IntelligenceGallery = ({ articles }: { articles: Article[] }) => {
  const imageArticles = articles.filter((a) => a.image_url).slice(0, 6);

  if (!imageArticles.length) return null;

  return (
    <section className="space-y-5">
      <SectionHeader
        icon={ImageIcon}
        title="Visual intelligence"
        subtitle="Image-backed reports from ingested sources"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {imageArticles.map((article, idx) => (
          <motion.a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-card"
          >
            <img
              src={article.image_url}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="mb-2 flex items-center gap-2">
                <SourceBadge origin={article.content_origin} isVerified={article.is_verified} />
                <span className="text-[10px] text-white/70">{article.source_name}</span>
              </div>
              <h4 className="line-clamp-2 text-sm font-medium leading-5 text-white">
                {article.title}
              </h4>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
};

const StrategicMap = () => (
  <section className="relative overflow-hidden rounded-2xl border border-border bg-card/70 p-6">
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        <h2 className="inline-flex items-center gap-2 text-base font-semibold tracking-tight">
          <MapIcon className="h-4 w-4 text-primary" />
          Regional strategic map
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Spatial monitoring placeholder for sector overlays and incident layers
        </p>
      </div>

      <div className="flex gap-2">
        <button className="rounded-lg border border-border bg-background p-2 text-muted-foreground transition-colors hover:text-foreground">
          <Layers className="h-4 w-4" />
        </button>
        <button className="rounded-lg border border-border bg-background p-2 text-muted-foreground transition-colors hover:text-foreground">
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>

    <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border bg-muted/30">
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-20">
        {Array.from({ length: 72 }).map((_, i) => (
          <div key={i} className="border-[0.5px] border-border/60" />
        ))}
      </div>

      <div className="relative flex h-full items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Sector monitoring active
          </p>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
        <div className="inline-flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-destructive" />
          High risk
        </div>
        <div className="inline-flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-orange-500" />
          Active intel
        </div>
        <div className="inline-flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          Safe zone
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
        getAIReports(3),
      ]);

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
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-3">
        <RefreshCw className="h-10 w-10 animate-spin text-primary/40" />
        <p className="text-sm text-muted-foreground">Synchronizing intelligence feed…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-card/80 px-8 py-8 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent" />
        <div className="relative z-10 max-w-4xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Live strategic monitor
            </span>
            <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Network active
            </span>
          </div>

          <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Strategic situation report
          </h1>

          <p className="mb-6 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Real-time multi-source monitoring of regional conflict developments, source activity,
            event clusters, and AI-assisted assessments.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing ? 'animate-spin' : '')} />
              {refreshing ? 'Refreshing' : 'Refresh intelligence'}
            </button>

            <Link
              to="/reports"
              className="rounded-xl border border-border bg-background px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted"
            >
              Open assessments
            </Link>
          </div>
        </div>
      </header>

      <IntelligenceTicker articles={articles} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Active clusters"
          value={clusters.length}
          color="bg-primary/10 text-primary"
          trend="+2 new"
        />
        <StatCard
          icon={TrendingUp}
          label="Reports (24h)"
          value={articles.length}
          color="bg-blue-500/10 text-blue-600"
          trend="+15%"
        />
        <StatCard
          icon={BarChart3}
          label="Strategic risk"
          value="Elevated"
          color="bg-orange-500/10 text-orange-600"
        />
        <StatCard
          icon={ShieldAlert}
          label="Threat level"
          value="Level 4"
          color="bg-destructive/10 text-destructive"
        />
      </div>

      <section className="space-y-5">
        <SectionHeader
          icon={Activity}
          title="Regional risk heatmap"
          subtitle="Current operational risk posture by monitored sector"
        />
        <StrategicHeatmap />
      </section>

      <StrategicMap />
      <IntelligenceGallery articles={articles} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <section>
            <BreakingNews />
          </section>

          <section className="space-y-5">
            <SectionHeader
              icon={Zap}
              title="Strategic event clusters"
              subtitle="Grouped operational themes and evolving developments"
              action={
                <Link
                  to="/timeline"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View timeline
                  <ChevronRight className="h-4 w-4" />
                </Link>
              }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {clusters.length > 0 ? (
                clusters.map((cluster) => <EventClusterCard key={cluster.id} cluster={cluster} />)
              ) : (
                <div className="col-span-2 rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
                  <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No active clusters detected in the current cycle.
                  </p>
                </div>
              )}
            </div>
          </section>

          {reports.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-primary/15 bg-primary/[0.04] p-6">
              <SectionHeader
                icon={Zap}
                title="AI strategic assessment"
                subtitle="Latest synthesized reading from stored intelligence items"
              />

              <div className="mt-5 rounded-xl border border-border bg-background p-5 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold tracking-tight">{reports[0].title}</h3>
                <p className="mb-5 text-sm leading-7 text-muted-foreground">{reports[0].summary}</p>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Impact score
                      </p>
                      <p className="text-lg font-semibold text-primary">
                        {reports[0].impact_score}/10
                      </p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Status
                      </p>
                      <p className="text-lg font-semibold">{reports[0].status}</p>
                    </div>
                  </div>

                  <Link
                    to={`/reports/${reports[0].id}`}
                    className="rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-white transition hover:bg-primary"
                  >
                    Full analysis
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <section className="space-y-5">
            <SectionHeader
              icon={Clock}
              title="Latest intel"
              subtitle="Newest ingested reports and source-linked items"
              action={
                <Link to="/feed" className="text-xs font-medium text-primary hover:underline">
                  All feed
                </Link>
              }
            />

            <div className="space-y-3">
              {articles.length > 0 ? (
                articles.slice(0, 8).map((article, idx) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="rounded-xl border border-border bg-card/70 p-4 transition hover:border-primary/20"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <SourceBadge origin={article.content_origin} isVerified={article.is_verified} />
                        <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-primary">
                          {article.source_name}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {article.published_at.toDate().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="mb-3 line-clamp-2 text-sm font-medium leading-6 tracking-tight">
                      {article.title}
                    </h4>

                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition hover:text-primary"
                    >
                      Original source
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </motion.div>
                ))
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No recent intelligence available.</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-zinc-950 p-5 text-white">
            <h3 className="mb-5 inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Database className="h-4 w-4 text-primary" />
              Ingestion health
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs">RSS feeds</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/60">Active</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs">News API</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/60">Active</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <span className="text-xs">YouTube</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/60">Limited</span>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.14em] text-white/50">
                  Database sync
                </span>
                <span className="text-[10px] text-green-400">99.9%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[99.9%] bg-primary" />
              </div>
            </div>
          </section>
        </aside>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
};
