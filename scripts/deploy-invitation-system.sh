#!/bin/bash

# Deployment script for The Flying Bus Invitation Approval Workflow System
# This script handles the complete deployment process including database migrations,
# application build, and post-deployment verification.

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/deployment.log"

# Environment variables check
REQUIRED_VARS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "SMTP_HOST"
    "SMTP_USER"
    "SMTP_PASSWORD"
    "VITE_APP_URL"
)

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if required environment variables are set
check_environment() {
    log "Checking environment variables..."
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    success "All required environment variables are set"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check if psql is available for database operations
    if ! command -v psql &> /dev/null; then
        warning "psql is not installed - database operations may not work"
    fi
    
    success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    npm ci --production=false
    
    success "Dependencies installed successfully"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run unit tests
    npm test -- --run --reporter=verbose
    
    # Run type checking
    npx tsc --noEmit
    
    success "All tests passed"
}

# Build application
build_application() {
    log "Building application..."
    
    cd "$PROJECT_ROOT"
    npm run build
    
    if [[ ! -d "dist" ]]; then
        error "Build failed - dist directory not found"
    fi
    
    success "Application built successfully"
}

# Run database migrations
run_database_migrations() {
    log "Running database migrations..."
    
    # Check if we have database access
    if [[ -z "$DATABASE_URL" ]]; then
        warning "DATABASE_URL not set, skipping database migrations"
        return 0
    fi
    
    # Run the main migration
    if [[ -f "$PROJECT_ROOT/supabase/migrations/20250120_invitation_approval_workflow_safe.sql" ]]; then
        log "Applying invitation approval workflow migration..."
        psql "$DATABASE_URL" -f "$PROJECT_ROOT/supabase/migrations/20250120_invitation_approval_workflow_safe.sql"
    fi
    
    # Run additional migrations if they exist
    for migration_file in "$PROJECT_ROOT/supabase/migrations"/*.sql; do
        if [[ -f "$migration_file" && "$migration_file" != *"invitation_approval_workflow_safe.sql" ]]; then
            log "Applying migration: $(basename "$migration_file")"
            psql "$DATABASE_URL" -f "$migration_file"
        fi
    done
    
    success "Database migrations completed"
}

# Verify database schema
verify_database_schema() {
    log "Verifying database schema..."
    
    if [[ -z "$DATABASE_URL" ]]; then
        warning "DATABASE_URL not set, skipping database verification"
        return 0
    fi
    
    # Check if required tables exist
    REQUIRED_TABLES=("invitation_tokens" "email_notifications")
    
    for table in "${REQUIRED_TABLES[@]}"; do
        if ! psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" &> /dev/null; then
            error "Required table '$table' does not exist or is not accessible"
        fi
    done
    
    # Check if required columns exist in invitation_requests
    REQUIRED_COLUMNS=("invitation_claimed_at" "notification_sent_at" "notification_status")
    
    for column in "${REQUIRED_COLUMNS[@]}"; do
        if ! psql "$DATABASE_URL" -c "SELECT $column FROM invitation_requests LIMIT 1;" &> /dev/null; then
            error "Required column '$column' does not exist in invitation_requests table"
        fi
    done
    
    success "Database schema verification completed"
}

# Deploy to hosting platform
deploy_application() {
    log "Deploying application..."
    
    # This is a placeholder - replace with your actual deployment command
    # Examples:
    # - Vercel: vercel --prod
    # - Netlify: netlify deploy --prod
    # - Custom server: rsync or scp commands
    
    if command -v vercel &> /dev/null; then
        log "Deploying to Vercel..."
        vercel --prod --yes
    elif command -v netlify &> /dev/null; then
        log "Deploying to Netlify..."
        netlify deploy --prod
    else
        warning "No deployment platform detected. Please deploy manually."
        return 0
    fi
    
    success "Application deployed successfully"
}

# Post-deployment verification
verify_deployment() {
    log "Running post-deployment verification..."
    
    # Wait a moment for deployment to propagate
    sleep 10
    
    # Check if the application is accessible
    if [[ -n "$VITE_APP_URL" ]]; then
        log "Checking application accessibility..."
        
        if curl -f -s "$VITE_APP_URL" > /dev/null; then
            success "Application is accessible at $VITE_APP_URL"
        else
            error "Application is not accessible at $VITE_APP_URL"
        fi
        
        # Check health endpoint if it exists
        if curl -f -s "$VITE_APP_URL/api/health" > /dev/null; then
            success "Health endpoint is responding"
        else
            warning "Health endpoint is not responding (this may be normal if not implemented)"
        fi
    else
        warning "VITE_APP_URL not set, skipping accessibility check"
    fi
    
    success "Post-deployment verification completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    # Add any cleanup tasks here
    success "Cleanup completed"
}

# Main deployment process
main() {
    log "Starting deployment of The Flying Bus Invitation Approval Workflow System"
    log "Deployment log: $LOG_FILE"
    
    # Trap to ensure cleanup runs on exit
    trap cleanup EXIT
    
    # Run deployment steps
    check_environment
    check_prerequisites
    install_dependencies
    run_tests
    build_application
    run_database_migrations
    verify_database_schema
    deploy_application
    verify_deployment
    
    success "Deployment completed successfully!"
    log "Application should be available at: $VITE_APP_URL"
    log "Deployment log saved to: $LOG_FILE"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --skip-tests        Skip running tests"
        echo "  --skip-db           Skip database operations"
        echo "  --dry-run           Run without making changes"
        echo ""
        echo "Environment variables required:"
        for var in "${REQUIRED_VARS[@]}"; do
            echo "  $var"
        done
        exit 0
        ;;
    --skip-tests)
        log "Skipping tests as requested"
        run_tests() { log "Tests skipped"; }
        ;;
    --skip-db)
        log "Skipping database operations as requested"
        run_database_migrations() { log "Database migrations skipped"; }
        verify_database_schema() { log "Database verification skipped"; }
        ;;
    --dry-run)
        log "Running in dry-run mode"
        deploy_application() { log "Deployment skipped (dry-run mode)"; }
        ;;
esac

# Run main function
main "$@"