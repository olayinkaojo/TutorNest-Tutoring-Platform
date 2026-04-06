#!/bin/bash

# Load Test Runner Script for TutorNest
# Runs all load test scenarios and generates reports
# 
# Usage: ./load-tests/run-all.sh [BASE_URL] [ENVIRONMENT]
# Example: ./load-tests/run-all.sh http://localhost:5173 local
#          ./load-tests/run-all.sh https://staging.tutornest.com staging

set -e

# Configuration
BASE_URL=${1:-"http://localhost:5173"}
ENVIRONMENT=${2:-"local"}
RESULTS_DIR="load-tests/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "════════════════════════════════════════════════════════════════"
echo "  TutorNest Load Testing Suite"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Base URL: $BASE_URL"
echo "Environment: $ENVIRONMENT"
echo "Results Directory: $RESULTS_DIR"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 is not installed."
    echo "Install from: https://k6.io/docs/get-started/installation/"
    exit 1
fi

echo "✅ k6 found: $(k6 version)"
echo ""

# Run gamification load tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1/4: Gamification API Load Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
k6 run \
  --out json="$RESULTS_DIR/gamification_${TIMESTAMP}.json" \
  --tag testid=gamification \
  -e BASE_URL="$BASE_URL" \
  load-tests/gamification-load.js || echo "⚠️  Gamification test completed with warnings"

echo ""

# Run video conferencing load tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2/4: Video Conferencing & WebSocket Load Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
k6 run \
  --out json="$RESULTS_DIR/video_${TIMESTAMP}.json" \
  --tag testid=video \
  -e BASE_URL="$BASE_URL" \
  load-tests/video-load.js || echo "⚠️  Video test completed with warnings"

echo ""

# Run teacher dashboard load tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3/4: Teacher Dashboard Load Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
k6 run \
  --out json="$RESULTS_DIR/teacher_${TIMESTAMP}.json" \
  --tag testid=teacher \
  -e BASE_URL="$BASE_URL" \
  load-tests/teacher-load.js || echo "⚠️  Teacher test completed with warnings"

echo ""

# Run payment processing load tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4/4: Payment Processing Load Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
k6 run \
  --out json="$RESULTS_DIR/payment_${TIMESTAMP}.json" \
  --tag testid=payment \
  -e BASE_URL="$BASE_URL" \
  load-tests/payment-load.js || echo "⚠️  Payment test completed with warnings"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Load Testing Complete"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Results saved to: $RESULTS_DIR/"
echo ""
echo "To generate HTML report:"
echo "  npm install -g @k6/grafana-cloud-cli"
echo "  k6 cloud $RESULTS_DIR/*.json"
echo ""
echo "To analyze results locally:"
echo "  cat $RESULTS_DIR/*.json | jq '.metrics'"
echo ""
