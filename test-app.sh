#!/bin/bash
# Test script pentru Clawdbot Linux Companion
# Rulează pe sistemul țintă pentru a debugging

echo "=== Clawdbot Linux Companion Test ==="
echo ""

# Verifică Node.js
echo "1. Verificare Node.js..."
node --version 2>&1 || echo "❌ Node.js nu e instalat"

# Verifică Electron
echo ""
echo "2. Verificare Electron..."
npm list electron 2>&1 || echo "❌ Electron nu e instalat"

# Verifică dependențele
echo ""
echo "3. Verificare dependențe..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules există"
    ls node_modules | head -10
else
    echo "❌ node_modules lipsește - rulează: npm install"
fi

# Verifică fișierele sursă
echo ""
echo "4. Verificare fișiere sursă..."
for file in src/main/index.js src/main/utils/AppState.js src/main/utils/GatewayConfig.js src/preload/index.js src/renderer/index.html src/renderer/js/app.js; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file LIPSEȘTE"
    fi
done

# Încearcă să rulezi aplicația
echo ""
echo "5. Testare rulare..."
timeout 10 npm start 2>&1 | head -30 || echo "Aplicația nu a putut fi testată"

echo ""
echo "=== Test complet ==="
