#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const teamApiDir = "c:\\Users\\aakas\\OneDrive\\project-bussiness\\gold-shop-app\\apps\\team-api";
process.chdir(teamApiDir);

try {
  const result = execSync('npx tsc --noEmit', { 
    encoding: 'utf-8',
    stdio: 'pipe',
    maxBuffer: 10 * 1024 * 1024 
  });
  console.log(result);
} catch (error) {
  console.log(error.stdout || '');
  if (error.stderr) {
    console.log(error.stderr);
  }
  process.exit(error.status || 1);
}
