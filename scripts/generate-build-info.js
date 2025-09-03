#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to get git information
function getGitInfo() {
  try {
    const isTagRef = (process.env.BUILD_SOURCEBRANCH || '').startsWith('refs/tags/');

    // Prefer Azure variables for commit when available
    const commitFullFromEnv = process.env.BUILD_SOURCEVERSION || '';
    const commitFull = commitFullFromEnv || execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const commit = commitFull.substring(0, 7);

    // Determine branch:
    // - For tag builds, infer a branch that contains the commit (first match)
    // - Otherwise, use the current branch name
    let branch;
    if (isTagRef) {
      try {
        branch = execSync('git for-each-ref --format="%(refname:short)" --contains ' + commitFull + ' refs/heads/* | head -n1', { encoding: 'utf-8' }).trim();
      } catch {
        branch = 'unknown';
      }
    } else {
      branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    }

    const tag = execSync('git describe --tags --exact-match 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim();
    
    return {
      branch,
      commit,
      commitFull,
      tag: tag || 'none'
    };
  } catch (error) {
    console.warn('Warning: Unable to get git information', error.message);
    return {
      branch: 'unknown',
      commit: 'unknown',
      commitFull: 'unknown',
      tag: 'none'
    };
  }
}

// Function to get package version
function getPackageVersion() {
  // First check if version is provided via environment variable (from Azure Pipeline)
  if (process.env.BUILD_VERSION) {
    // Ignore unresolved Azure variables/expressions
    const raw = process.env.BUILD_VERSION.trim();
    const isUnresolved = raw.startsWith('$(') || raw.startsWith('$[');
    if (!isUnresolved && raw) {
      console.log('Using version from BUILD_VERSION environment variable:', raw);
      return raw;
    }
  }
  // Then try cleanVersion from Azure (for tag builds)
  const cleanFromEnv = process.env.cleanVersion || process.env.CLEANVERSION || '';
  if (cleanFromEnv) {
    console.log('Using version from cleanVersion environment variable:', cleanFromEnv);
    return cleanFromEnv;
  }
  
  try {
    const packageJson = require('../package.json');
    const version = packageJson.version || '0.0.0';
    console.log('Using version from package.json:', version);
    return version;
  } catch (error) {
    console.warn('Warning: Unable to read package.json', error.message);
    return '0.0.0';
  }
}

// Function to get Angular version
function getAngularVersion() {
  try {
    const packageJson = require('../package.json');
    const angularCore = (packageJson.dependencies && packageJson.dependencies['@angular/core'])
      || (packageJson.devDependencies && packageJson.devDependencies['@angular/core']);
    // Remove ^ or ~ from version string
    return angularCore ? angularCore.replace(/^[\^~]/, '') : 'unknown';
  } catch (error) {
    console.warn('Warning: Unable to get Angular version', error.message);
    return 'unknown';
  }
}

// Main function to generate build info
function generateBuildInfo() {
  const gitInfo = getGitInfo();
  const version = getPackageVersion();
  const angularVersion = getAngularVersion();
  
  // Check for Azure DevOps environment variables
  const buildNumber = process.env.BUILD_BUILDNUMBER || 
                      process.env.BUILD_NUMBER || 
                      `local-${Date.now()}`;
  
  const buildDate = new Date().toISOString();
  
  // Check if we're in a CI/CD environment
  const isCI = process.env.CI === 'true' || 
               process.env.BUILD_BUILDNUMBER !== undefined ||
               process.env.TF_BUILD === 'True';
  
  // Get the environment from command line argument or environment variable
  const environment = process.argv[2] || 
                     process.env.NODE_ENV || 
                     'development';
  
  // If we're in Azure DevOps and have tag information
  // First check BUILD_TAG env var, then BUILD_SOURCEBRANCH, then git info
  const azureTag = process.env.BUILD_TAG || 
    (process.env.BUILD_SOURCEBRANCH?.startsWith('refs/tags/') 
      ? process.env.BUILD_SOURCEBRANCH.replace('refs/tags/', '')
      : gitInfo.tag);
  
  // Determine a human-friendly branch value:
  // - If BUILD_SOURCEBRANCH is a tag ref, avoid showing the tag as a branch
  // - Use the inferred branch from gitInfo in that case
  const sourceBranch = process.env.BUILD_SOURCEBRANCH || '';
  const buildBranchName = sourceBranch.startsWith('refs/heads/')
    ? (process.env.BUILD_SOURCEBRANCHNAME || sourceBranch.replace('refs/heads/', ''))
    : gitInfo.branch;
  
  const buildInfo = {
    version: version,
    buildNumber: buildNumber,
    buildDate: buildDate,
    branch: buildBranchName,
    commit: gitInfo.commit,
    commitFull: gitInfo.commitFull,
    tag: azureTag,
    environment: environment,
    angularVersion: angularVersion,
    isCI: isCI,
    buildAgent: process.env.AGENT_NAME || 'local',
    buildReason: process.env.BUILD_REASON || 'manual'
  };
  
  // Create assets directory if it doesn't exist
  const assetsDir = path.join(__dirname, '..', 'src', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Write build info to file
  const buildInfoPath = path.join(assetsDir, 'build-info.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
  
  console.log('✅ Build info generated successfully:');
  console.log(JSON.stringify(buildInfo, null, 2));
  console.log(`📁 Written to: ${buildInfoPath}`);

  // Also emit a TypeScript module for compile-time fallback
  const tsOutPath = path.join(__dirname, '..', 'src', 'app', 'build-info.generated.ts');
  const tsContents = `/**
 * This file is auto-generated by scripts/generate-build-info.js
 * Do not edit manually.
 */
export const BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)} as const;
`;
  fs.writeFileSync(tsOutPath, tsContents);
  console.log(`📁 Written TS fallback: ${tsOutPath}`);
}

// Run the script
try {
  generateBuildInfo();
} catch (error) {
  console.error('❌ Error generating build info:', error);
  process.exit(1);
}