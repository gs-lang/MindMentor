import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      {/* Hero */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, color: '#f8fafc', marginBottom: 16, lineHeight: 1.1 }}>
          Ask Alex Hormozi Any Business Question
        </h1>
        <p style={{ fontSize: 20, color: '#94a3b8', marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
          Get answers sourced from his actual books, videos, and frameworks.
          AI-powered mentor wisdom — available 24/7.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/register"
            style={{
              display: 'inline-block',
              padding: '16px 40px',
              background: '#3b82f6',
              color: 'white',
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
          >
            Start Free — 5 Questions/Day
          </Link>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              padding: '16px 40px',
              background: 'transparent',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Demo Example */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 12,
          padding: 32,
        }}>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Example Question
          </p>
          <p style={{ color: '#e2e8f0', fontSize: 18, fontStyle: 'italic', marginBottom: 24 }}>
            "How should I price my consulting service to attract high-value clients?"
          </p>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            MindMentor Answer (sourced from $100M Offers)
          </p>
          <p style={{ color: '#cbd5e1', fontSize: 16, lineHeight: 1.6 }}>
            "Price on the value you create, not the time you spend. If your consulting helps someone make
            an extra $100K, charging $10K is a steal. The key is to make your offer so good that people
            feel stupid saying no. Stack the value: include bonuses, guarantees, and urgency..."
          </p>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: '#f8fafc', textAlign: 'center', marginBottom: 40 }}>
          Simple Pricing
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {/* Free */}
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: 32,
          }}>
            <h3 style={{ fontSize: 24, color: '#f8fafc', marginBottom: 8 }}>Free</h3>
            <p style={{ fontSize: 36, fontWeight: 800, color: '#f8fafc', marginBottom: 24 }}>
              $0<span style={{ fontSize: 16, color: '#64748b', fontWeight: 400 }}>/month</span>
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['5 questions per day', '1 mentor (Alex Hormozi)', 'Basic answers'].map((item) => (
                <li key={item} style={{ color: '#94a3b8', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#22c55e' }}>&#10003;</span> {item}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: 24,
                padding: '12px 24px',
                background: '#334155',
                color: '#f8fafc',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Get Started
            </Link>
          </div>

          {/* Pro */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)',
            border: '2px solid #3b82f6',
            borderRadius: 12,
            padding: 32,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: -12,
              right: 24,
              background: '#3b82f6',
              color: 'white',
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>
              Best Value
            </div>
            <h3 style={{ fontSize: 24, color: '#f8fafc', marginBottom: 8 }}>Pro</h3>
            <p style={{ fontSize: 36, fontWeight: 800, color: '#f8fafc', marginBottom: 24 }}>
              $14.99<span style={{ fontSize: 16, color: '#64748b', fontWeight: 400 }}>/month</span>
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Unlimited questions',
                'All mentors',
                'Business profile analysis',
                'Priority responses',
              ].map((item) => (
                <li key={item} style={{ color: '#94a3b8', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#3b82f6' }}>&#10003;</span> {item}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: 24,
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Start Free, Upgrade Anytime
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid #1e293b' }}>
        <p style={{ color: '#475569', fontSize: 14 }}>
          MindMentor is not affiliated with Alex Hormozi. Answers are AI-generated from publicly available content.
        </p>
      </div>
    </div>
  );
}
