#!/bin/bash
# Fix special characters in RiskScanWidget
sed -i 's/✓/[OK]/g' components/RiskScanWidget.tsx
sed -i 's/⚠️/[WARN]/g' components/RiskScanWidget.tsx
sed -i 's/❌/[ERROR]/g' components/RiskScanWidget.tsx
