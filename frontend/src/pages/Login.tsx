import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Lock, Mail, Loader2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

// const SHOW_TEST_CREDENTIALS = import.meta.env.VITE_SHOW_TEST_CREDENTIALS === 'true';
const SHOW_TEST_CREDENTIALS = true;

const TEST_ACCOUNTS = [
  { role: 'Admin', email: 'admin@demo.local', password: 'Admin@123', badge: 'badge-purple' },
  { role: 'Sales', email: 'sales@demo.local', password: 'Sales@123', badge: 'badge-blue' },
  { role: 'Warehouse', email: 'warehouse@demo.local', password: 'Warehouse@123', badge: 'badge-amber' },
  { role: 'Accounts', email: 'accounts@demo.local', password: 'Accounts@123', badge: 'badge-green' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (acc: typeof TEST_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <div className="login-page">
      <div className="login-card slide-up">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Building2 size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>BusinessCRM</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ERP + Operations Portal</div>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Welcome back</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Sign in to your account to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="password"
                type="password"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" style={{ marginTop: 4 }} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Test Credentials Panel */}
        {SHOW_TEST_CREDENTIALS && (
          <div className="test-credentials">
            <div className="test-credentials-header">
              🧪 Test Accounts (Dev / Staging Only)
            </div>
            {TEST_ACCOUNTS.map((acc) => (
              <div key={acc.role} className="test-cred-item">
                <span className={`badge ${acc.badge}`}>{acc.role}</span>
                <span className="test-cred-email">{acc.email}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fillCredentials(acc)}
                  style={{ gap: 4 }}
                >
                  Fill <ChevronRight size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
