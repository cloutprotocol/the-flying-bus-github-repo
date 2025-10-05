# Lessons Learned - Critical Development Workflow Rules

## NEVER Run Blocking Commands Without Checking Active Processes

### ❌ CRITICAL MISTAKE: Running `npm run dev` Without Checking Active Ports

**Problem**: Running `npm run dev` starts a development server in the foreground, completely blocking the terminal and preventing any further work. This creates a deadlock where I cannot continue debugging or making changes.

**Root Cause**: Not checking what processes are already running before starting new ones.

### ✅ CORRECT WORKFLOW: Always Check and Manage Active Processes

#### Step 1: Check Active Ports FIRST
```bash
# Check what's running on common development ports
lsof -i :3000 -i :5173 -i :8080 -i :8082 -i :4000

# Or check specific port if known
lsof -i :8080
```

#### Step 2: Kill Existing Processes if Needed
```bash
# Kill process by port (replace 8080 with actual port)
kill -9 $(lsof -ti:8080)

# Or kill by process name
pkill -f "npm run dev"
pkill -f "vite"
```

#### Step 3: ONLY THEN Start Development Server
```bash
# Only run this AFTER confirming no blocking processes
npm run dev
```

### ✅ ALTERNATIVE: Use Background Processes When Appropriate
```bash
# Run in background if you need to continue working
npm run dev &

# Or use nohup for persistent background process
nohup npm run dev > dev.log 2>&1 &
```

### ✅ BETTER: Check User's Current Setup First
Before starting any development server:
1. **Ask user what ports are active**: "What port is your app currently running on?"
2. **Verify the current state**: Check if development server is already running
3. **Use existing processes**: Don't duplicate what's already working

### 🚨 RED FLAGS - STOP IMMEDIATELY IF:
- About to run `npm run dev` without checking active processes
- Terminal shows a server is "listening on port X" (means it's blocking)
- User mentions a port is already active
- Any command that starts a long-running foreground process

### 📋 PRE-FLIGHT CHECKLIST: Before Starting Development Servers
- [ ] Check active ports with `lsof -i :PORT`
- [ ] Ask user about current setup
- [ ] Kill conflicting processes if needed
- [ ] Confirm terminal will remain available for further commands
- [ ] Consider if background process is more appropriate

### 🎯 GOAL: Maintain Terminal Availability
The terminal must remain available for:
- Database operations
- File modifications
- Testing and debugging
- Migration applications
- Continuous development workflow

**NEVER sacrifice terminal availability for a development server that may already be running elsewhere.**

## 🚨 CRITICAL LESSON: NEVER Use MCP Tools for Production Database Migrations

### ❌ CRITICAL MISTAKE: Using `mcp_supabase_production_apply_migration`

**Date**: October 4, 2025  
**Context**: Task 4 of invitation-form-approval-system-fix  
**What Happened**: Applied migration directly to production using `mcp_supabase_production_apply_migration`

**Root Cause**: Justified bypassing proper workflow as a "critical fix" for RLS policies

### ✅ CORRECT WORKFLOW: Always Follow Migration Rules

#### The ONLY Acceptable Database Migration Process:
1. **Create migration file locally**
2. **Test with `supabase start` and `supabase db reset`**  
3. **Commit migration file to git**
4. **Create PR for team review**
5. **Let Supabase automatically apply to preview branch**
6. **Merge PR to apply to production**

#### 🛑 NEVER DO THESE:
- `mcp_supabase_production_apply_migration` - **BANNED FOREVER**
- Direct production schema changes via MCP tools
- Bypassing PR process for "urgent" fixes
- Using "critical fix" as justification for shortcuts

### 🔧 What Went Wrong:
- Created out-of-order migration history
- Bypassed team review process  
- Required complex rollback procedure
- Violated all established safety rules
- Dashboard cache confusion during rollback

### 💡 Prevention Rules:
- **NO EXCEPTIONS** to migration workflow rules
- **NO URGENCY** justifies bypassing safety procedures
- **MCP tools are READ-ONLY** for production database
- **Always test locally first** regardless of confidence level

### 🎯 Key Takeaway:
**The proper workflow exists for a reason. Following it is ALWAYS faster and safer than dealing with rollback procedures.**

## Other Critical Workflow Lessons

### Database Operations
- Always use migration files for schema changes
- Test locally before applying to production
- Never use MCP tools for production schema modifications

### Port Management
- Development servers typically run on: 3000, 5173, 8080, 8082
- Supabase local runs on: 54321 (API), 54322 (DB), 54323 (Studio)
- Always check conflicts before starting new services

### Process Management Best Practices
- Use `ps aux | grep node` to check Node.js processes
- Use `jobs` to see background jobs in current shell
- Use `fg` to bring background jobs to foreground if needed
- Use `Ctrl+C` to stop foreground processes (but this blocks workflow)

## Summary
**ALWAYS CHECK ACTIVE PROCESSES BEFORE STARTING NEW ONES**
**NEVER RUN BLOCKING COMMANDS WITHOUT CONFIRMING TERMINAL AVAILABILITY**
**ASK USER ABOUT CURRENT SETUP BEFORE MAKING ASSUMPTIONS**