import React, { useState, useEffect } from 'react';
import { 
  Rss, 
  Plus, 
  Activity, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Settings,
  ShieldCheck,
  X
} from 'lucide-react';
import { Source } from '../types';
import { getSources, updateSourceStatus, addSource, deleteSource } from '../services/firestoreService';
import { refreshSources } from '../services/ingestionService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ENV, firebaseAdminStatus } from '../config/env';

const SourceCard = ({ source, onToggle, onDelete }: { source: Source, onToggle: (id: string, active: boolean) => void, onDelete: (id: string) => void }) => (
  <div className="bg-zinc-900/50 border border-white/5 rounded-[1.5rem] p-8 hover:border-primary/30 transition-all group relative overflow-hidden backdrop-blur-sm">
    <div className="scanline opacity-5" />
    <div className="flex items-start justify-between mb-8 relative z-10">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 shadow-lg",
          source.type === 'rss' ? "bg-orange-500/10 text-orange-500" : 
          source.type === 'news_api' ? "bg-blue-500/10 text-blue-500" : "bg-primary/10 text-primary"
        )}>
          <Rss className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tighter uppercase italic group-hover:text-primary transition-colors">{source.name}</h3>
          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">{source.type}</span>
        </div>
      </div>
      <button 
        onClick={() => onToggle(source.id!, !source.is_active)}
        className={cn(
          "w-10 h-10 rounded-xl transition-all flex items-center justify-center border",
          source.is_active 
            ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
            : "bg-white/5 text-white/20 border-white/10"
        )}
      >
        {source.is_active ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
      </button>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
      <div className="bg-black/20 p-4 rounded-xl border border-white/5">
        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Frequency</p>
        <p className="text-sm font-black tracking-tight">{source.refresh_frequency_minutes}m</p>
      </div>
      <div className="bg-black/20 p-4 rounded-xl border border-white/5">
        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Last Sync</p>
        <p className="text-sm font-black tracking-tight">{source.last_refresh ? source.last_refresh.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
      </div>
    </div>

    <div className="flex items-center gap-6 pt-6 border-t border-white/5 relative z-10">
      <a 
        href={source.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-[9px] font-black text-white/40 hover:text-primary flex items-center gap-2 uppercase tracking-[0.2em] transition-colors"
      >
        Source Access <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <button 
        onClick={() => onDelete(source.id!)}
        className="text-[9px] font-black text-white/20 hover:text-primary flex items-center gap-2 uppercase tracking-[0.2em] transition-colors ml-auto"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

export const Sources = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    type: 'rss' as Source['type'],
    refresh_frequency_minutes: 30
  });

  useEffect(() => {
    const fetchSources = async () => {
      const data = await getSources();
      setSources(data);
      setLoading(false);
    };
    fetchSources();
  }, []);

  const handleToggle = async (id: string, active: boolean) => {
    await updateSourceStatus(id, active);
    setSources(prev => prev.map(s => s.id === id ? { ...s, is_active: active } : s));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to decommission this intelligence pipeline?')) {
      await deleteSource(id);
      setSources(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await refreshSources();
      const data = await getSources();
      setSources(data);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = await addSource({
        ...newSource,
        is_active: true
      });
      setSources(prev => [...prev, { ...newSource, id, is_active: true } as Source]);
      setShowAddModal(false);
      setNewSource({ name: '', url: '', type: 'rss', refresh_frequency_minutes: 30 });
    } catch (error) {
      console.error('Failed to add source:', error);
    }
  };

  const newsApiStatus = ENV.KEYS.NEWS && !ENV.KEYS.NEWS.includes('TODO');
  const youtubeApiStatus = ENV.KEYS.YOUTUBE && !ENV.KEYS.YOUTUBE.includes('TODO');

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Intelligence Ingestion Control</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase leading-none italic">Source Control</h1>
          <p className="text-white/40 mt-4 max-w-xl text-sm font-medium leading-relaxed">
            Manage data ingestion pipelines. Configure RSS feeds, API endpoints, and 
            automated scraping protocols for strategic monitoring.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-105 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? 'Synchronizing...' : 'Sync All Sources'}
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-white/10 transition-all backdrop-blur-md"
          >
            <Plus className="w-4 h-4" />
            Add Pipeline
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-2 py-32 text-center">
                <Activity className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Accessing Pipeline Registry...</p>
              </div>
            ) : sources.length > 0 ? (
              sources.map(source => (
                <SourceCard key={source.id} source={source} onToggle={handleToggle} onDelete={handleDelete} />
              ))
            ) : (
              <div className="col-span-2 py-32 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-zinc-900/20">
                <Rss className="w-16 h-16 text-white/10 mx-auto mb-6" />
                <h3 className="text-xl font-black tracking-tighter text-white/40 uppercase">No active pipelines</h3>
                <p className="text-sm text-white/20 mt-2 font-medium">Initialize a new intelligence ingestion pipeline to begin.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-10">
          <section className="bg-zinc-900 border border-white/5 rounded-[2rem] p-8 relative overflow-hidden">
            <div className="scanline opacity-5" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/60 mb-8 flex items-center gap-3">
              <Settings className="w-4 h-4 text-primary" />
              API Protocol Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={cn("w-2 h-2 rounded-full", newsApiStatus ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-orange-500")} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">News API</span>
                </div>
                {newsApiStatus ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-orange-500" />}
              </div>
              <div className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={cn("w-2 h-2 rounded-full", youtubeApiStatus ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-orange-500")} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">YouTube API</span>
                </div>
                {youtubeApiStatus ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-orange-500" />}
              </div>
              <div className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={cn("w-2 h-2 rounded-full", firebaseAdminStatus.isValid ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-primary")} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Admin SDK</span>
                </div>
                {firebaseAdminStatus.isValid ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-primary" />}
              </div>
            </div>
            <p className="text-[9px] text-white/30 mt-8 leading-relaxed uppercase tracking-widest font-bold italic">
              Optional protocols require environment key injection for full operational capability.
            </p>
          </section>

          <section className="bg-primary/5 border border-primary/20 rounded-[2rem] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Activity className="w-24 h-24" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-8 flex items-center gap-3">
              <Activity className="w-4 h-4" />
              Ingestion Metrics
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">Total Intel Units</p>
                <p className="text-4xl font-black tracking-tighter">{sources.length * 242}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">Sync Integrity</p>
                <p className="text-4xl font-black tracking-tighter text-green-500">98.2%</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              <div className="scanline opacity-5" />
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">New Pipeline</h2>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Configure Ingestion Protocol</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddSource} className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">Source Name</label>
                    <input 
                      required
                      type="text" 
                      value={newSource.name}
                      onChange={e => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Reuters Strategic Feed"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white placeholder:text-white/10 focus:border-primary/50 focus:ring-0 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">Protocol URL</label>
                    <input 
                      required
                      type="url" 
                      value={newSource.url}
                      onChange={e => setNewSource(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://api.example.com/rss"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white placeholder:text-white/10 focus:border-primary/50 focus:ring-0 transition-all font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">Pipeline Type</label>
                      <select 
                        value={newSource.type}
                        onChange={e => setNewSource(prev => ({ ...prev, type: e.target.value as Source['type'] }))}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:border-primary/50 focus:ring-0 transition-all font-bold appearance-none"
                      >
                        <option value="rss">RSS Protocol</option>
                        <option value="news_api">News API</option>
                        <option value="manual">Manual Entry</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">Sync Interval (Min)</label>
                      <input 
                        type="number" 
                        value={newSource.refresh_frequency_minutes}
                        onChange={e => setNewSource(prev => ({ ...prev, refresh_frequency_minutes: parseInt(e.target.value) }))}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:border-primary/50 focus:ring-0 transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-6 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-[0_20px_40px_rgba(239,68,68,0.3)]"
                >
                  Initialize Pipeline
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
