#!/bin/bash

# Script to set development URL for invitation links
# Usage: ./scripts/set-dev-url.sh

echo "🔧 Setting development URL for invitation links..."

supabase secrets set SITE_BASE_URL=http://localhost:8080 --project-ref sutvexycbiiarpkugzpv

if [ $? -eq 0 ]; then
    echo "✅ Development URL set successfully!"
    echo "📧 Invitation emails will now use: http://localhost:8080"
else
    echo "❌ Failed to set development URL"
    exit 1
fi