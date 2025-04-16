
#!/usr/bin/env node

/**
 * Deployment script for The Flying Bus platform
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const DEPLOY_ENVIRONMENTS = {
  production: {
    name: 'Production',
    url: 'https://flyingbus.example.com'
  },
  staging: {
    name: 'Staging',
    url: 'https://staging.flyingbus.example.com'
  },
  development: {
    name: 'Development',
    url: 'https://dev.flyingbus.example.com'
  }
};

// Parse arguments
const args = process.argv.slice(2);
const environment = args[0] || 'development';

if (!DEPLOY_ENVIRONMENTS[environment]) {
  console.error(`Unknown environment: ${environment}`);
  console.error(`Available environments: ${Object.keys(DEPLOY_ENVIRONMENTS).join(', ')}`);
  process.exit(1);
}

const targetEnv = DEPLOY_ENVIRONMENTS[environment];
console.log(`Starting deployment to ${targetEnv.name} environment (${targetEnv.url})`);

// Ensure we have a build
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir) || fs.readdirSync(distDir).length === 0) {
  console.error('Build directory is empty or does not exist. Run build script first.');
  process.exit(1);
}

// Create version file with build info
const version = {
  buildTime: new Date().toISOString(),
  environment: environment,
  commit: execSync('git rev-parse HEAD').toString().trim(),
  branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
};

fs.writeFileSync(path.join(distDir, 'version.json'), JSON.stringify(version, null, 2));

// Simulate deployment (replace with actual deployment logic)
console.log(`Deploying to ${targetEnv.name}...`);
console.log('Files to deploy:', fs.readdirSync(distDir).length);

// In a real deployment, you'd have commands to upload to your hosting service
console.log('Deployment complete!');
console.log(`Application available at: ${targetEnv.url}`);
