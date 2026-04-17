import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, signInWithGoogle, getAuthSafe } from "./firebase";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import LiveFeed from "./pages/LiveFeed";
import Timeline from "./pages/Timeline";
import AIReports from "./pages/AIReports";
import Sources from "./pages/Sources";
import EventClusterDetails from "./pages/EventClusterDetails";
import { Diagnostics } from "./components/Diagnostics";
import { ShieldAlert, LogIn, Activity } from "lucide-react";
import { firebaseClientStatus } from "./config/env";
import { seedInitialData } from "./services/seedService";

// ========== Protected Route Component ==========
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const authSafe = getAuthSafe();

  useEffect(() => {
    if (!authSafe) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(authSafe, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        seedInitialData();
      }
    });
    return () => unsubscribe();
  }, [authSafe]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Activity className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// ========== Login Page ==========
const LoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/", { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Sentinel Intel</h1>
          <p className="text-muted-foreground leading-relaxed">
            Secure access to the Iran-Israel regional conflict intelligence monitor.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? <Activity className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Sign in with Google
          </button>
          {error && (
            <p className="text-xs font-bold text-destructive uppercase tracking-widest bg-destructive/10 py-3 rounded-lg">
              {error}
            </p>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
          Authorized Personnel Only • Restricted Access
        </p>
      </div>
    </div>
  );
};

// ========== Config Required Page ==========
const ConfigRequiredPage = () => (
  <div className="h-screen flex items-center justify-center bg-background px-6">
    <div className="max-w-md w-full space-y-8 text-center">
      <div className="space-y-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Configuration Required</h1>
        <p className="text-muted-foreground leading-relaxed">
          Firebase environment variables are missing. Please configure your project in the settings menu.
        </p>
      </div>
      <div className="p-6 bg-muted/30 rounded-xl border text-left space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Missing Variables:</p>
        <ul className="text-xs font-mono space-y-1">
          {firebaseClientStatus.missing.map(v => (
            <li key={v} className="text-destructive flex items-center gap-2">
              <span className="w-1 h-1 bg-destructive rounded-full" />
              {v}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
        Contact System Administrator for Access
      </p>
    </div>
  </div>
);

// ========== Main App Component ==========
export default function App() {
  const location = useLocation();
  const isDiagnostics = location.pathname === '/diagnostics';

  if (!firebaseClientStatus.isValid && !isDiagnostics) {
    return <ConfigRequiredPage />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/feed" element={<ProtectedRoute><LiveFeed /></ProtectedRoute>} />
      <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><AIReports /></ProtectedRoute>} />
      <Route path="/sources" element={<ProtectedRoute><Sources /></ProtectedRoute>} />
      <Route path="/cluster/:id" element={<ProtectedRoute><EventClusterDetails /></ProtectedRoute>} />
      <Route path="/diagnostics" element={<Diagnostics />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
