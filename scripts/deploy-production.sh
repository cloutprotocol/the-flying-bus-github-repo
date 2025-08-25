#!/bin/bash

# Production Deployment Script for Email Notification System
# This script deploys the email system to production with proper configuration

set -e  # Exit on any error

echo "🚀 Starting production deployment for Email Notification System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Validate environment variables
validate_environment() {
    print_status "Validating environment variables..."
    
    if [ -z "$RESEND_API_KEY" ]; then
        print_error "RESEND_API_KEY environment variable is not set"
        exit 1
    fi
    
    if [ -z "$RESEND_FROM_EMAIL" ]; then
        print_error "RESEND_FROM_EMAIL environment variable is not set"
        exit 1
    fi
    
    print_success "Environment variables validated"
}

# Deploy database migrations
deploy_migrations() {
    print_status "Deploying database migrations..."
    
    # Check if we're linked to a project
    if ! supabase status &> /dev/null; then
        print_error "Not linked to a Supabase project. Please run 'supabase link' first."
        exit 1
    fi
    
    # Deploy migrations
    supabase db push
    
    print_success "Database migrations deployed"
}

# Set up RLS policies
setup_rls_policies() {
    print_status "Setting up Row Level Security policies..."
    
    # Apply RLS policies for invitation_tokens table
    supabase db reset --linked
    
    print_success "RLS policies configured"
}

# Deploy Edge Functions
deploy_edge_functions() {
    print_status "Deploying Edge Functions..."
    
    # Deploy send-email function
    print_status "Deploying send-email function..."
    supabase functions deploy send-email --no-verify-jwt
    
    # Deploy invitation-tokens function
    print_status "Deploying invitation-tokens function..."
    supabase functions deploy invitation-tokens --no-verify-jwt
    
    print_success "Edge Functions deployed"
}

# Set environment variables for Edge Functions
set_function_secrets() {
    print_status "Setting Edge Function secrets..."
    
    # Set Resend API key
    echo "$RESEND_API_KEY" | supabase secrets set RESEND_API_KEY
    
    # Set email configuration
    echo "$RESEND_FROM_EMAIL" | supabase secrets set RESEND_FROM_EMAIL
    echo "${RESEND_FROM_NAME:-Your Platform}" | supabase secrets set RESEND_FROM_NAME
    
    # Set rate limiting configuration
    echo "${EMAIL_RATE_LIMIT_PER_HOUR:-100}" | supabase secrets set EMAIL_RATE_LIMIT_PER_HOUR
    echo "${EMAIL_RATE_LIMIT_PER_DAY:-1000}" | supabase secrets set EMAIL_RATE_LIMIT_PER_DAY
    
    # Set token configuration
    echo "${TOKEN_EXPIRATION_HOURS:-168}" | supabase secrets set TOKEN_EXPIRATION_HOURS
    echo "${MAX_RETRY_ATTEMPTS:-3}" | supabase secrets set MAX_RETRY_ATTEMPTS
    
    # Set security configuration
    echo "${ENABLE_AUDIT_LOGGING:-true}" | supabase secrets set ENABLE_AUDIT_LOGGING
    echo "${ENABLE_RATE_LIMITING:-true}" | supabase secrets set ENABLE_RATE_LIMITING
    
    # Set monitoring configuration
    echo "${ENABLE_METRICS:-true}" | supabase secrets set ENABLE_METRICS
    echo "${LOG_LEVEL:-info}" | supabase secrets set LOG_LEVEL
    
    # Set site URL for invitation links
    echo "${SITE_BASE_URL:-https://theflyingbus.org}" | supabase secrets set SITE_BASE_URL
    
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$ALERT_EMAIL" | supabase secrets set ALERT_EMAIL
    fi
    
    print_success "Edge Function secrets configured"
}

# Test Edge Functions
test_edge_functions() {
    print_status "Testing Edge Functions..."
    
    # Get the project URL
    PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}')
    
    if [ -z "$PROJECT_URL" ]; then
        print_error "Could not determine project URL"
        exit 1
    fi
    
    # Test send-email function health endpoint
    print_status "Testing send-email function..."
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$PROJECT_URL/functions/v1/send-email/health")
    
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        print_success "send-email function is healthy"
    else
        print_warning "send-email function health check returned: $HEALTH_RESPONSE"
    fi
    
    # Test invitation-tokens function
    print_status "Testing invitation-tokens function..."
    TOKEN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$PROJECT_URL/functions/v1/invitation-tokens?action=cleanup" -X POST)
    
    if [ "$TOKEN_RESPONSE" = "200" ]; then
        print_success "invitation-tokens function is accessible"
    else
        print_warning "invitation-tokens function test returned: $TOKEN_RESPONSE"
    fi
}

# Set up monitoring and alerting
setup_monitoring() {
    print_status "Setting up monitoring and alerting..."
    
    # Create a cron job for token cleanup (this would typically be done via Supabase dashboard)
    print_status "Token cleanup will need to be configured via Supabase dashboard"
    print_status "Navigate to Database > Extensions and enable pg_cron if not already enabled"
    print_status "Then add this cron job:"
    echo "SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT * FROM cleanup_expired_invitation_tokens();');"
    
    print_success "Monitoring setup instructions provided"
}

# Verify Resend domain configuration
verify_resend_domain() {
    print_status "Verifying Resend domain configuration..."
    
    if [ -n "$RESEND_FROM_EMAIL" ]; then
        DOMAIN=$(echo "$RESEND_FROM_EMAIL" | cut -d'@' -f2)
        print_status "Make sure the domain '$DOMAIN' is verified in your Resend dashboard"
        print_status "Add the following DNS records to your domain:"
        print_status "1. SPF record: v=spf1 include:_spf.resend.com ~all"
        print_status "2. DKIM record: (provided by Resend dashboard)"
        print_status "3. DMARC record: v=DMARC1; p=quarantine; rua=mailto:dmarc@$DOMAIN"
    fi
    
    print_success "Domain verification instructions provided"
}

# Main deployment process
main() {
    echo "========================================"
    echo "  Email Notification System Deployment"
    echo "========================================"
    echo
    
    # Load environment variables if .env.production exists
    if [ -f "supabase/.env.production" ]; then
        print_status "Loading production environment variables..."
        set -a  # automatically export all variables
        source supabase/.env.production
        set +a
    else
        print_warning "No .env.production file found. Make sure environment variables are set."
    fi
    
    check_dependencies
    validate_environment
    verify_resend_domain
    deploy_migrations
    setup_rls_policies
    deploy_edge_functions
    set_function_secrets
    test_edge_functions
    setup_monitoring
    
    echo
    print_success "🎉 Production deployment completed successfully!"
    echo
    print_status "Next steps:"
    print_status "1. Verify domain configuration in Resend dashboard"
    print_status "2. Set up monitoring alerts in Supabase dashboard"
    print_status "3. Configure cron job for token cleanup"
    print_status "4. Test the complete invitation flow in production"
    echo
    print_status "Edge Function URLs:"
    PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}')
    print_status "Send Email: $PROJECT_URL/functions/v1/send-email"
    print_status "Invitation Tokens: $PROJECT_URL/functions/v1/invitation-tokens"
    echo
}

# Run main function
main "$@"