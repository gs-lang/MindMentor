import React from 'react';
import { Link } from 'react-router-dom';

const MENTORS = [
  { name: 'Alex Hormozi', domain: 'Offers & Sales', book: '$100M Offers' },
  { name: 'Naval Ravikant', domain: 'Wealth & Philosophy', book: 'The Almanack' },
  { name: 'Tony Robbins', domain: 'Peak Performance', book: 'Awaken the Giant Within' },
  { name: 'Simon Sinek', domain: 'Leadership & Purpose', book: 'Start With Why' },
  { name: 'Myron Golden', domain: 'Business Strategy', book: 'Boss Moves' },
  { name: 'Grant Cardone', domain: 'Sales & Scale', book: 'The 10X Rule' },
  { name: 'Patrick Bet-David', domain: 'Entrepreneurship', book: 'Your Next Five Moves' },
];

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      {/* Hero */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, color: '#f8fafc', marginBottom: 16, lineHeight: 1.1 }}>
          7 World-Class Mentors.<br />One AI. Available 24/7.
        </h1>
        <p style={{ fontSize: 20, color: '#94a3b8', marginBottom: 16, maxWidth: 640, margin: '0 auto 16px' }}>
          Ask Hormozi, Naval, Robbins, Sinek, Cardone, Golden, or Bet-David any business question.
          Get answers sourced from their actual books, videos, and frameworks.
        </p>
        <p style={{ fontSize: 16, color: '#64748b', marginBottom: 40 }}>
          Already used by Outsourced and growing teams worldwide.
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

      {/* Mentor Roster */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 60px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#94a3b8', textAlign: 'center', marginBottom: 24 }}>
          Your Mentor Roster
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {MENTORS.map((m) => (
            <div key={m.name} style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              padding: '20px 24px',
            }}>
              <p style={{ color: '#f8fafc', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{m.name}</p>
              <p style={{ color: '#3b82f6', fontSize: 13, marginBottom: 4 }}>{m.domain}</p>
              <p style={{ color: '#64748b', fontSize: 12 }}>{m.book}</p>
            </div>
          ))}
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
            Example — Alex Hormozi
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
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 80px' }}>
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
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
              {['5 questions per day', '1 mentor (Hormozi)', 'Core Q&A features'].map((item) => (
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
              Most Popular
            </div>
            <h3 style={{ fontSize: 24, color: '#f8fafc', marginBottom: 8 }}>Pro</h3>
            <p style={{ fontSize: 36, fontWeight: 800, color: '#f8fafc', marginBottom: 24 }}>
              $14.99<span style={{ fontSize: 16, color: '#64748b', fontWeight: 400 }}>/month</span>
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
              {[
                'Unlimited questions',
                'All 7 mentors',
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

          {/* Business */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '2px solid #f59e0b',
            borderRadius: 12,
            padding: 32,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: -12,
              right: 24,
              background: '#f59e0b',
              color: '#0f172a',
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>
              Enterprise
            </div>
            <h3 style={{ fontSize: 24, color: '#f8fafc', marginBottom: 8 }}>Business</h3>
            <p style={{ fontSize: 36, fontWeight: 800, color: '#f8fafc', marginBottom: 24 }}>
              $299<span style={{ fontSize: 16, color: '#64748b', fontWeight: 400 }}>/month</span>
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
              {[
                'Unlimited questions',
                'All 7 mentors',
                'Up to 25 team seats',
                'Business profile analysis',
                'Team usage dashboard',
                'Priority support',
              ].map((item) => (
                <li key={item} style={{ color: '#94a3b8', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#f59e0b' }}>&#10003;</span> {item}
                </li>
              ))}
            </ul>
            <a
              href="mailto:hello@mindmentor.app?subject=Business Plan Demo"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px 24px',
                background: '#f59e0b',
                color: '#0f172a',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              Book a Demo
            </a>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid #1e293b' }}>
        <p style={{ color: '#475569', fontSize: 14 }}>
          MindMentor is not affiliated with any of the mentors listed. Answers are AI-generated from publicly available content.
        </p>
      </div>
    </div>
  );
}
