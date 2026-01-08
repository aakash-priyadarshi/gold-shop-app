# Auram Pricing Engine

A comprehensive, multi-market pricing engine for the Auram jewellery marketplace.

## Overview

The pricing engine supports:
- **6 Markets**: India (IN), Nepal (NP), UAE (AE), UK, EU, US
- **6 Currencies**: INR, NPR, AED, USD, GBP, EUR
- **4 Build Methods**: Solid precious metal, base metal, core+finish, multi-metal
- **Precious Metals**: Gold (24K, 22K, 18K, 14K, 10K), Silver, Platinum, Palladium
- **Base Metals**: Brass, Bronze, Copper, Zinc, Nickel (restricted), Stainless Steel, Titanium, etc.
- **Gemstones**: Natural/Lab diamonds, Moissanite, CZ, Ruby, Sapphire, Emerald, Pearl, etc.
- **Finishes**: Gold plating, Rose gold plating, Vermeil, PVD coating, Rhodium plating

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Request                               │
│  POST /api/pricing/estimate                                     │
│  { marketCountry: "IN", displayCurrency: "INR", ... }           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PricingEngineService                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Validate Request                                      │   │
│  │ 2. Fetch Spot Prices (CommodityRatesService)             │   │
│  │ 3. Fetch FX Rates (FxRatesService)                       │   │
│  │ 4. Calculate Material Costs                              │   │
│  │ 5. Apply Shop Overrides (if shopId provided)             │   │
│  │ 6. Apply Market Adjustments                              │   │
│  │ 7. Calculate Taxes (TaxRulesService)                     │   │
│  │ 8. Add Platform Fee                                      │   │
│  │ 9. Convert to Display Currency                           │   │
│  │ 10. Return Explainable Breakdown                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Market Country vs Display Currency

These are **independent** parameters:
- **marketCountry**: Determines tax rules and market adjustments
- **displayCurrency**: Only affects how prices are displayed

Example: A customer in India viewing prices in USD:
```json
{
  "marketCountry": "IN",      // Indian taxes apply (3% GST)
  "displayCurrency": "USD"    // Prices shown in USD
}
```

### Build Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| METHOD_A | Solid precious metal | Gold ring, silver bracelet |
| METHOD_B | Base metal/alloy | Brass necklace, steel watch |
| METHOD_C | Core + finish | Brass core with gold plating |
| METHOD_D | Multi-metal | Gold with brass accents |

### Tax Rates by Market

| Market | Tax Type | Rate | Notes |
|--------|----------|------|-------|
| IN | GST | 3% | On precious metals; 5% on making charges |
| NP | VAT | 13% | On all items |
| AE | VAT | 5% | On all items |
| UK | VAT | 20% | On all items |
| EU | VAT | 19% | Germany default; varies by country |
| US | Sales Tax | 0-10% | State-dependent |

### Platform Fee

A 1% platform fee is applied on all successful sales.

## API Endpoints

### Calculate Full Estimate

```http
POST /api/pricing/estimate
Content-Type: application/json

{
  "marketCountry": "IN",
  "displayCurrency": "INR",
  "buildMethod": "METHOD_A",
  "totalWeightG": 10,
  "primaryMetal": "GOLD_22K",
  "gemstones": [
    {
      "stoneType": "DIAMOND_NATURAL",
      "qualityGrade": "A",
      "caratWeight": 0.5,
      "count": 1
    }
  ],
  "makingChargePct": 3
}
```

**Response:**
```json
{
  "marketCountry": "IN",
  "displayCurrency": "INR",
  "buildMethod": "METHOD_A",
  "lineItems": [
    {
      "category": "PRECIOUS_METAL",
      "code": "GOLD_22K",
      "description": "GOLD 22K (10.00g)",
      "quantity": 10,
      "unit": "gram",
      "ratePerUnit": 60.02,
      "amountUsd": 600.2,
      "amountLocal": 50117,
      "currency": "INR",
      "source": "MetalpriceAPI"
    }
  ],
  "subtotal": 50117,
  "makingCharge": 1504,
  "taxes": 1549,
  "platformFee": 532,
  "total": 53702,
  "explanation": {
    "spotPrices": [...],
    "fxRate": {...},
    "taxCalculation": {...}
  },
  "disclaimer": "Prices are estimates. GST applied as per Indian tax laws."
}
```

### Quick Metal Estimate

```http
POST /api/pricing/quick-estimate
Content-Type: application/json

{
  "marketCountry": "NP",
  "displayCurrency": "NPR",
  "metalCode": "GOLD_22K",
  "weightG": 10
}
```

### Get Configuration

```http
GET /api/pricing/config
```

Returns available markets, currencies, metals, gemstones, etc.

### Get Current Rates

```http
GET /api/pricing/rates?market=NP
```

Returns current spot prices and FX rates.

### Update Shop Override (Admin)

```http
PATCH /api/pricing/shop-override
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "shopId": "uuid",
  "overrideType": "MAKING_CHARGE",
  "itemCode": "ALL",
  "overrideMode": "PERCENTAGE",
  "overrideValue": 5
}
```

## Configuration

### Database Tables

| Table | Purpose |
|-------|---------|
| MetalPurityConfig | Purity multipliers for precious metals |
| BaseMetalPriceConfig | Base metal prices per gram |
| TaxRuleConfig | Tax rates by market and category |
| MarketAdjustmentConfig | Regional price adjustments |
| ShopPriceOverride | Shop-specific price overrides |
| FinishPriceConfig | Finish/plating pricing |
| GemPriceConfig | Gemstone pricing by type/grade |
| RoundingRuleConfig | Currency rounding rules |
| PriceCalculationLog | Audit log for calculations |

### Environment Variables

```env
# MetalpriceAPI (for spot prices)
METALPRICE_API_KEY=your_api_key

# Frankfurter API (for FX rates) - no key needed

# Cache TTL (optional)
PRICING_CACHE_TTL_MS=300000  # 5 minutes
```

## Updating Prices and Taxes

### Update Tax Rate

```typescript
// Using the API
PATCH /api/pricing/tax-rule
{
  "marketRegion": "IN",
  "taxName": "GST",
  "category": "PRECIOUS_METAL",
  "rate": 0.03
}

// Or directly in database
UPDATE "TaxRuleConfig" 
SET rate = 0.03 
WHERE "marketRegion" = 'IN' AND "taxName" = 'GST';
```

### Add New Market Adjustment

```typescript
// Premium for UAE market
INSERT INTO "MarketAdjustmentConfig" 
(id, "marketRegion", category, "adjustmentType", "adjustmentValue", description, "isActive")
VALUES 
(gen_random_uuid(), 'AE', 'PRECIOUS_METAL', 'PERCENTAGE', 2, 'UAE premium', true);
```

### Update Shop Override

```typescript
// Set 5% markup for a specific shop
PATCH /api/pricing/shop-override
{
  "shopId": "shop-uuid",
  "overrideType": "ALL",
  "itemCode": "ALL",
  "overrideMode": "PERCENTAGE",
  "overrideValue": 5
}
```

## Seeding Data

Run the pricing engine seed to populate default configurations:

```bash
npx ts-node prisma/seeds/pricing-engine.seed.ts
```

This seeds:
- Metal purity configurations (Gold 24K-10K, Silver 999/925, Platinum, Palladium)
- Base metal prices
- Tax rules for all 6 markets
- Market adjustments
- Finish pricing tiers
- Gemstone pricing by grade
- Currency rounding rules

## Nickel Compliance

Nickel and nickel-containing alloys (German Silver) are **restricted** materials.

To use these materials, the request must include `nickelCompliantFlag: true`:

```json
{
  "buildMethod": "METHOD_B",
  "coreMetal": "NICKEL",
  "nickelCompliantFlag": true
}
```

Without this flag, the API returns an error.

## Audit Trail

All pricing calculations are logged to `PriceCalculationLog` with:
- Request ID (UUID)
- Full request payload
- Spot prices and FX rates used
- All adjustments applied
- Tax breakdown
- Final result
- Calculation time (ms)

Query recent calculations:
```sql
SELECT * FROM "PriceCalculationLog" 
WHERE "createdAt" > NOW() - INTERVAL '1 day'
ORDER BY "createdAt" DESC
LIMIT 100;
```

## Error Handling

| Error | Description |
|-------|-------------|
| `marketCountry is required` | Missing market parameter |
| `totalWeightG must be greater than 0` | Invalid weight |
| `primaryMetal is required for METHOD_A` | Missing metal for build method |
| `Nickel-containing materials require nickelCompliantFlag=true` | Nickel compliance |
| `Metal rate not found` | Returns warning, uses estimate |

## Testing

```bash
# Run unit tests
npm run test -- --grep "pricing"

# Run E2E tests
npm run test:e2e -- --grep "pricing"
```

## Example Calculations

### Gold Ring (10g, 22K, India)

```
Base: 10g × $60.02/g (22K spot) = $600.20
Making Charge (3%): $18.01
Subtotal: $618.21
GST (3%): $18.55
Platform Fee (1%): $6.37
Total: $643.13 USD = ₹53,702 INR
```

### Silver Bracelet with Moissanite (15g, 925, Nepal)

```
Silver: 15g × $0.75/g = $11.25
Moissanite (0.5ct, Grade A): $150
Making Charge (3%): $4.84
Subtotal: $166.09
VAT (13%): $21.59
Platform Fee (1%): $1.88
Total: $189.56 USD = NPR 25,496
```

## Future Enhancements

- [ ] Real-time WebSocket price updates
- [ ] Bulk pricing calculator
- [ ] Historical price charts
- [ ] Price alerts/notifications
- [ ] Multi-item cart pricing
- [ ] Insurance/shipping calculation
