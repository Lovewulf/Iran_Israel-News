import React, { useState, useEffect } from 'react';
import { Database, Plus, Edit2, Trash2, Activity, RefreshCw, Globe, Rss, Youtube, FileText, CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react';
import { Source } from '../types';
import { getSources, addSource, updateSource, deleteSource, testSourceConnection } from '../services/firestoreService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const sourceIcons = {
  rss: Rss,
  news_api: Globe,
  youtube: Youtube,
  manual: FileText
};

const SourceCard = ({ source, onEdit, onDelete, onTest }: { 
  source: Source; 
  onEdit: (s: Source) => void; 
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
}) => {
  const Icon = sourceIcons[source.type];
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testSourceConnection(source.id!);
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{source.name}</h3>
            <p className="text-xs text-muted-foreground uppercase">{source.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTest(source.id!)}
            disabled={testing}
            className="p-2 text-muted-foreground hover:text-primary transition-colors"
            title="Test connection"
          >
            {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onEdit(source)}
            className="p-2 text-muted-foreground hover:text-blue-500 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(source.id!)}
            className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {source.url && (
        <p className="text-sm text-muted-foreground mb-2 truncate">{source.url}</p>
      )}

      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-3">
          <span className={cn(
            "flex items-center gap-1",
            source.is_active ? "text-green-500" : "text-red-500"
          )}>
            {source.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {source.is_active ? "Active" : "Inactive"}
          </span>
          <span className="text-muted-foreground">
            Fetch every {source.fetch_interval_minutes} min
          </span>
        </div>
        {source.last_fetch && (
          <span className="text-muted-foreground">
            Last: {source.last_fetch.toDate().toLocaleString()}
          </span>
        )}
      </div>

      {testResult && (
        <div className={cn(
          "mt-3 p-2 rounded text-xs flex items-center gap-2",
          testResult.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )}>
          {testResult.success ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {testResult.message}
        </div>
      )}
    </motion.div>
  );
};

const SourceFormModal = ({ source, onClose, onSave }: { 
  source?: Source; 
  onClose: () => void; 
  onSave: (data: Partial<Source>) => Promise<void>;
}) => {
  const [name, setName] = useState(source?.name || '');
  const [type, setType] = useState<Source['type']>(source?.type || 'rss');
  const [url, setUrl] = useState(source?.url || '');
  const [fetchInterval, setFetchInterval] = useState(source?.fetch_interval_minutes || 15);
  const [isActive, setIsActive] = useState(source?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name, type, url, fetch_interval_minutes: fetchInterval, is_active: isActive });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">{source ? 'Edit Source' : 'Add Source'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-border rounded bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Source['type'])}
              className="w-full p-2 border border-border rounded bg-background"
            >
              <option value="rss">RSS Feed</option>
              <option value="news_api">News API</option>
              <option value="youtube">YouTube</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL / Endpoint</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full p-2 border border-border rounded bg-background"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fetch Interval (minutes)</label>
            <input
              type="number"
              value={fetchInterval}
              onChange={(e) => setFetchInterval(parseInt(e.target.value))}
              className="w-full p-2 border border-border rounded bg-background"
              min="5"
              max="1440"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              id="isActive"
            />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 👇 KEY CHANGE: Default export instead of named export
export default function Sources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | undefined>(undefined);

  const loadSources = async () => {
    try {
      const data = await getSources();
      setSources(data);
    } catch (error) {
      console.error('Failed to load sources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleSave = async (data: Partial<Source>) => {
    if (editingSource?.id) {
      await updateSource(editingSource.id, data);
    } else {
      await addSource(data as Omit<Source, 'id'>);
    }
    await loadSources();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this source?')) {
      await deleteSource(id);
      await loadSources();
    }
  };

  const handleTest = async (id: string) => {
    // Test logic is inside SourceCard
    await loadSources(); // Refresh to show test result if stored
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading data sources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8 text-primary" />
            Intelligence Sources
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage RSS feeds, APIs, and other data sources for real-time intelligence gathering.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSource(undefined);
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Add Source
        </button>
      </div>

      {sources.length === 0 ? (
        <div className="text-center py-16 bg-muted/20 rounded-lg">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-xl font-semibold">No sources configured</h3>
          <p className="text-muted-foreground mt-1">
            Add your first intelligence source to begin data ingestion.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map(source => (
            <SourceCard
              key={source.id}
              source={source}
              onEdit={(s) => {
                setEditingSource(s);
                setModalOpen(true);
              }}
              onDelete={handleDelete}
              onTest={handleTest}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <SourceFormModal
            source={editingSource}
            onClose={() => setModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
