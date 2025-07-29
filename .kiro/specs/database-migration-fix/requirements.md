# Requirements Document

## Introduction

The current Supabase migration files contain SQL syntax errors that prevent the database from starting. Specifically, the invitation token management functions migration file has unterminated dollar-quoted strings, causing PostgreSQL to fail parsing the SQL. This needs to be fixed to restore database functionality and allow development to continue.

## Requirements

### Requirement 1

**User Story:** As a developer, I want the Supabase database to start successfully, so that I can continue development work on the application.

#### Acceptance Criteria

1. WHEN running `supabase start` THEN the command SHALL complete successfully without SQL syntax errors
2. WHEN the database starts THEN all existing migration files SHALL be applied without errors
3. WHEN the database is running THEN all invitation token management functions SHALL be available and functional

### Requirement 2

**User Story:** As a developer, I want properly formatted SQL migration files, so that they can be maintained and extended without syntax issues.

#### Acceptance Criteria

1. WHEN reviewing migration files THEN all dollar-quoted strings SHALL use proper PostgreSQL syntax (e.g., `$$` or `$function$`)
2. WHEN adding new SQL functions THEN they SHALL follow consistent formatting and syntax standards
3. WHEN validating SQL syntax THEN all functions SHALL parse correctly in PostgreSQL

### Requirement 3

**User Story:** As a developer, I want all invitation token management functions to work correctly, so that the invitation system continues to function as designed.

#### Acceptance Criteria

1. WHEN calling any invitation token function THEN it SHALL execute without errors
2. WHEN testing token generation THEN new tokens SHALL be created with proper expiration dates
3. WHEN validating tokens THEN the validation function SHALL return accurate status information
4. WHEN cleaning up expired tokens THEN the cleanup function SHALL remove only expired, unused tokens