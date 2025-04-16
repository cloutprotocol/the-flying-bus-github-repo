
// This is a temporary file to update package.json's scripts
// It will be executed by a Lovable process to modify package.json

module.exports = function(packageJson) {
  // Add test scripts
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.test = "vitest run";
  packageJson.scripts["test:watch"] = "vitest";
  packageJson.scripts["test:coverage"] = "vitest run --coverage";
  packageJson.scripts["test:ui"] = "vitest --ui";
  packageJson.scripts["test:services"] = "vitest run src/services/__tests__";
  
  // Add CI/CD scripts
  packageJson.scripts.typecheck = "tsc --noEmit";
  packageJson.scripts.lint = "eslint --ext .ts,.tsx src";
  packageJson.scripts["build:ci"] = "node scripts/build.js";
  packageJson.scripts["deploy:dev"] = "node scripts/deploy.js development";
  packageJson.scripts["deploy:staging"] = "node scripts/deploy.js staging";
  packageJson.scripts["deploy:prod"] = "node scripts/deploy.js production";
  
  return packageJson;
};
