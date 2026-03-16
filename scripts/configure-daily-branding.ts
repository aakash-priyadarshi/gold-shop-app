import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from the project root or specified path
dotenv.config({ path: path.resolve(__dirname, '../apps/team-api/.env') });

async function main() {
  // Try to get API key from env first, or process argument
  const apiKey = process.env.DAILY_API_KEY || process.argv[2];

  if (!apiKey) {
    console.error('❌ Error: DAILY_API_KEY not found in .env and no key provided as argument.');
    console.log('Usage: npx tsx scripts/configure-daily-branding.ts <DAILY_API_KEY>');
    return;
  }

  console.log('🎨 Configuring Daily.co Domain Branding for Orivraa...');
  console.log(`Using API Key: ${apiKey.substring(0, 8)}...`);
  
  try {
    const response = await axios.post(
      'https://api.daily.co/v1/domain-config',
      {
        properties: {
          logo_url: "https://www.orivraa.com/brand/orivraa-logo.svg",
          company_name: "Orivraa",
          primary_color: "#C9A227",
          background_color: "#1a1a2e",
          text_color: "#f8fafc",
          hide_daily_branding: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Domain branding configured successfully!');
    console.log('Settings:', response.data.properties);
  } catch (error: any) {
    console.error('❌ Failed to configure domain branding:', error.response?.data || error.message);
  }
}

main();
