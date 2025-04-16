#!/usr/bin/env node

/**
 * Enhanced build script with performance metrics and validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Config
const BUILD_START_TIME = Date.now();
const BUILD_LOG_FILE = path.join(__dirname, '../build-logs.json');

function logBuildEvent(event, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    data
  };
  
  console.log(`[BUILD] ${event}`);
  
  try {
    let logs = [];
    if (fs.existsSync(BUILD_LOG_FILE)) {
      logs = JSON.parse(fs.readFileSync(BUILD_LOG_FILE, 'utf8'));
    }
    
    logs.push(entry);
    
    // Keep only the last 50 build logs
    if (logs.length > 50) {
      logs = logs.slice(logs.length - 50);
    }
    
    fs.writeFileSync(BUILD_LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Failed to log build event:', error);
  }
}

// Step 1: Run type check
logBuildEvent('Starting type check');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  logBuildEvent('Type check passed');
} catch (error) {
  logBuildEvent('Type check failed', { error: error.message });
  process.exit(1);
}

// Step 2: Run tests
logBuildEvent('Starting tests');
try {
  execSync('npm test', { stdio: 'inherit' });
  logBuildEvent('Tests passed');
} catch (error) {
  logBuildEvent('Tests failed', { error: error.message });
  process.exit(1);
}

// Step 3: Build the application
logBuildEvent('Starting build');
try {
  execSync('vite build', { stdio: 'inherit' });
  
  const buildEndTime = Date.now();
  const buildDuration = (buildEndTime - BUILD_START_TIME) / 1000;
  
  // Check if build directory exists and is not empty
  const distDir = path.join(__dirname, '../dist');
  if (!fs.existsSync(distDir) || fs.readdirSync(distDir).length === 0) {
    throw new Error('Build directory is empty or does not exist');
  }
  
  logBuildEvent('Build completed', { 
    duration: `${buildDuration}s`,
    outputDir: 'dist',
    fileCount: fs.readdirSync(distDir).length
  });
} catch (error) {
  logBuildEvent('Build failed', { error: error.message });
  process.exit(1);
}

console.log(`Build completed successfully in ${(Date.now() - BUILD_START_TIME) / 1000}s`);
