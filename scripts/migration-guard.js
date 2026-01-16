#!/usr/bin/env node
/**
 * Migration Safety Script
 * 
 * This script checks if it's safe to run Prisma migrations.
 * It prevents accidental production database resets.
 * 
 * Usage: node scripts/migration-guard.js
 */

const readline = require('readline');

const PRODUCTION_DB_PATTERNS = [
  'neon.tech',
  'supabase.co',
  'railway.app',
  'aws.amazon.com',
  'azure.com',
  'planetscale.com',
  'orivraa',
];

const DANGEROUS_COMMANDS = [
  'migrate dev',
  'db push --force',
  'migrate reset',
  'db push --accept-data-loss',
];

function isProductionDatabase(dbUrl) {
  if (!dbUrl) return false;
  return PRODUCTION_DB_PATTERNS.some(pattern => 
    dbUrl.toLowerCase().includes(pattern.toLowerCase())
  );
}

function isDangerousCommand(command) {
  return DANGEROUS_COMMANDS.some(dangerous => 
    command.toLowerCase().includes(dangerous.toLowerCase())
  );
}

async function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const command = process.argv.slice(2).join(' ');

  console.log('\n🔒 Migration Safety Check\n');
  console.log('=' .repeat(50));

  // Check if DATABASE_URL is set
  if (!dbUrl) {
    console.log('⚠️  DATABASE_URL is not set');
    console.log('   Make sure you have the correct environment loaded.\n');
    process.exit(1);
  }

  // Mask the password in the URL for display
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`📍 Database: ${maskedUrl}`);

  // Check if it's a production database
  const isProd = isProductionDatabase(dbUrl);
  const isDangerous = isDangerousCommand(command);

  if (isProd) {
    console.log('🚨 WARNING: This appears to be a PRODUCTION database!\n');
    
    if (isDangerous) {
      console.log('❌ BLOCKED: You are trying to run a potentially destructive command');
      console.log(`   Command: ${command}\n`);
      console.log('   This command could RESET or DELETE production data!\n');
      console.log('   Safe alternatives:');
      console.log('   - Use "prisma migrate deploy" for production migrations');
      console.log('   - Use "prisma generate" to update the client only');
      console.log('   - Create migrations locally with a local database\n');
      
      const confirmed = await askConfirmation(
        '⚠️  Are you ABSOLUTELY SURE you want to proceed? Type "yes" to continue: '
      );

      if (!confirmed) {
        console.log('\n✅ Operation cancelled. Your data is safe.\n');
        process.exit(1);
      }

      console.log('\n⚠️  Proceeding with caution...\n');
    } else {
      console.log('✅ Command appears safe for production.\n');
    }
  } else {
    console.log('✅ This appears to be a development/local database.\n');
  }

  console.log('=' .repeat(50));
  console.log('Proceeding with migration...\n');
}

main().catch(console.error);
