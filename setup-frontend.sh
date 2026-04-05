#!/bin/bash
# MindMentor Frontend Integration: Wire PaywallGate + AuthProvider into chat UI
# Run this AFTER setup-auth-only.sh and after the Repl has been restarted with SESSION_SECRET.
#
# What this does:
# 1. Wraps the React root with <AuthProvider> (so auth state is available app-wide)
# 2. Adds PaywallGate rendering to the multi-mentor chat component
# 3. Rebuilds the frontend bundle
#
# Idempotent — safe to re-run.

set -e
echo "=== MindMentor: Frontend PaywallGate Integration ==="
echo ""

# ── Step 1: Verify downloaded components exist ──────────────────────────────
echo "[1/5] Checking PaywallGate components..."

REQUIRED=(
  "client/src/contexts/AuthContext.jsx"
  "client/src/components/PaywallGate.jsx"
  "client/src/components/UpgradeButton.jsx"
)
MISSING=0
for f in "${REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    echo "  ✗ Missing: $f"
    MISSING=1
  fi
done
if [ "$MISSING" = "1" ]; then
  echo ""
  echo "  ⚠ Run setup-auth-only.sh first to download required files, then re-run this script."
  exit 1
fi
echo "  ✓ All components present"

# ── Step 2: Find the React entry point ──────────────────────────────────────
echo "[2/5] Locating React entry point..."

ENTRY_FILE=""
for candidate in \
  client/src/main.tsx client/src/main.jsx \
  client/src/index.tsx client/src/index.jsx \
  src/main.tsx src/main.jsx \
  src/index.tsx src/index.jsx; do
  if [ -f "$candidate" ] && grep -q "createRoot\|ReactDOM" "$candidate" 2>/dev/null; then
    ENTRY_FILE="$candidate"
    break
  fi
done

if [ -z "$ENTRY_FILE" ]; then
  ENTRY_FILE=$(grep -rl "createRoot\|ReactDOM.render" --include="*.tsx" --include="*.jsx" client/src 2>/dev/null | head -1)
fi

if [ -z "$ENTRY_FILE" ]; then
  echo "  ⚠ Could not locate React entry point. Searched client/src for createRoot/ReactDOM."
  echo "    Manually add <AuthProvider> wrapper to your root render call."
  echo "    See INTEGRATION-GUIDE.md for details."
else
  echo "  Found: $ENTRY_FILE"
fi

# ── Step 3: Patch entry point to wrap root with AuthProvider ─────────────────
echo "[3/5] Wrapping root with AuthProvider..."

if [ -n "$ENTRY_FILE" ]; then
  node - "$ENTRY_FILE" << 'ENTRY_PATCHER'
const fs = require('fs');
const file = process.argv[2];
let code = fs.readFileSync(file, 'utf8');

if (code.includes('AuthProvider')) {
  console.log('  ⚠ AuthProvider already present — skipping entry point patch');
  process.exit(0);
}

// Determine relative path from entry file to contexts dir
const path = require('path');
const entryDir = path.dirname(file);
const contextPath = path.relative(entryDir, 'client/src/contexts/AuthContext');
const importPath = contextPath.startsWith('.') ? contextPath : './' + contextPath;

// Add import after the last React-related import
const importLine = `import { AuthProvider } from '${importPath.replace(/\\/g, '/')}';`;

// Insert import near top (after existing imports)
const lastImportIdx = [...code.matchAll(/^import .+;?$/gm)].reduce((idx, m) => {
  return m.index > idx ? m.index + m[0].length : idx;
}, 0);

if (lastImportIdx > 0) {
  code = code.slice(0, lastImportIdx) + '\n' + importLine + code.slice(lastImportIdx);
} else {
  code = importLine + '\n' + code;
}

// Wrap root render: <App /> → <AuthProvider><App /></AuthProvider>
// Handles: .render(<App />), .render(<App/>), .render(<StrictMode><App /></StrictMode>)
const renderPatterns = [
  // createRoot(...).render(<App />)
  [/\.render\(\s*(<React\.StrictMode>[\s\S]*?<\/React\.StrictMode>)\s*\)/g,
   (_, inner) => `.render(<AuthProvider>${inner}</AuthProvider>)`],
  [/\.render\(\s*(<StrictMode>[\s\S]*?<\/StrictMode>)\s*\)/g,
   (_, inner) => `.render(<AuthProvider>${inner}</AuthProvider>)`],
  // simple: .render(<App />) or .render(<App/>)
  [/\.render\(\s*(<\w[\w.]*\s*\/>)\s*\)/g,
   (_, inner) => `.render(<AuthProvider>${inner}</AuthProvider>)`],
  // .render(<App prop="x" />) multi-line
  [/\.render\(\s*(<\w[\w.]*[\s\S]*?\/>)\s*\)/g,
   (_, inner) => `.render(<AuthProvider>${inner}</AuthProvider>)`],
];

let patched = false;
for (const [pattern, replacer] of renderPatterns) {
  if (pattern.test(code)) {
    code = code.replace(pattern, replacer);
    patched = true;
    break;
  }
}

if (!patched) {
  console.log('  ⚠ Could not auto-patch render call. Manually wrap your root component:');
  console.log('    .render(<AuthProvider><YourApp /></AuthProvider>)');
  process.exit(0);
}

fs.writeFileSync(file, code);
console.log(`  ✓ ${file} patched with AuthProvider`);
ENTRY_PATCHER
fi

# ── Step 4: Patch multi-mentor chat component ────────────────────────────────
echo "[4/5] Wiring PaywallGate into chat component..."

# Find the file containing the multi-mentor/ask mutation
CHAT_FILE=$(grep -rl "multi-mentor/ask" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" client/src 2>/dev/null | grep -v node_modules | head -1)

if [ -z "$CHAT_FILE" ]; then
  echo "  ⚠ Could not find chat component (searched for 'multi-mentor/ask' in client/src)."
  echo "    Manually add PaywallGate error handling. See INTEGRATION-GUIDE.md."
else
  echo "  Found: $CHAT_FILE"

  node - "$CHAT_FILE" << 'CHAT_PATCHER'
const fs = require('fs');
const path = require('path');
const file = process.argv[2];
let code = fs.readFileSync(file, 'utf8');

if (code.includes('PaywallGate')) {
  console.log('  ⚠ PaywallGate already present — skipping chat component patch');
  process.exit(0);
}

// Determine relative path from chat file to components dir
const fileDir = path.dirname(file);
const paywallPath = path.relative(fileDir, 'client/src/components/PaywallGate');
const importPath = (paywallPath.startsWith('.') ? paywallPath : './' + paywallPath).replace(/\\/g, '/');

// Add PaywallGate import after existing imports
const importLine = `import PaywallGate from '${importPath}';`;
const lastImportIdx = [...code.matchAll(/^import .+;?$/gm)].reduce((idx, m) => {
  return m.index > idx ? m.index + m[0].length : idx;
}, 0);
if (lastImportIdx > 0) {
  code = code.slice(0, lastImportIdx) + '\n' + importLine + code.slice(lastImportIdx);
} else {
  code = importLine + '\n' + code;
}

// Add paywallType state after the first useState declaration in the component
// We look for the function component that contains multi-mentor/ask
const useStatePattern = /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState\(/;
const componentIdx = code.indexOf('multi-mentor/ask');
// Find the nearest useState before the mutation
const codeBeforeMutation = code.slice(0, componentIdx);
const lastUseStateMatch = [...codeBeforeMutation.matchAll(/const\s+\[\w+,\s*\w+\]\s*=\s*useState\([^)]*\);/g)].pop();

if (lastUseStateMatch) {
  const insertPos = lastUseStateMatch.index + lastUseStateMatch[0].length;
  const paywallState = '\n  const [paywallType, setPaywallType] = useState(null);';
  code = code.slice(0, insertPos) + paywallState + code.slice(insertPos);
}

// Patch the onError handler to add auth-aware logic before the toast
// Pattern: onError: (error) => { ... toast(...) ... }
// We insert our check at the top of the onError body
const onErrorPattern = /onError\s*:\s*(?:\w+\s*=>|\((\w+)\)\s*=>)\s*\{/;
const onErrorMatch = code.match(onErrorPattern);

if (onErrorMatch) {
  const matchStart = code.indexOf(onErrorMatch[0]);
  const bodyStart = matchStart + onErrorMatch[0].length;
  const errorVar = onErrorMatch[1] || 'error';
  const injection = `
    // Auth-aware error handling
    const _status = parseInt(${errorVar}.message?.split(':')[0]);
    if (_status === 401) { window.location.href = '/login'; return; }
    if (_status === 403) { setPaywallType('mentor_access'); return; }
    if (_status === 429) { setPaywallType('daily_limit_reached'); return; }
`;
  code = code.slice(0, bodyStart) + injection + code.slice(bodyStart);
  console.log('  ✓ onError handler updated with auth-aware routing');
} else {
  console.log('  ⚠ Could not find onError handler pattern. Add manually:');
  console.log('    if (error.message.startsWith("401:")) { window.location.href = "/login"; return; }');
  console.log('    if (error.message.startsWith("403:")) { setPaywallType("mentor_access"); return; }');
  console.log('    if (error.message.startsWith("429:")) { setPaywallType("daily_limit_reached"); return; }');
}

// Add PaywallGate JSX: inject before the main return's closing div
// We look for the last </div> before the component closes, but that's risky.
// Safer: add a conditional render just before the message input area.
// Pattern: find 'return (' and inject PaywallGate display after it.
// Most reliable: find a pattern like the streaming message or input area.
const returnPattern = /return\s*\(/;
const returnMatch = code.match(returnPattern);
if (returnMatch) {
  const retPos = code.indexOf(returnMatch[0]) + returnMatch[0].length;
  const paywallJsx = `
    if (paywallType) {
      return <PaywallGate limitType={paywallType} />;
    }
`;
  code = code.slice(0, retPos) + paywallJsx + code.slice(retPos);
  console.log('  ✓ PaywallGate render added to chat component');
} else {
  console.log('  ⚠ Could not inject PaywallGate JSX. Add this before your return:');
  console.log('    if (paywallType) return <PaywallGate limitType={paywallType} />;');
}

fs.writeFileSync(file, code);
console.log(`  ✓ ${file} patched`);
CHAT_PATCHER
fi

# ── Step 5: Rebuild the frontend ─────────────────────────────────────────────
echo "[5/5] Rebuilding frontend..."

BUILD_CMD=""
if [ -f "client/package.json" ]; then
  cd client
  if grep -q '"build"' package.json; then
    BUILD_CMD="npm run build"
  fi
elif [ -f "package.json" ]; then
  if grep -q '"build"' package.json; then
    BUILD_CMD="npm run build"
  fi
fi

if [ -n "$BUILD_CMD" ]; then
  eval "$BUILD_CMD" && echo "  ✓ Build complete" || {
    echo ""
    echo "  ⚠ Build failed. Review the patch changes above and fix any syntax errors."
    echo "    Common issue: the onError patcher may have created duplicate variable names."
    echo "    Check the file for 'const _status' — if it conflicts, rename it."
    exit 1
  }
else
  echo "  ⚠ Could not find build script. Run 'npm run build' manually."
fi

echo ""
echo "=== Frontend Integration Complete ==="
echo ""
echo "What changed:"
echo "  - App root wrapped with <AuthProvider> (auth state available everywhere)"
echo "  - Chat component onError now:"
echo "      401 → redirects to /login"
echo "      403 → shows PaywallGate (mentor_access)"
echo "      429 → shows PaywallGate (daily_limit_reached)"
echo ""
echo "Test by:"
echo "  1. Visiting /register and creating an account"
echo "  2. Asking 5 questions with the free Hormozi mentor (should work)"
echo "  3. Asking a 6th question (should show PaywallGate daily limit UI)"
echo "  4. Selecting a non-Hormozi mentor on free tier (should show PaywallGate mentor UI)"
