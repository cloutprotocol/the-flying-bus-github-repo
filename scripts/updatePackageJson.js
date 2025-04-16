
// This is a temporary file to update package.json's scripts
// It will be executed by a Lovable process to modify package.json

module.exports = function(packageJson) {
  // Add test scripts
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.test = "vitest run";
  packageJson.scripts["test:watch"] = "vitest";
  packageJson.scripts["test:coverage"] = "vitest run --coverage";
  packageJson.scripts["test:ui"] = "vitest --ui";
  
  return packageJson;
};
