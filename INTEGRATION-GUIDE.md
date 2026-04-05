# MindMentor Revenue Integration Guide

This guide explains how to integrate the auth, billing, and paywall code into the existing MindMentor Replit project.

## Step 1: Install Dependencies

In the Replit shell:
```bash
npm install bcryptjs express-session connect-pg-simple stripe
```

## Step 2: Add Environment Variables

In Replit Secrets (Tools > Secrets), add:
```
SESSION_SECRET=<generate-a-random-64-char-string>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
APP_URL=https://mindmentor.replit.app
```

## Step 3: Run Database Migration

In the Replit shell, run the migration against your PostgreSQL:
```bash
psql $DATABASE_URL -f server/migration-auth.sql
```
Or paste the SQL into your DB admin tool.

## Step 4: Copy Server Files

Copy these files into your project:
- `server/auth.js` — Auth routes
- `server/stripe.js` — Stripe billing routes + webhook
- `server/session-setup.js` — Session configuration
- `server/middleware/requireAuth.js` — Auth middleware
- `server/middleware/usageLimiter.js` — Usage limit middleware

## Step 5: Wire Up Express Server

In your main server file (likely `server/index.js` or `index.js`), add:

```javascript
const express = require('express');
const { setupSession } = require('./server/session-setup');
const { createAuthRoutes } = require('./server/auth');
const { createStripeRoutes, createStripeWebhookHandler } = require('./server/stripe');
const { requireAuth } = require('./server/middleware/requireAuth');
const { createUsageLimiter } = require('./server/middleware/usageLimiter');

// IMPORTANT: Stripe webhook must be BEFORE express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), createStripeWebhookHandler(pool));

// Then add JSON parsing
app.use(express.json());

// Session setup (after JSON parsing, before routes)
setupSession(app, pool);

// Auth routes (no auth required)
app.use('/api/auth', createAuthRoutes(pool));

// Stripe routes (session required)
app.use('/api/stripe', createStripeRoutes(pool));

// Protect the Q&A endpoint with auth + usage limits
// Find the existing route like: app.post('/api/ask', ...) or app.post('/api/chat', ...)
// Wrap it with middleware:
const usageLimiter = createUsageLimiter(pool);
// BEFORE: app.post('/api/ask', askHandler);
// AFTER:  app.post('/api/ask', requireAuth, usageLimiter, askHandler);
```

## Step 6: Copy Frontend Files

Copy these files into your React project:
- `client/src/contexts/AuthContext.jsx`
- `client/src/pages/Landing.jsx`
- `client/src/pages/Login.jsx`
- `client/src/pages/Register.jsx`
- `client/src/components/PaywallGate.jsx`
- `client/src/components/UpgradeButton.jsx`

## Step 7: Update React Router

In your main App component (likely `client/src/App.jsx`):

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
// ... existing imports

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/landing" />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (user) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/landing" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/" element={
            <ProtectedRoute>
              {/* Your existing Q&A / main app component */}
            </ProtectedRoute>
          } />
          {/* Keep existing admin routes as-is */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

## Step 8: Handle Paywall in Q&A Component

In the component that calls the Q&A API, handle usage limit errors:

```jsx
import PaywallGate from '../components/PaywallGate';

// In your Q&A component's submit handler:
const response = await fetch('/api/ask', { ... });
if (response.status === 429 || response.status === 403) {
  const data = await response.json();
  setPaywallLimit(data.limit); // 'daily_questions' or 'mentor_access'
  return;
}

// In the render:
{paywallLimit && <PaywallGate limitType={paywallLimit === 'daily_questions' ? 'daily_limit_reached' : 'mentor_access'} />}
```

## Step 9: Stripe Setup

1. Go to https://dashboard.stripe.com
2. Create Product: "MindMentor Pro" → Add Price: $14.99/month recurring
3. Copy the Price ID (starts with `price_`) → set as `STRIPE_PRICE_ID`
4. Go to Developers > Webhooks > Add Endpoint
5. URL: `https://mindmentor.replit.app/api/stripe/webhook`
6. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
7. Copy Webhook Secret → set as `STRIPE_WEBHOOK_SECRET`

## Step 10: Test

1. Register a new account
2. Verify 5 free questions work
3. Verify 6th question shows paywall
4. Test Stripe checkout (use test card 4242...)
5. Verify Pro user has unlimited access
6. Test the landing page at `/landing`
