import { NextRequest, NextResponse } from 'next/server';
import { getNepalTaxConfig, getIndiaTaxConfig, type CountryTaxConfig } from '../../../../lib/tax/engine';

/**
 * GET /api/admin/tax-config
 * Fetch tax configuration for a country
 * Query params: country=NP|IN
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get('country') || 'NP';

    // Check authorization (implement your auth logic here)
    // const session = await getSession(request);
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // TODO: Fetch from database when Prisma is available
    // For now, return hardcoded defaults
    
    const defaultConfigs: Record<string, CountryTaxConfig> = {
      NP: getNepalTaxConfig(),
      IN: getIndiaTaxConfig(),
    };

    const config = defaultConfigs[country];
    if (!config) {
      return NextResponse.json(
        { error: 'Country tax configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching tax config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tax-config
 * Update tax configuration for a country
 * Body: CountryTaxConfig
 */
export async function POST(request: NextRequest) {
  try {
    // const session = await getSession(request);
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { country, rules }: CountryTaxConfig = body;

    if (!country) {
      return NextResponse.json(
        { error: 'Country code is required' },
        { status: 400 }
      );
    }

    // Validate rules
    if (!Array.isArray(rules)) {
      return NextResponse.json(
        { error: 'Rules must be an array' },
        { status: 400 }
      );
    }

    // TODO: Use transaction to update config and rules when Prisma is available
    // For now, just echo back the config to validate
    
    return NextResponse.json(
      {
        message: 'Tax configuration updated successfully (feature coming soon)',
        country,
        rulesCount: rules.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating tax config:', error);
    return NextResponse.json(
      { error: 'Failed to update tax configuration' },
      { status: 500 }
    );
  }
}
