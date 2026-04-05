# MindMentor Revenue Integration Guide

## Quick Deploy (Recommended)

Run one command in the Replit shell to deploy auth + freemium in ~2 minutes:

```bash
curl -sL https://raw.githubusercontent.com/gs-lang/MindMentor/main/setup-auth-only.sh | bash
```

Then:
1. Add `SESSION_SECRET` to Replit Secrets (Tools → Secrets) — use the value printed by the script
2. Restart the Repl

**That's it for Phase 1.** Stripe billing is optional and can be added later.

After restart, these routes are live:
- `/register` — new user registration (5 free questions/day, Hormozi only)
- `/login` — returning user sign-in
- `/api/auth/register` — POST (email, password, displayName)
- `/api/auth/login` — POST (email, password)
- `/api/auth/logout` — POST
- `/api/auth/me` — GET (returns current user)
- `/api/multi-mentor/ask` — protected; free tier gated

---

## What the Script Does

The `setup-auth-only.sh` script runs 6 steps automatically:

1. **Downloads files** from this repo into your Replit project
2. **Generates `SESSION_SECRET`** if not already set (prints it for you to add to Secrets)
3. **Installs npm packages**: `bcryptjs express-session connect-pg-simple stripe`
4. **Runs database migration**: creates `users`, `session`, `usage_tracking`, `team_seats` tables
5. **Patches your server file**: adds session, auth routes, and `/login`+`/register` static routes
6. **Verifies** auth HTML pages are in place

---

## Pricing Tiers

| Tier | Price | Daily Limit | Mentors | Seats |
|------|-------|-------------|---------|-------|
| Free | $0 | 5 questions | Hormozi only | 1 |
| Pro | $29/mo | Unlimited | All 9 | 1 |
| Team | $99/mo | Unlimited | All 9 | 5 |
| Business | $299/mo | Unlimited | All 9 | 10 |

---

## Adding Stripe Billing (Phase 2)

When ready to charge users, add these to Replit Secrets and restart:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...        # $29/mo recurring
STRIPE_PRICE_ID_TEAM=price_...       # $99/mo recurring
STRIPE_PRICE_ID_BUSINESS=price_...   # $299/mo recurring
APP_URL=https://mindmentor.replit.app
```

Set up the Stripe webhook to send these events to `https://mindmentor.replit.app/api/stripe/webhook`:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Without Stripe keys, billing routes return a "coming soon" message — users can register and use the free tier immediately.

---

## File Reference

| File | Purpose |
|------|---------|
| `server/auth.js` | Register, login, logout, /me routes |
| `server/session-setup.js` | express-session with PostgreSQL store (connect-pg-simple) |
| `server/stripe-optional.js` | Stripe checkout + webhook; graceful fallback if keys missing |
| `server/middleware/requireAuth.js` | Blocks unauthenticated requests with 401 |
| `server/middleware/usageLimiter.js` | Free tier: 5q/day, Hormozi only; paid tiers: unlimited |
| `server/migration-auth.sql` | Creates users, session, usage_tracking, team_seats tables |
| `server/public/login.html` | Standalone login page served at `/login` |
| `server/public/register.html` | Standalone registration page served at `/register` |
| `client/src/contexts/AuthContext.jsx` | React auth state (for SPA integration) |
| `client/src/pages/Landing.jsx` | Public landing page (9 mentors, B2B pricing) |
| `client/src/components/PaywallGate.jsx` | Paywall UI component |
| `client/src/components/UpgradeButton.jsx` | Stripe checkout trigger ($29/mo label) |

---

## Manual Integration (Advanced)

If you prefer to wire things up manually instead of using the script:

### 1. Install dependencies
```bash
npm install bcryptjs express-session connect-pg-simple stripe
```

### 2. Run database migration
```bash
psql $DATABASE_URL -f server/migration-auth.sql
```

### 3. Add to your main server file

```javascript
const path = require('path');
const { setupSession } = require('./server/session-setup');
const { createAuthRoutes } = require('./server/auth');
const { createStripeRoutes, createStripeWebhookHandler } = require('./server/stripe');
const { requireAuth } = require('./server/middleware/requireAuth');
const { createUsageLimiter } = require('./server/middleware/usageLimiter');

// Stripe webhook MUST be before express.json()
app.post('/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  createStripeWebhookHandler(pool)
);

app.use(express.json());

// Session, auth, and billing routes
setupSession(app, pool);
app.use('/api/auth', createAuthRoutes(pool));
app.use('/api/stripe', createStripeRoutes(pool));

// Standalone auth pages (bypass SPA router)
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'server/public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'server/public/register.html')));

// Protect the Q&A endpoint
const usageLimiter = createUsageLimiter(pool);
app.post('/api/multi-mentor/ask', requireAuth, usageLimiter, yourExistingHandler);
```

### 4. Add SESSION_SECRET to Replit Secrets

```
SESSION_SECRET=<any-random-64-char-string>
```

### 5. Restart the Repl

---

## Testing After Deploy

```bash
# Register a new account
curl -X POST https://mindmentor.replit.app/api/auth/register \
  -H "Content-Type: application/json" \
  -c /tmp/cookies.txt \
  -d '{"email":"test@example.com","password":"testpass123","displayName":"Test"}'

# Ask a question (uses the session cookie)
curl -X POST https://mindmentor.replit.app/api/multi-mentor/ask \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{"question":"How do I make better offers?","mentorIds":[2]}'

# Try a restricted mentor (should get 403)
curl -X POST https://mindmentor.replit.app/api/multi-mentor/ask \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{"question":"test","mentorIds":[9]}'

# Ask 6 questions (6th should get 429)
for i in 1 2 3 4 5 6; do
  curl -s -X POST https://mindmentor.replit.app/api/multi-mentor/ask \
    -H "Content-Type: application/json" \
    -b /tmp/cookies.txt \
    -d "{\"question\":\"question $i\",\"mentorIds\":[2]}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Q$i: {d[0][\"summary\"][:40] if isinstance(d,list) else d.get(\"error\",\"?\")}')"
done
```
