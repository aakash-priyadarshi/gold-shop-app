import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
    /\/api$/,
    "",
  ) + "/api";

/**
 * GET /api/settings/tax-config
 * Fetch tax rules for a country from the backend
 * Query params: country=NP|IN|AE|UK|EU|US
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get("country") || "NP";

    const response = await fetch(
      `${API_BASE_URL}/pricing/tax-rules?region=${encodeURIComponent(country)}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch tax rules from backend" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching tax config:", error);
    return NextResponse.json(
      { error: "Failed to fetch tax configuration" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/settings/tax-config
 * Save tax rules for a country via the backend
 * Body: { region: string, rules: Array<{ taxName, taxType, category, rate, description?, priority? }> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { region, rules } = body;

    if (!region) {
      return NextResponse.json(
        { error: "Region (country code) is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(rules)) {
      return NextResponse.json(
        { error: "Rules must be an array" },
        { status: 400 },
      );
    }

    const response = await fetch(`${API_BASE_URL}/pricing/tax-rules/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region, rules }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.message || "Failed to save tax rules" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating tax config:", error);
    return NextResponse.json(
      { error: "Failed to update tax configuration" },
      { status: 500 },
    );
  }
}
