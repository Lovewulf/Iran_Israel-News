import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Rss, 
  History, 
  FileText, 
  Settings, 
  Activity,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const NavItem = ({ to, icon: Icon, label, active }: NavItemProps) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg",
      active 
        ? "bg-primary text-primary-foreground" 
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    )}
  >
    <Icon className="w-5 h-5" />
    {label}
  </Link>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Strategic Overview' },
    { to: '/feed', icon: Activity, label: 'Live Intel Feed' },
    { to: '/timeline', icon: History, label: 'Historical Timeline' },
    { to: '/reports', icon: FileText, label: 'AI Assessments' },
    { to: '/sources', icon: Rss, label: 'Source Control' },
    { to: '/diagnostics', icon: ShieldAlert, label: 'System Health' },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-zinc-950 flex flex-col relative">
        <div className="scanline opacity-20" />
        
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-none">SENTINEL</h1>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Intelligence</span>
            </div>
          </div>
          <div className="mt-6 space-y-1">
            <div className="flex items-center justify-between text-[9px] font-bold text-white/40 uppercase tracking-widest">
              <span>Security Level</span>
              <span className="text-primary">Classified</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="w-full h-full bg-primary/40" />
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 text-xs font-black uppercase tracking-[0.15em] transition-all rounded-xl border border-transparent",
                location.pathname === item.to 
                  ? "bg-primary text-white shadow-[0_0_20px_rgba(239,68,68,0.2)] border-primary/50" 
                  : "text-white/50 hover:text-white hover:bg-white/5 hover:border-white/10"
              )}
            >
              <item.icon className={cn("w-5 h-5", location.pathname === item.to ? "text-white" : "text-primary/60")} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=agent-001" alt="Agent" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-950 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate uppercase tracking-widest">Agent-001</p>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Senior Analyst</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background relative">
        <div className="absolute inset-0 intelligence-grid opacity-30 pointer-events-none" />
        <div className="container mx-auto py-10 px-10 max-w-7xl relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
};
