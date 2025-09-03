#!/usr/bin/env node

/**
 * Test script to verify build info generation with different scenarios
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing build info generation...\n');

// Save current environment
const originalEnv = { ...process.env };

// Test scenarios
const scenarios = [
  {
    name: 'Local Development (no CI)',
    env: {}
  },
  {
    name: 'Azure Pipeline - Branch Build (main)',
    env: {
      CI: 'true',
      TF_BUILD: 'True',
      BUILD_BUILDNUMBER: '20250902.1',
      BUILD_SOURCEBRANCHNAME: 'main',
      BUILD_SOURCEBRANCH: 'refs/heads/main',
      BUILD_REASON: 'IndividualCI',
      AGENT_NAME: 'Hosted Agent'
    }
  },
  {
    name: 'Azure Pipeline - Tag Build (v1.2.3)',
    env: {
      CI: 'true',
      TF_BUILD: 'True',
      BUILD_BUILDNUMBER: '20250902.2',
      BUILD_SOURCEBRANCHNAME: 'v1.2.3',
      BUILD_SOURCEBRANCH: 'refs/tags/v1.2.3',
      BUILD_REASON: 'IndividualCI',
      AGENT_NAME: 'Hosted Agent',
      BUILD_VERSION: '1.2.3',
      BUILD_TAG: 'v1.2.3'
    }
  },
  {
    name: 'Azure Pipeline - Tag Build with BUILD_VERSION only',
    env: {
      CI: 'true',
      TF_BUILD: 'True',
      BUILD_BUILDNUMBER: '20250902.3',
      BUILD_SOURCEBRANCHNAME: 'v2.0.0',
      BUILD_SOURCEBRANCH: 'refs/tags/v2.0.0',
      BUILD_VERSION: '2.0.0',
      AGENT_NAME: 'Hosted Agent'
    }
  }
];

// Run each scenario
scenarios.forEach((scenario, index) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scenario ${index + 1}: ${scenario.name}`);
  console.log(`${'='.repeat(60)}`);
  
  // Set environment variables for this scenario
  Object.keys(scenario.env).forEach(key => {
    process.env[key] = scenario.env[key];
  });
  
  // Clear environment variables not in this scenario
  Object.keys(originalEnv).forEach(key => {
    if (!scenario.env[key] && key.startsWith('BUILD_')) {
      delete process.env[key];
    }
  });
  
  console.log('Environment variables:');
  Object.entries(scenario.env).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  try {
    // Run the build info generator
    execSync('node scripts/generate-build-info.js test', { 
      stdio: 'inherit',
      env: process.env 
    });
    
    // Read and display the generated build info
    const buildInfoPath = path.join(__dirname, '..', 'src', 'assets', 'build-info.json');
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
    
    console.log('\n📋 Generated build-info.json:');
    console.log(JSON.stringify(buildInfo, null, 2));
    
    // Validate key fields
    console.log('\n✅ Validation:');
    console.log(`  Version: ${buildInfo.version} ${buildInfo.version === '0.0.0' ? '⚠️ (default)' : '✓'}`);
    console.log(`  Build Number: ${buildInfo.buildNumber} ${buildInfo.buildNumber.startsWith('local-') ? '⚠️ (local)' : '✓'}`);
    console.log(`  Tag: ${buildInfo.tag} ${buildInfo.tag === 'none' ? '⚠️ (none)' : '✓'}`);
    console.log(`  Environment: ${buildInfo.environment}`);
    console.log(`  Is CI: ${buildInfo.isCI}`);
    
  } catch (error) {
    console.error('❌ Error running scenario:', error.message);
  }
  
  // Restore original environment
  process.env = { ...originalEnv };
});

console.log(`\n${'='.repeat(60)}`);
console.log('🎉 Test completed!');
console.log(`${'='.repeat(60)}\n`);

// Restore the original build-info.json by running without CI env
console.log('🔄 Restoring original build-info.json...');
execSync('node scripts/generate-build-info.js', { stdio: 'inherit' });