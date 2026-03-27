import React, { useEffect, useState } from 'react';
import { runDiagnostics, DiagnosticResult } from '../services/diagnosticsService';
import { seedInitialData } from '../services/seedService';
import { AlertCircle, CheckCircle, Info, RefreshCw, Shield, Key, Database, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export const Diagnostics: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  const performCheck = async () => {
    setLoading(true);
    try {
      const res = await runDiagnostics();
      setResults(res);
    } catch (error) {
      console.error('Diagnostic check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedStatus('Seeding data...');
    try {
      await seedInitialData();
      setSeedStatus('Seeding completed successfully.');
      performCheck(); // Refresh diagnostics
    } catch (error: any) {
      console.error('Manual seeding failed:', error);
      setSeedStatus(`Seeding failed: ${error.message}`);
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    performCheck();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-rose-400" />;
      default: return <Info className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'bg-emerald-500/5 border-emerald-500/20';
      case 'warning': return 'bg-amber-500/5 border-amber-500/20';
      case 'error': return 'bg-rose-500/5 border-rose-500/20';
      default: return 'bg-zinc-500/5 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-500" />
            System Diagnostics
          </h1>
          <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
            Configuration Audit • Connectivity Test • Environment Validation
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <Database className={`w-4 h-4 ${seeding ? 'animate-pulse' : ''}`} />
            {seeding ? 'Seeding...' : 'Seed Demo Data'}
          </button>
          
          <button
            onClick={performCheck}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Re-run Diagnostics
          </button>
        </div>
      </header>

      {seedStatus && (
        <div className={`p-4 rounded-xl border text-xs font-mono uppercase tracking-wider ${seedStatus.includes('failed') ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
          {seedStatus}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((res, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={idx}
            className={`p-6 rounded-2xl border flex items-start gap-4 transition-all ${getStatusColor(res.status)}`}
          >
            <div className="mt-1">{getStatusIcon(res.status)}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-zinc-100 uppercase text-xs tracking-wider mb-1">{res.name}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed break-words">{res.message}</p>
              {res.details && (
                <div className="mt-4 bg-black/40 p-3 rounded-xl border border-zinc-800/50">
                  <pre className="text-[10px] font-mono text-zinc-500 overflow-auto max-h-40 whitespace-pre-wrap">
                    {typeof res.details === 'string' ? res.details : JSON.stringify(res.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-8 bg-zinc-900/50 rounded-3xl border border-zinc-800 border-dashed text-center">
        <div className="max-w-md mx-auto space-y-4">
          <Database className="w-12 h-12 text-zinc-800 mx-auto" />
          <h3 className="text-lg font-bold text-zinc-500 uppercase tracking-widest">Diagnostic Summary</h3>
          <p className="text-sm text-zinc-600 leading-relaxed">
            This dashboard provides a real-time view of the application's health. 
            If you see <span className="text-rose-500 font-bold">Errors</span>, check your environment variables in the platform settings. 
            <span className="text-amber-500 font-bold">Warnings</span> usually indicate optional features that are not configured.
          </p>
        </div>
      </div>
    </div>
  );
};
