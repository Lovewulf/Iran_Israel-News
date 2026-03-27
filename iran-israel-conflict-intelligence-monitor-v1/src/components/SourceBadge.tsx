import React from 'react';
import { ShieldCheck, Database, FlaskConical, Globe } from 'lucide-react';
import { cn } from '../lib/utils';

interface SourceBadgeProps {
  origin?: 'live_rss' | 'news_api' | 'youtube' | 'internal' | 'demo';
  isVerified?: boolean;
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ origin, isVerified, className }) => {
  if (isVerified) {
    return (
      <div className={cn("flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] font-black text-blue-500 uppercase tracking-widest", className)}>
        <ShieldCheck className="w-2.5 h-2.5" />
        Verified Source
      </div>
    );
  }

  switch (origin) {
    case 'internal':
      return (
        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[8px] font-black text-primary uppercase tracking-widest", className)}>
          <Database className="w-2.5 h-2.5" />
          Internal Report
        </div>
      );
    case 'demo':
      return (
        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 bg-zinc-500/10 border border-zinc-500/20 rounded text-[8px] font-black text-zinc-500 uppercase tracking-widest", className)}>
          <FlaskConical className="w-2.5 h-2.5" />
          Demo Content
        </div>
      );
    case 'live_rss':
      return (
        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[8px] font-black text-green-500 uppercase tracking-widest", className)}>
          <Globe className="w-2.5 h-2.5" />
          Live Signal
        </div>
      );
    default:
      return null;
  }
};
