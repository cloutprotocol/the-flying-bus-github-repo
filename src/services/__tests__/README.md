# Email Notification System Test Suite

This directory contains comprehensive tests for the email notification system, covering all aspects of the invitation flow from request to account activation.

## Test Categories

### 1. Unit Tests

#### Email Service Tests (`supabase/functions/send-email/__tests__/`)
- **email-service.test.ts**: Tests for the core email service functionality
  - Resend API integration
  - Email template rendering
  - Error handling and retry logic
  - Email address validation
  - Rate limiting compliance

#### Token Management Tests (`supabase/functions/invitation-tokens/__tests__/`)
- **token-service.test.ts**: Tests for secure token operations
  - Cryptographically secure token generation
  - Token hashing and storage
  - Token validation and expiration
  - Usage tracking and cleanup

### 2. Integration Tests

#### Invitation Flow Tests (`invitationFlowIntegration.test.ts`)
- Complete end-to-end invitation workflows
- New user registration flow
- Existing user activation flow
- Error handling scenarios
- Database transaction integrity
- Email service integration

### 3. Template Tests

#### Email Template Rendering (`supabase/functions/send-email/__tests__/template-rendering.test.ts`)
- Template compilation and rendering
- Data sanitization and security
- Responsive design validation
- Plain text generation
- Accessibility compliance

### 4. Security Tests

#### Token Security Tests (`src/utils/__tests__/tokenSecurityTests.test.ts`)
- Cryptographic strength validation
- Entropy analysis
- Collision resistance
- Timing attack resistance
- Input validation security

## Running Tests

### Run All Tests
```bash
npm run test:email-system
```

### Run Specific Test Categories
```bash
# Unit tests only
npx vitest run "src/services/__tests__/invitation*.test.ts"

# Security tests only
npx vitest run "src/utils/__tests__/tokenSecurity*.test.ts"

# Integration tests only
npx vitest run "src/services/__tests__/invitationFlowIntegration.test.ts"
```

### Run with Coverage
```bash
npx vitest run --coverage --config vitest.email-system.config.ts
```

## Test Requirements Coverage

### Requirement 1: Invitation Request Flow
- ✅ `invitationFlowIntegration.test.ts` - Complete request submission
- ✅ `email-service.test.ts` - Confirmation email sending
- ✅ `invitationService.test.ts` - Duplicate prevention

### Requirement 2: Admin Approval Process
- ✅ `invitationFlowIntegration.test.ts` - Token generation on approval
- ✅ `token-service.test.ts` - Secure token creation
- ✅ `email-service.test.ts` - Invitation email delivery

### Requirement 3: Existing User Activation
- ✅ `invitationFlowIntegration.test.ts` - Account activation flow
- ✅ `roleService.test.ts` - Author role granting
- ✅ `token-service.test.ts` - Token validation

### Requirement 4: New User Registration
- ✅ `invitationFlowIntegration.test.ts` - Account creation flow
- ✅ `invitationService.test.ts` - Pre-populated registration
- ✅ `roleService.test.ts` - Automatic role assignment

### Requirement 5: Server-Side Email Service
- ✅ `email-service.test.ts` - Resend integration
- ✅ `template-rendering.test.ts` - Template system
- ✅ `email-service.test.ts` - Error handling

### Requirement 6: Secure Token Management
- ✅ `tokenSecurityTests.test.ts` - Cryptographic security
- ✅ `token-service.test.ts` - Token lifecycle
- ✅ `tokenSecurityTests.test.ts` - Validation security

### Requirement 7: Email Templates
- ✅ `template-rendering.test.ts` - Responsive templates
- ✅ `template-rendering.test.ts` - Branding and styling
- ✅ `template-rendering.test.ts` - Plain text versions

### Requirement 8: Error Handling
- ✅ `invitationFlowIntegration.test.ts` - Error scenarios
- ✅ `email-service.test.ts` - Service failures
- ✅ `token-service.test.ts` - Invalid tokens

## Test Data and Mocks

### Mock Services
- **Resend API**: Mocked for email sending tests
- **Supabase Client**: Mocked for database operations
- **Crypto API**: Mocked for consistent token generation

### Test Data
- Valid invitation requests with proper formatting
- Invalid data for error testing
- Expired and used tokens for validation testing
- Various email templates with different data sets

## Coverage Requirements

The test suite maintains minimum coverage thresholds:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

## Security Testing

### Token Security Validation
- Entropy analysis for randomness
- Collision resistance testing
- Timing attack prevention
- Input validation security

### Email Security Testing
- Template injection prevention
- XSS protection in email content
- URL validation in templates
- Input sanitization verification

## Performance Testing

### Load Testing
- Token generation performance under load
- Email service throughput testing
- Database query optimization validation

### Memory Testing
- Memory leak detection in long-running processes
- Garbage collection efficiency
- Resource cleanup verification

## Continuous Integration

Tests are configured to run in CI/CD pipelines with:
- Automated test execution on pull requests
- Coverage reporting and enforcement
- Security vulnerability scanning
- Performance regression detection

## Troubleshooting

### Common Issues
1. **Mock Setup**: Ensure all external services are properly mocked
2. **Async Operations**: Use proper async/await patterns in tests
3. **Database State**: Clean up test data between test runs
4. **Environment Variables**: Set test-specific environment variables

### Debug Mode
```bash
# Run tests with debug output
DEBUG=true npx vitest run --reporter=verbose
```

### Test Isolation
Each test is designed to be independent and can run in any order without affecting other tests.