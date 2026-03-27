import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Clock,
  Database,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  RefreshCw,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

import { Article, EventCluster, AIReport } from '../types';
import { getArticles, getEventClusters, getAIReports } from '../services/firestoreService';
import { ensureInitialContent, refreshSources } from '../services/ingestionService';
import { cn } from '../lib/utils';
import { SourceBadge } from '../components/SourceBadge';

/**
 * ---------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------
 */

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function isInternalUrl(url: string): boolean {
  return /sentinel-intel\.io|localhost|127\.0\.0\.1/i.test(url);
}

function isLikelyRealArticleUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    if (!u.pathname || u.pathname === '/' || u.pathname.trim() === '') return false;
    if (isInternalUrl(url)) return false;
    return true;
  } catch {
    return false;
  }
}

function isLiveExternalArticle(article: Article): boolean {
  return (
    (article.content_origin === 'live_rss' || article.content_origin === 'live_parsed') &&
    isHttpUrl(article.url) &&
    isLikelyRealArticleUrl(article.url)
  );
}

function sortArticlesByPublishedDesc(items: Article[]): Article[] {
  return [...items].sort((a, b) => {
    const aMs = a?.published_at?.toDate?.()?.getTime?.() ?? 0;
    const bMs = b?.published_at?.toDate?.()?.getTime?.() ?? 0;
    return bMs - aMs;
  });
}

function formatDateTime(ts: any) {
  const d = ts?.toDate?.();
  if (!d) return 'Unknown time';

  return d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(ts: any) {
  const d = ts?.toDate?.();
  if (!d) return '--:--';
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * ---------------------------------------------------------
 * UI Atoms
 * ---------------------------------------------------------
 */

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
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

const StatCard = ({
  icon: Icon,
  label,
  value,
  tone,
  note,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone: string;
  note?: string;
}) => (
  <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', tone)}>
        <Icon className="h-4 w-4" />
      </div>
      {note && (
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {note}
        </span>
      )}
    </div>

    <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </p>
    <p className="text-2xl font-semibold tracking-tight">{value}</p>
  </div>
);

const FeaturedLead = ({ article }: { article: Article }) => (
  <a
    href={article.url}
    target="_blank"
    rel="noopener noreferrer"
    className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
  >
    <div className="relative aspect-[16/9] bg-muted">
      {article.image_url ? (
        <img
          src={article.image_url}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-muted/40 text-muted-foreground">
          <ImageIcon className="h-10 w-10 opacity-40" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SourceBadge origin={article.content_origin} isVerified={article.is_verified} />
          <span className="text-[10px] uppercase tracking-[0.14em] text-white/75">
            {article.source_name}
          </span>
          <span className="text-[10px] text-white/50">•</span>
          <span className="text-[10px] text-white/70">{formatDateTime(article.published_at)}</span>
        </div>

        <h3 className="max-w-3xl text-xl font-semibold leading-tight tracking-tight text-white md:text-2xl">
          {article.title}
        </h3>

        <p className="mt-2 max-w-2xl line-clamp-2 text-sm leading-6 text-white/75">
          {article.summary || article.content}
        </p>
      </div>
    </div>
  </a>
);

const NewsCard = ({ article }: { article: Article }) => (
  <article className="overflow-hidden rounded-xl border border-border bg-card/70 shadow-sm transition hover:border-primary/20">
    <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
      <div className="aspect-[16/10] bg-muted">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted/30 text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-40" />
          </div>
        )}
      </div>
    </a>

    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <SourceBadge origin={article.content_origin} isVerified={article.is_verified} />
          <span className="truncate text-[10px] uppercase tracking-[0.12em] text-primary">
            {article.source_name}
          </span>
        </div>

        <span className="shrink-0 text-[10px] text-muted-foreground">
          {formatTime(article.published_at)}
        </span>
      </div>

      <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
        <h3 className="line-clamp-2 text-sm font-semibold leading-6 tracking-tight hover:text-primary">
          {article.title}
        </h3>
      </a>

      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
        {article.summary || article.content}
      </p>

      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
        <span>{formatDateTime(article.published_at)}</span>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-primary"
        >
          Source
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  </article>
);

const FeedRow = ({ article }: { article: Article }) => (
  <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <SourceBadge origin={article.content_origin} isVerified={article.is_verified} />
        <span className="truncate text-[10px] uppercase tracking-[0.12em] text-primary">
          {article.source_name}
        </span>
      </div>

      <span className="shrink-0 text-[10px] text-muted-foreground">
        {formatDateTime(article.published_at)}
      </span>
    </div>

    <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
      <h4 className="mb-2 line-clamp-2 text-sm font-semibold leading-6 tracking-tight hover:text-primary">
        {article.title}
      </h4>
    </a>

    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
      {article.summary || article.content}
    </p>
  </div>
);

const EventClusterCard = ({ cluster }: { cluster: EventCluster }) => (
  <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm transition hover:border-primary/20">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            cluster.impact_level >= 4 ? 'bg-destructive' : 'bg-orange-500'
          )}
        />
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Impact {cluster.impact_level}
        </span>
      </div>

      <Link
        to={`/cluster/${cluster.id}`}
        className="rounded-full p-1 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
      >
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>

    <h3 className="mb-2 text-sm font-semibold tracking-tight">{cluster.title}</h3>
    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{cluster.description}</p>

    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        {cluster.article_ids?.length || 0} linked
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        {cluster.start_date?.toDate?.()?.toLocaleDateString?.() || 'Unknown'}
      </span>
    </div>
  </div>
);

const ReportCard = ({ report }: { report: AIReport }) => (
  <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-primary">
        AI assessment
      </span>
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {report.status}
      </span>
    </div>

    <h3 className="mb-2 text-sm font-semibold tracking-tight">{report.title}</h3>
    <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{report.summary}</p>

    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
      <span>Impact {report.impact_score}/10</span>
      <Link to={`/reports/${report.id}`} className="inline-flex items-center gap-1 hover:text-primary">
        Open
        <ArrowUpRight className="h-3 w-3" />
      </Link>
    </div>
  </div>
);

/**
 * ---------------------------------------------------------
 * Dashboard
 * ---------------------------------------------------------
 */

export const Dashboard = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [clusters, setClusters] = useState<EventCluster[]>([]);
  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRefreshingRef = useRef(false);

  const fetchData = async (forceRefresh = false) => {
    try {
      setError(null);

      if (!forceRefresh) {
        setLoading(true);
      }

      if (forceRefresh && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        setRefreshing(true);
        await refreshSources();
        setRefreshing(false);
        isRefreshingRef.current = false;
      } else if (!forceRefresh) {
        // still ensure content on first load
        await ensureInitialContent();
      }

      const [latestArticles, activeClusters, latestReports] = await Promise.all([
        getArticles(60),
        getEventClusters('active'),
        getAIReports(6),
      ]);

      const liveExternal = sortArticlesByPublishedDesc(
        latestArticles.filter(isLiveExternalArticle)
      );

      setArticles(liveExternal);
      setClusters(activeClusters);
      setReports(latestReports);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      setError(err?.message || 'Failed to load intelligence data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData(true);

    const interval = setInterval(() => {
      fetchData(true);
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const featured = useMemo(() => articles[0], [articles]);
  const gridArticles = useMemo(() => articles.slice(1, 9), [articles]);
  const sidebarArticles = useMemo(() => articles.slice(0, 8), [articles]);
  const imageArticles = useMemo(() => articles.filter((a) => !!a.image_url).slice(0, 6), [articles]);

  if (loading && articles.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-3">
        <RefreshCw className="h-10 w-10 animate-spin text-primary/40" />
        <p className="text-sm text-muted-foreground">Collecting live external news…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-card/80 px-6 py-6 shadow-sm md:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent" />

        <div className="relative z-10 max-w-5xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Live external monitor
            </span>

            <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Auto refresh every 60s
            </span>

            {lastUpdated && (
              <span className="text-[11px] text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <h1 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Real-time conflict intelligence dashboard
          </h1>

          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Live external news, source-linked reporting, event clusters, image-backed stories,
            and AI-assisted assessments refreshed continuously from ingested feeds.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing ? 'animate-spin' : '')} />
              {refreshing ? 'Refreshing' : 'Refresh now'}
            </button>

            <Link
              to="/feed"
              className="rounded-xl border border-border bg-background px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted"
            >
              Open full feed
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Globe}
          label="Live articles"
          value={articles.length}
          tone="bg-primary/10 text-primary"
          note="External only"
        />
        <StatCard
          icon={Activity}
          label="Active clusters"
          value={clusters.length}
          tone="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          icon={BarChart3}
          label="AI reports"
          value={reports.length}
          tone="bg-orange-500/10 text-orange-600"
        />
        <StatCard
          icon={ShieldAlert}
          label="Watch status"
          value={articles.length > 0 ? 'Active' : 'Limited'}
          tone="bg-destructive/10 text-destructive"
        />
      </div>

      {featured ? (
        <section className="space-y-5">
          <SectionHeader
            icon={Zap}
            title="Top live development"
            subtitle="Most recent live external article"
          />
          <FeaturedLead article={featured} />
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No valid live external articles found yet. Refresh again after feeds update.
          </p>
        </div>
      )}

      {imageArticles.length > 0 && (
        <section className="space-y-5">
          <SectionHeader
            icon={ImageIcon}
            title="Images & visual coverage"
            subtitle="Image-backed stories from live external feeds"
          />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {imageArticles.map((article, idx) => (
              <motion.a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-card"
              >
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
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
      )}

      <section className="space-y-5">
        <SectionHeader
          icon={FileText}
          title="Latest live external news"
          subtitle="Real publisher-linked items with timestamps and images where available"
        />

        {gridArticles.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {gridArticles.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
            <p className="text-sm text-muted-foreground">No live external articles to display yet.</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
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
                  <ArrowUpRight className="h-4 w-4" />
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
            <section className="space-y-5">
              <SectionHeader
                icon={BarChart3}
                title="AI strategic assessments"
                subtitle="Synthesized summaries built from stored reports"
                action={
                  <Link
                    to="/reports"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    All reports
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                }
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {reports.slice(0, 4).map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <section className="space-y-5">
            <SectionHeader
              icon={Clock}
              title="Latest feed"
              subtitle="Newest live external items by time"
            />

            <div className="space-y-3">
              {sidebarArticles.length > 0 ? (
                sidebarArticles.map((article) => (
                  <FeedRow key={article.id} article={article} />
                ))
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No recent live feed available.</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-zinc-950 p-5 text-white">
            <h3 className="mb-5 inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Database className="h-4 w-4 text-primary" />
              Ingestion status
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs">RSS ingestion</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/60">
                  Running
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs">Auto refresh</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/60">
                  60 sec
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <span className="text-xs">Optional APIs</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/60">
                  Fallback
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/50">
                Last refresh
              </p>
              <p className="text-xs text-white/80">
                {lastUpdated ? formatDateTime({ toDate: () => lastUpdated }) : 'Not available'}
              </p>
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
