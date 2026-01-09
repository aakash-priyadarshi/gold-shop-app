#!/usr/bin/env tsx
/**
 * Migration Safety Check Script
 * Detects destructive changes in Prisma migrations
 * 
 * Usage:
 *   npx tsx scripts/check-migrations-safe.ts
 *   pnpm check-migrations
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { existsSync } from 'fs';

const MIGRATIONS_DIR = join(process.cwd(), 'apps/api/prisma/migrations');

// Patterns that indicate potentially destructive operations
const DESTRUCTIVE_PATTERNS = [
  { pattern: /DROP\s+TABLE/gi, severity: 'critical', description: 'Drops entire table' },
  { pattern: /DROP\s+COLUMN/gi, severity: 'critical', description: 'Drops column (data loss)' },
  { pattern: /ALTER\s+TABLE\s+.*\s+DROP/gi, severity: 'critical', description: 'Drops table element' },
  { pattern: /TRUNCATE/gi, severity: 'critical', description: 'Truncates table (data loss)' },
  { pattern: /DELETE\s+FROM/gi, severity: 'high', description: 'Deletes rows' },
  { pattern: /ALTER\s+TYPE/gi, severity: 'medium', description: 'Changes column type' },
  { pattern: /SET\s+NOT\s+NULL/gi, severity: 'medium', description: 'Adds NOT NULL constraint' },
  { pattern: /ALTER\s+.*\s+RENAME/gi, severity: 'low', description: 'Renames element' },
];

interface MigrationIssue {
  file: string;
  line: number;
  pattern: string;
  severity: string;
  description: string;
  context: string;
}

async function findMigrationFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  if (!existsSync(dir)) {
    console.log('No migrations directory found');
    return files;
  }
  
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Look for migration.sql in subdirectories
      const sqlFile = join(fullPath, 'migration.sql');
      if (existsSync(sqlFile)) {
        files.push(sqlFile);
      }
    } else if (entry.name.endsWith('.sql')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function checkMigrationFile(filePath: string): Promise<MigrationIssue[]> {
  const issues: MigrationIssue[] = [];
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const { pattern, severity, description } of DESTRUCTIVE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        issues.push({
          file: relative(process.cwd(), filePath),
          line: i + 1,
          pattern: match[0],
          severity,
          description,
          context: line.trim().substring(0, 100),
        });
      }
    }
  }
  
  return issues;
}

async function main() {
  console.log('🔍 Migration Safety Check');
  console.log('═'.repeat(50));
  console.log('');

  const migrationFiles = await findMigrationFiles(MIGRATIONS_DIR);
  
  if (migrationFiles.length === 0) {
    console.log('✅ No migration files found to check');
    process.exit(0);
  }
  
  console.log(`📁 Found ${migrationFiles.length} migration file(s)`);
  console.log('');

  const allIssues: MigrationIssue[] = [];
  
  for (const file of migrationFiles) {
    const issues = await checkMigrationFile(file);
    allIssues.push(...issues);
  }
  
  if (allIssues.length === 0) {
    console.log('✅ No destructive patterns detected in migrations');
    process.exit(0);
  }
  
  // Group by severity
  const critical = allIssues.filter(i => i.severity === 'critical');
  const high = allIssues.filter(i => i.severity === 'high');
  const medium = allIssues.filter(i => i.severity === 'medium');
  const low = allIssues.filter(i => i.severity === 'low');
  
  console.log('⚠️  Potentially Destructive Operations Detected:');
  console.log('');
  
  const printIssues = (issues: MigrationIssue[], icon: string) => {
    for (const issue of issues) {
      console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`);
      console.log(`   Pattern: ${issue.pattern}`);
      console.log(`   Description: ${issue.description}`);
      console.log(`   Context: ${issue.context}`);
      console.log('');
    }
  };
  
  if (critical.length > 0) {
    console.log('🚨 CRITICAL ISSUES:');
    printIssues(critical, '🚨');
  }
  
  if (high.length > 0) {
    console.log('❌ HIGH SEVERITY:');
    printIssues(high, '❌');
  }
  
  if (medium.length > 0) {
    console.log('⚠️  MEDIUM SEVERITY:');
    printIssues(medium, '⚠️');
  }
  
  if (low.length > 0) {
    console.log('ℹ️  LOW SEVERITY:');
    printIssues(low, 'ℹ️');
  }
  
  console.log('═'.repeat(50));
  console.log('📊 Summary:');
  console.log(`   Critical: ${critical.length}`);
  console.log(`   High: ${high.length}`);
  console.log(`   Medium: ${medium.length}`);
  console.log(`   Low: ${low.length}`);
  console.log('');
  
  if (critical.length > 0 || high.length > 0) {
    console.log('🚨 ACTION REQUIRED:');
    console.log('   1. Verify these changes are intentional');
    console.log('   2. Ensure data backup exists before deploying');
    console.log('   3. Test on staging environment first');
    console.log('   4. Have rollback plan ready');
    process.exit(1);
  }
  
  console.log('⚠️  Review recommended but not blocking');
  process.exit(0);
}

main().catch((error) => {
  console.error('💥 Migration check failed:', error);
  process.exit(1);
});
