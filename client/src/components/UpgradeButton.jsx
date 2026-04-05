import React, { useState } from 'react';

export default function UpgradeButton({ label = 'Upgrade to Pro — $14.99/mo' }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch (err) {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      style={{
        padding: '14px 32px',
        background: loading ? '#1e40af' : '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontSize: 16,
        fontWeight: 600,
        cursor: loading ? 'wait' : 'pointer',
      }}
    >
      {loading ? 'Redirecting...' : label}
    </button>
  );
}
