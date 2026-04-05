#!/bin/bash
# MindMentor Revenue Integration Setup Script
# Run this in the Replit shell: bash setup.sh
# This script auto-integrates auth, Stripe billing, and freemium paywall.

set -e
echo "=== MindMentor Revenue Integration Setup ==="
echo ""

# Step 1: Pull latest files from GitHub
echo "[1/6] Pulling latest files from GitHub..."
if [ -d ".git" ]; then
  git pull origin main
else
  # Not a git repo yet — download files directly
  mkdir -p server/middleware client/src/contexts client/src/pages client/src/components

  BASE="https://raw.githubusercontent.com/gs-lang/MindMentor/main"
  curl -sL "$BASE/server/auth.js" -o server/auth.js
  curl -sL "$BASE/server/stripe.js" -o server/stripe.js
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
fi
echo "  ✓ Files ready"

# Step 2: Install dependencies
echo "[2/6] Installing npm dependencies..."
npm install bcryptjs express-session connect-pg-simple stripe
echo "  ✓ Dependencies installed"

# Step 3: Run database migration
echo "[3/6] Running database migration..."
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -f server/migration-auth.sql
  echo "  ✓ Migration complete"
else
  echo "  ⚠ DATABASE_URL not set — run manually:"
  echo "     psql \$DATABASE_URL -f server/migration-auth.sql"
fi

# Step 4: Find and patch the main server file
echo "[4/6] Finding main server file..."

# Search for the main Express server file
SERVER_FILE=""
for candidate in index.js server.js app.js server/index.js src/index.js; do
  if [ -f "$candidate" ]; then
    if grep -q "express\|app\.post\|app\.get" "$candidate" 2>/dev/null; then
      SERVER_FILE="$candidate"
      break
    fi
  fi
done

if [ -z "$SERVER_FILE" ]; then
  # Try harder — find any JS file with express patterns
  SERVER_FILE=$(grep -rl "app\.listen\|createServer" --include="*.js" . 2>/dev/null | grep -v node_modules | head -1)
fi

if [ -z "$SERVER_FILE" ]; then
  echo "  ⚠ Could not auto-detect server file."
  echo "  Please manually add the integration lines from INTEGRATION-GUIDE.md"
else
  echo "  ✓ Found server file: $SERVER_FILE"

  # Backup the original
  cp "$SERVER_FILE" "${SERVER_FILE}.backup"
  echo "  ✓ Backed up to ${SERVER_FILE}.backup"

  # Run the Node.js patcher
  node - "$SERVER_FILE" << 'PATCHER'
const fs = require('fs');
const path = require('path');
const serverFile = process.argv[2];
let code = fs.readFileSync(serverFile, 'utf8');

// Check if already patched
if (code.includes('setupSession') || code.includes('createAuthRoutes')) {
  console.log('  ⚠ Server file already patched — skipping');
  process.exit(0);
}

const requireLines = `
// === MindMentor Revenue Integration ===
const { setupSession } = require('./server/session-setup');
const { createAuthRoutes } = require('./server/auth');
const { createStripeRoutes, createStripeWebhookHandler } = require('./server/stripe');
const { requireAuth } = require('./server/middleware/requireAuth');
const { createUsageLimiter } = require('./server/middleware/usageLimiter');
// =======================================
`;

// Find where to insert requires — after the last existing require/import block
const lastRequireMatch = code.match(/^(const|var|let|import)\s+.+require.+$/gm);
if (lastRequireMatch) {
  const lastRequire = lastRequireMatch[lastRequireMatch.length - 1];
  const insertPos = code.lastIndexOf(lastRequire) + lastRequire.length;
  code = code.slice(0, insertPos) + requireLines + code.slice(insertPos);
} else {
  code = requireLines + code;
}

// Find the pool variable name (db connection)
const poolMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:new Pool|createPool|mysql\.createPool|knex|db\.connect)/);
const poolVar = poolMatch ? poolMatch[1] : 'pool';

// Find where express.json() or app.use() is first called to insert session setup after it
const jsonMiddlewareMatch = code.match(/app\.use\(express\.json\(\)\)/);

const sessionSetupCode = `
// Stripe webhook MUST be before express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), createStripeWebhookHandler(${poolVar}));

`;

const sessionInitCode = `
// Session + auth + Stripe routes
setupSession(app, ${poolVar});
app.use('/api/auth', createAuthRoutes(${poolVar}));
app.use('/api/stripe', createStripeRoutes(${poolVar}));
`;

if (jsonMiddlewareMatch) {
  const pos = code.indexOf('app.use(express.json())');
  code = code.slice(0, pos) + sessionSetupCode + code.slice(pos);
  // Insert session init after express.json
  const afterJson = code.indexOf('app.use(express.json())') + 'app.use(express.json())'.length;
  code = code.slice(0, afterJson) + sessionInitCode + code.slice(afterJson);
}

// Find and wrap the multi-mentor ask route with auth + usage limiter
const usageLimiterInit = `const usageLimiter = createUsageLimiter(${poolVar});\n`;
const routePatterns = [
  /app\.post\s*\(\s*['"]\/api\/multi-mentor\/ask['"]/,
  /app\.post\s*\(\s*['"]\/api\/ask['"]/,
  /router\.post\s*\(\s*['"]\/multi-mentor\/ask['"]/,
  /router\.post\s*\(\s*['"]\/ask['"]/,
];

let patched = false;
for (const pattern of routePatterns) {
  if (pattern.test(code)) {
    // Add usage limiter initializer before the route
    const matchPos = code.search(pattern);
    code = code.slice(0, matchPos) + usageLimiterInit + code.slice(matchPos);
    // Add middleware to the route
    code = code.replace(pattern, (match) => match + ' requireAuth, usageLimiter,');
    patched = true;
    console.log('  ✓ Wrapped Q&A route with auth + usage limiter');
    break;
  }
}

if (!patched) {
  console.log('  ⚠ Could not auto-patch Q&A route. Add manually:');
  console.log('    app.post("/api/multi-mentor/ask", requireAuth, usageLimiter, ...existing handler)');
}

fs.writeFileSync(serverFile, code);
console.log('  ✓ Server file patched successfully');
PATCHER

fi

# Step 5: Check env vars
echo "[5/6] Checking environment variables..."
MISSING_VARS=""
for var in SESSION_SECRET STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_ID_PRO; do
  if [ -z "${!var}" ]; then
    MISSING_VARS="$MISSING_VARS $var"
  fi
done

if [ -n "$MISSING_VARS" ]; then
  echo "  ⚠ Missing Replit Secrets (add in Tools > Secrets):"
  for var in $MISSING_VARS; do
    echo "    - $var"
  done
else
  echo "  ✓ All required env vars present"
fi

echo ""
echo "[6/6] Summary"
echo "  Server file: ${SERVER_FILE:-not auto-detected}"
echo "  Backup: ${SERVER_FILE:+${SERVER_FILE}.backup}"
echo ""
echo "=== Next steps ==="
echo "1. Add missing Secrets in Replit (Tools > Secrets)"
echo "2. Restart the Repl (Stop + Run)"
echo "3. Test: visit mindmentor.replit.app — should show landing page"
echo "4. Test Stripe: register an account, ask 5 free questions, verify paywall"
echo ""
echo "Stripe setup (if not done):"
echo "  1. stripe.com → Products → Create 'MindMentor Pro' at \$29/mo"
echo "  2. Copy Price ID → set STRIPE_PRICE_ID_PRO in Secrets"
echo "  3. Webhooks → Add https://mindmentor.replit.app/api/stripe/webhook"
echo "  4. Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted"
echo ""
echo "✅ Setup complete. Revenue is one Replit restart away."
