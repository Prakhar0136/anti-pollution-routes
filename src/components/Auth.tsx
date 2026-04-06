"use client";

import { useState } from "react";
import { supabase } from "../utils/supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ text: "Welcome back!", type: "success" });
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ text: "Account created! You can now sign in.", type: "success" });
      }
    } catch (error: any) {
      setMessage({ text: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage({ text: "Signed out.", type: "success" });
  };

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      minHeight: '100vh',
      background: '#0a0f1e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .auth-input {
          width: 100%;
          padding: 11px 14px;
          background: rgba(15,23,42,0.7);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          color: #e2e8f0;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .auth-input::placeholder { color: #374151; }
        .auth-input:focus {
          background: rgba(15,23,42,0.95);
          border-color: rgba(99,102,241,0.5);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        .auth-btn-primary {
          width: 100%;
          padding: 12px;
          background: rgba(99,102,241,0.9);
          border: 1px solid rgba(99,102,241,0.6);
          border-radius: 12px;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .auth-btn-primary:hover:not(:disabled) {
          background: rgba(99,102,241,1);
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          transform: translateY(-1px);
        }
        .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: 380,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 24,
        padding: 32,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>

        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: 16,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: 22,
          }}>🌬</div>
          <p style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>AirRoute</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>
            {isLogin ? "Welcome back" : "Create account"}
          </h1>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
            {isLogin ? "Sign in to access your saved routes" : "Start navigating cleaner air"}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 500,
            background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
            color: message.type === 'error' ? '#f87171' : '#34d399',
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Email
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="auth-input" placeholder="you@example.com" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Password
            </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="auth-input" placeholder="••••••••" required minLength={6} />
          </div>
          <button type="submit" disabled={loading} className="auth-btn-primary" style={{ marginTop: 4 }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Processing…
              </span>
            ) : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button onClick={() => setIsLogin(!isLogin)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: '#6366f1', fontFamily: "'DM Sans', sans-serif',",
            fontWeight: 500,
          }}>
            {isLogin ? "Don't have an account? Sign up →" : "Already have an account? Sign in →"}
          </button>
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <button onClick={handleLogout} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#334155', fontFamily: "'DM Sans', sans-serif",
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#64748b')}
            onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
          >
            Sign out of current session
          </button>
        </div>
      </div>
    </div>
  );
}
