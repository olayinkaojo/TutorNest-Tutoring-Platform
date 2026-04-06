#!/bin/bash

# Security Testing Script for TutorNest
# Runs comprehensive security checks and vulnerability scans
# 
# Usage: ./security-tests/run-security-audit.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="security-tests/results"
REPORT_FILE="$RESULTS_DIR/security-audit-${TIMESTAMP}.md"

echo "════════════════════════════════════════════════════════════════"
echo "  TutorNest Security Audit & Vulnerability Scan"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Initialize report
cat > "$REPORT_FILE" << 'EOF'
# Security Audit Report

Date: $(date)

## Executive Summary

This report contains the results of comprehensive security testing and vulnerability scanning of the TutorNest platform.

## Test Results

### 1. Dependency Vulnerability Scan
EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Running npm audit (Dependency Vulnerabilities)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm audit 2>&1 | tee "$RESULTS_DIR/npm-audit-${TIMESTAMP}.txt" || echo "⚠️  Some vulnerabilities found"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Checking for hardcoded secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for common secret patterns
SECRETS_FOUND=0

# Check for API keys
if grep -r "sk_" src/ 2>/dev/null | grep -v node_modules; then
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
  echo "⚠️  Potential API key found in source"
fi

# Check for AWS keys
if grep -r "AKIA" src/ 2>/dev/null | grep -v node_modules; then
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
  echo "⚠️  Potential AWS key found in source"
fi

# Check for private keys
if grep -r "PRIVATE KEY" src/ 2>/dev/null | grep -v node_modules; then
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
  echo "⚠️  Private key found in source"
fi

if [ $SECRETS_FOUND -eq 0 ]; then
  echo "✅ No hardcoded secrets detected"
else
  echo "❌ $SECRETS_FOUND potential secret(s) found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Environment variable validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MISSING_VARS=0

# Check for example env file
if [ ! -f .env.example ] && [ ! -f .env.local.example ]; then
  echo "⚠️  No .env.example file found"
  MISSING_VARS=$((MISSING_VARS + 1))
else
  echo "✅ Environment template files present"
fi

# Check .gitignore includes .env
if grep -q "\.env" .gitignore; then
  echo "✅ .env files properly ignored by git"
else
  echo "⚠️  .env files might not be in .gitignore"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Checking build output for secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "build" ]; then
  if grep -r "sk_\|AKIA\|PRIVATE KEY" build/ 2>/dev/null; then
    echo "❌ Secrets detected in build output!"
  else
    echo "✅ No secrets in build output"
  fi
else
  echo "ℹ️  No build directory found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Code quality checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for console.log in production code
echo "Checking for console.log in source (potential info leak)..."
CONSOLE_LOGS=$(grep -r "console\.log" src/ 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$CONSOLE_LOGS" -gt 5 ]; then
  echo "⚠️  $CONSOLE_LOGS console.log statements found in source"
else
  echo "✅ Minimal console logging detected"
fi

# Check for eval usage
echo "Checking for eval() usage (security risk)..."
if grep -r "eval(" src/ 2>/dev/null | grep -v node_modules; then
  echo "❌ eval() found in source code"
else
  echo "✅ No eval() usage detected"
fi

# Check for innerHTML usage
echo "Checking for innerHTML usage (XSS risk)..."
INNERHTML=$(grep -r "innerHTML" src/ 2>/dev/null | grep -v node_modules | wc -l)
if [ "$INNERHTML" -gt 0 ]; then
  echo "⚠️  $INNERHTML innerHTML assignments found (potential XSS risk)"
else
  echo "✅ No innerHTML usage detected"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Security Audit Complete"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Results saved to: $RESULTS_DIR/"
echo ""
echo "Next steps:"
echo "1. Review npm audit results"
echo "2. Fix any critical vulnerabilities"
echo "3. Address code quality warnings"
echo "4. Implement missing security headers"
echo ""
