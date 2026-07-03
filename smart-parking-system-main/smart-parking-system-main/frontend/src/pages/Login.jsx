import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import './Login.css';

export default function Login() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (auth) {
      navigate('/');
    }
  }, [auth, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username, password: form.password, full_name: form.full_name })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Registration failed');
        } else {
          setSuccess('Account created! You can now log in.');
          setMode('login');
          setForm({ ...form, full_name: '' });
        }
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username, password: form.password })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Login failed');
        } else {
          login(data);
        }
      }
    } catch {
      setError('Cannot connect to server. Please check your backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <h1 className="login-brand-title">
            <span className="spoiler">P</span>
            <span className="wheel">a</span>
            r
            <span className="rel-inline-block">
              <Crown size={44} color="var(--primary)" style={{ position: 'absolute', top: '-27px', left: '50%', transform: 'translateX(-70%) rotate(340deg)' }} />
              K
            </span>
            i
            <span className="wheel">n</span>
            <span className='hood'>g</span>
          </h1>
        </div>

        <h2 className="login-heading">{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
        <p className="login-sub">
          {mode === 'login'
            ? 'Sign in as admin for full control, or as a customer to manage your parking.'
            : 'Register a customer account to book and track your parking sessions.'}
        </p>

        {error && <div className="login-alert login-alert-error">{error}</div>}
        {success && <div className="login-alert login-alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <div className="login-field">
              <label htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Your full name"
                value={form.full_name}
                onChange={handleChange}
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="login-toggle">
          {mode === 'login' ? (
            <>
              New customer?{' '}
              <button className="login-link-btn" onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="login-link-btn" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="login-demo">
          <span className="login-demo-label">Demo credentials</span>
          <div className="login-demo-row">
            <span className="login-demo-role admin-role">Admin</span>
            <code>admin / admin123</code>
          </div>
          <div className="login-demo-row">
            <span className="login-demo-role customer-role">Customer</span>
            <code>userOne / userOne</code>
          </div>
        </div>
      </div>
    </div>
  );
}
