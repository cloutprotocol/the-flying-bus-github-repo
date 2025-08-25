#!/bin/bash

# Script to set production URL for invitation links
# Usage: ./scripts/set-prod-url.sh

echo "🚀 Setting production URL for invitation links..."

supabase secrets set SITE_BASE_URL=https://theflyingbus.org --project-ref sutvexycbiiarpkugzpv

if [ $? -eq 0 ]; then
    echo "✅ Production URL set successfully!"
    echo "📧 Invitation emails will now use: https://theflyingbus.org"
else
    echo "❌ Failed to set production URL"
    exit 1
fi