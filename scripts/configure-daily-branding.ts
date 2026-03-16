import axios from 'axios';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const settings = await prisma.teamSettings.findUnique({ where: { id: 'singleton' } }) as any;
  const apiKey = settings?.dailyApiKey;

  if (!apiKey) {
    console.error('Daily API key not found in settings.');
    return;
  }

  console.log('Configuring Daily.co Domain Branding for Orivraa...');
  
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
    console.log('Domain branding configured successfully:', response.data);
  } catch (error) {
    console.error('Failed to configure domain branding:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
