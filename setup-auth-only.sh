#!/bin/bash
# MindMentor Phase 1 Deploy: Auth + Free Tier (no Stripe required)
# Run this in the Replit shell to get auth + freemium live immediately.
# Stripe billing can be added later via setup.sh when keys are ready.
#
# REQUIRED: Nothing — this script auto-generates SESSION_SECRET if not set.
# OPTIONAL: Set STRIPE_SECRET_KEY in Replit Secrets to enable paid billing.

set -e
echo "=== MindMentor Phase 1: Auth + Freemium Deploy ==="
echo "Stripe billing: OPTIONAL (app works without it)"
echo ""

# Step 1: Download new files from GitHub
echo "[1/6] Downloading integration files..."
mkdir -p server/middleware server/public client/src/contexts client/src/pages client/src/components

BASE="https://raw.githubusercontent.com/gs-lang/MindMentor/main"
curl -sL "$BASE/server/auth.js" -o server/auth.js
curl -sL "$BASE/server/stripe-optional.js" -o server/stripe.js
curl -sL "$BASE/server/session-setup.js" -o server/session-setup.js
curl -sL "$BASE/server/middleware/requireAuth.js" -o server/middleware/requireAuth.js
curl -sL "$BASE/server/middleware/usageLimiter.js" -o server/middleware/usageLimiter.js
curl -sL "$BASE/server/migration-auth.sql" -o server/migration-auth.sql
curl -sL "$BASE/client/src/contexts/AuthContext.jsx" -o client/src/contexts/AuthContext.jsx
curl -sL "$BASE/client/src/pages/Landing.jsx" -o client/src/pages/Landing.jsx
curl -sL "$BASE/client/src/pages/Login.jsx" -o client/src/pages/Login.jsx
curl -sL "$BASE/client/src/pages/Register.jsx" -o client/src/pages/Register.jsx
curl -sL "$BASE/client/src/components/PaywallGate.jsx" -o client/src/components/PaywallGate.jsx
curl -sL "$BASE/client/src/components/UpgradeButton.jsx" -o client/src/components/UpgradeButton.jsx
# Standalone auth pages (work without modifying the SPA router)
curl -sL "$BASE/server/public/login.html" -o server/public/login.html
curl -sL "$BASE/server/public/register.html" -o server/public/register.html
echo "  ✓ Files downloaded"

# Step 2: Auto-generate SESSION_SECRET if not already set
echo "[2/6] Checking SESSION_SECRET..."
if [ -z "$SESSION_SECRET" ]; then
  SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  echo ""
  echo "  ⚠ SESSION_SECRET not set. Add this to Replit Secrets (Tools > Secrets):"
  echo "    SESSION_SECRET = $SESSION_SECRET"
  echo ""
  echo "  (You MUST add this before restarting the Repl or sessions won't persist)"
  export SESSION_SECRET
else
  echo "  ✓ SESSION_SECRET is set"
fi

# Step 3: Install dependencies
echo "[3/6] Installing npm dependencies..."
npm install bcryptjs express-session connect-pg-simple stripe --save
echo "  ✓ Dependencies installed"

# Step 4: Run database migration
echo "[4/6] Running database migration..."
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -f server/migration-auth.sql && echo "  ✓ Migration complete"
else
  echo "  ⚠ DATABASE_URL not set. Run manually:"
  echo "     psql \$DATABASE_URL -f server/migration-auth.sql"
fi

# Step 5: Find and patch the main server file
echo "[5/6] Patching server file..."

SERVER_FILE=""
for candidate in index.js server.js app.js server/index.js src/index.js; do
  if [ -f "$candidate" ] && grep -q "express\|app\.post\|app\.get" "$candidate" 2>/dev/null; then
    SERVER_FILE="$candidate"
    break
  fi
done

if [ -z "$SERVER_FILE" ]; then
  SERVER_FILE=$(grep -rl "app\.listen\|createServer" --include="*.js" . 2>/dev/null | grep -v node_modules | head -1)
fi

if [ -z "$SERVER_FILE" ]; then
  echo "  ⚠ Could not auto-detect server file. Manually add from INTEGRATION-GUIDE.md"
else
  echo "  Found: $SERVER_FILE"
  cp "$SERVER_FILE" "${SERVER_FILE}.backup"

  node - "$SERVER_FILE" << 'PATCHER'
const fs = require('fs');
const path = require('path');
const serverFile = process.argv[2];
let code = fs.readFileSync(serverFile, 'utf8');

if (code.includes('setupSession') || code.includes('createAuthRoutes')) {
  console.log('  ⚠ Already patched — skipping');
  process.exit(0);
}

const requires = `
// === MindMentor Auth + Freemium Integration ===
const { setupSession } = require('./server/session-setup');
const { createAuthRoutes } = require('./server/auth');
const { createStripeRoutes, createStripeWebhookHandler } = require('./server/stripe');
const { requireAuth } = require('./server/middleware/requireAuth');
const { createUsageLimiter } = require('./server/middleware/usageLimiter');
// ==============================================
`;

const lastRequires = code.match(/^(?:const|var|let|import)\s+.+(?:require|from).+$/gm);
if (lastRequires) {
  const last = lastRequires[lastRequires.length - 1];
  const pos = code.lastIndexOf(last) + last.length;
  code = code.slice(0, pos) + requires + code.slice(pos);
} else {
  code = requires + code;
}

const poolMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:new Pool|createPool|new pg\.Pool)/);
const pool = poolMatch ? poolMatch[1] : 'pool';

const webhookInsert = `\n// Stripe webhook (must be before express.json)\napp.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), createStripeWebhookHandler(${pool}));\n`;
const sessionInsert = `
// Session + auth routes
setupSession(app, ${pool});
app.use('/api/auth', createAuthRoutes(${pool}));
app.use('/api/stripe', createStripeRoutes(${pool}));

// Standalone auth pages (bypass SPA router — work immediately)
const serveAuthPage = (file) => (req, res) => {
  res.sendFile(path.join(__dirname, 'server/public', file));
};
app.get('/login', serveAuthPage('login.html'));
app.get('/register', serveAuthPage('register.html'));
`;

if (code.includes('app.use(express.json())')) {
  code = code.replace('app.use(express.json())', webhookInsert + 'app.use(express.json())' + sessionInsert);
}

const usageLimiterInit = `const usageLimiter = createUsageLimiter(${pool});\n`;
const routePatterns = [
  /app\.post\s*\(\s*['"]\/api\/multi-mentor\/ask['"]/,
  /app\.post\s*\(\s*['"]\/api\/ask['"]/,
  /router\.post\s*\(\s*['"]\/multi-mentor\/ask['"]/,
];

let patched = false;
for (const p of routePatterns) {
  if (p.test(code)) {
    const pos = code.search(p);
    code = code.slice(0, pos) + usageLimiterInit + code.slice(pos);
    code = code.replace(p, m => m + ' requireAuth, usageLimiter,');
    patched = true;
    console.log(`  ✓ Wrapped Q&A route with requireAuth + usageLimiter`);
    break;
  }
}

if (!patched) {
  console.log('  ⚠ Could not auto-patch Q&A route. Add manually:');
  console.log('    app.post("/api/multi-mentor/ask", requireAuth, usageLimiter, yourHandler)');
}

fs.writeFileSync(serverFile, code);
console.log(`  ✓ ${serverFile} patched`);
PATCHER

fi

# Step 6: Verify auth HTML pages are ready
echo "[6/6] Verifying auth pages..."
if [ -f "server/public/login.html" ] && [ -f "server/public/register.html" ]; then
  echo "  ✓ login.html and register.html ready at /login and /register"
else
  echo "  ⚠ Auth HTML pages missing. Re-run or download manually from GitHub."
fi

echo ""
echo "=== Phase 1 Deploy Complete ==="
echo ""
echo "NEXT: Add SESSION_SECRET to Replit Secrets, then restart the Repl."
echo "  Auth (register/login) + free tier (5 questions/day) will be live."
echo "  Stripe billing shows 'coming soon' until STRIPE_SECRET_KEY is added."
echo ""
echo "Test after restart:"
echo "  1. Visit mindmentor.replit.app/register — should show registration form"
echo "  2. Create an account and log in"
echo "  3. Ask 5 questions (should work)"
echo "  4. Ask a 6th (should show paywall)"
echo ""
echo "Routes now live:"
echo "  /login     → standalone login page"
echo "  /register  → standalone registration page"
echo "  /api/auth/* → auth API endpoints"
echo ""
echo "To add Stripe billing later, set STRIPE_SECRET_KEY + price IDs in Secrets and restart."
