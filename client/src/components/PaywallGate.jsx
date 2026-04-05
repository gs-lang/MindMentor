import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import UpgradeButton from './UpgradeButton';

export default function PaywallGate({ limitType, children }) {
  const { user } = useAuth();

  if (!limitType) return children;

  if (limitType === 'daily_limit_reached') {
    return (
      <div style={{
        background: '#1e293b',
        border: '1px solid #f59e0b',
        borderRadius: 12,
        padding: 32,
        textAlign: 'center',
        maxWidth: 500,
        margin: '24px auto',
      }}>
        <h3 style={{ color: '#f8fafc', fontSize: 20, marginBottom: 8 }}>
          Daily Limit Reached
        </h3>
        <p style={{ color: '#94a3b8', marginBottom: 24 }}>
          You've used all 5 free questions for today. Upgrade to Pro for unlimited questions and access to all mentors.
        </p>
        <UpgradeButton />
        <p style={{ color: '#475569', fontSize: 13, marginTop: 16 }}>
          Or come back tomorrow for 5 more free questions.
        </p>
      </div>
    );
  }

  if (limitType === 'mentor_access') {
    return (
      <div style={{
        background: '#1e293b',
        border: '1px solid #8b5cf6',
        borderRadius: 12,
        padding: 32,
        textAlign: 'center',
        maxWidth: 500,
        margin: '24px auto',
      }}>
        <h3 style={{ color: '#f8fafc', fontSize: 20, marginBottom: 8 }}>
          Pro Mentor
        </h3>
        <p style={{ color: '#94a3b8', marginBottom: 24 }}>
          This mentor is available on the Pro plan. Upgrade to access all mentors and get unlimited questions.
        </p>
        <UpgradeButton />
      </div>
    );
  }

  return children;
}
