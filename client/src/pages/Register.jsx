import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, displayName);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#1e293b',
        borderRadius: 12,
        padding: 32,
        border: '1px solid #334155',
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', marginBottom: 8, textAlign: 'center' }}>
          Create Your Account
        </h1>
        <p style={{ color: '#64748b', textAlign: 'center', marginBottom: 32 }}>
          Start with 5 free questions per day
        </p>

        {error && (
          <div style={{
            background: '#7f1d1d',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 14, marginBottom: 6 }}>Name (optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#f8fafc',
                fontSize: 16,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 14, marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#f8fafc',
                fontSize: 16,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 14, marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#f8fafc',
                fontSize: 16,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#1e40af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Creating account...' : 'Create Free Account'}
          </button>
        </form>

        <p style={{ color: '#64748b', textAlign: 'center', marginTop: 24, fontSize: 14 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
