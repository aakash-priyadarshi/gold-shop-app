# Backend-Authoritative Tax Refactoring

## Summary

This refactoring makes the **backend the single source of truth** for all tax calculations, eliminating security vulnerabilities from frontend tax calculation.

## Security Concern Addressed

**Problem**: Frontend tax calculations could be spoofed via API manipulation, allowing malicious users to bypass correct tax amounts.

**Solution**: All tax calculations now happen on the backend only. The frontend displays backend-calculated values without performing any local tax calculations.

## Nepal Tax Rules (Correct Implementation)

### Nepal FY 2081/82+ Rules:

| Tax Type | Rate | Applies To |
|----------|------|------------|
| **Luxury Tax** | 2% | Gold metal value + Gold making charges ONLY |
| **VAT** | 13% | Diamonds + Gemstones ONLY |

**Important**: 
- VAT does NOT apply to gold metal or making charges
- Luxury Tax does NOT apply to silver, diamonds, or gemstones
- Customs duty (~10%) is embedded in market premium, not shown as line item

### Example Calculation (Nepal):

For a gold ring with ruby:
- Gold metal: NPR 100,000
- Making charges: NPR 10,000
- Ruby: NPR 20,000

**Taxes:**
1. Luxury Tax: (100,000 + 10,000) × 2% = NPR 2,200
2. VAT: 20,000 × 13% = NPR 2,600
3. **Total Tax: NPR 4,800**
4. **Total Payable: NPR 134,800**

## Files Created/Modified

### New Files:

1. **`apps/api/src/modules/pricing/services/backend-tax-engine.service.ts`**
   - The authoritative tax calculation service
   - Supports: NP, IN, AE, UK, EU, US regions
   - Correct Nepal rules (2% luxury on gold, 13% VAT on stones)

2. **`apps/api/src/modules/pricing/services/backend-tax-engine.service.spec.ts`**
   - Comprehensive test suite
   - Tests Nepal gold-only, stones-only, and mixed scenarios
   - Tests India GST, UAE VAT, UK VAT rules

3. **`apps/web/src/lib/tax/secure-tax-client.ts`**
   - Frontend client for backend tax API
   - Helper functions to build tax components
   - Display formatters

### Modified Files:

1. **`apps/api/src/modules/pricing/pricing.module.ts`**
   - Added `BackendTaxEngineService` to providers and exports

2. **`apps/api/src/modules/pricing/controllers/pricing.controller.ts`**
   - Added `POST /api/pricing/tax/calculate` endpoint
   - Added `GET /api/pricing/tax/summary?region=XX` endpoint

3. **`apps/web/src/lib/tax/engine.ts`**
   - Added deprecation warning
   - Marked for removal

4. **`apps/api/src/modules/pricing/types/index.ts`**
   - Updated TAX_RATES comments to warn about deprecated usage

## API Endpoints

### POST /api/pricing/tax/calculate

Request:
```json
{
  "region": "NP",
  "components": [
    { "category": "GOLD_METAL", "amount": 100000, "description": "22K Gold" },
    { "category": "GOLD_MAKING", "amount": 10000, "description": "Making" },
    { "category": "GEMSTONE", "amount": 20000, "description": "Ruby" }
  ],
  "isJewellery": true
}
```

Response:
```json
{
  "region": "NP",
  "taxRegime": "NP_2081_82_PLUS",
  "components": {
    "goldMetalValue": 100000,
    "goldMakingCharges": 10000,
    "gemstoneValue": 20000,
    "totalStoneValue": 20000,
    "subtotalBeforeTax": 130000
  },
  "taxes": [
    {
      "type": "LUXURY_TAX",
      "name": "Luxury Tax",
      "rate": 0.02,
      "baseAmount": 110000,
      "taxAmount": 2200,
      "category": "GOLD",
      "description": "2% on gold value + making"
    },
    {
      "type": "VAT",
      "name": "VAT",
      "rate": 0.13,
      "baseAmount": 20000,
      "taxAmount": 2600,
      "category": "GEMSTONE",
      "description": "13% on diamonds & gemstones"
    }
  ],
  "taxTotal": 4800,
  "totalPayable": 134800,
  "meta": {
    "taxRegime": "NP_2081_82_PLUS",
    "source": "SYSTEM_DEFAULT",
    "waiverApplied": [],
    "calculatedAt": "2025-01-08T..."
  }
}
```

### GET /api/pricing/tax/summary?region=NP

Response:
```json
{
  "regime": "NP_2081_82_PLUS",
  "taxes": [
    { "type": "LUXURY_TAX", "name": "Luxury Tax", "rate": 0.02, "appliesTo": "Gold metal + making" },
    { "type": "VAT", "name": "VAT", "rate": 0.13, "appliesTo": "Diamonds & gemstones only" }
  ],
  "notes": "Nepal FY 2081/82+ rules. Customs duty embedded in market premium."
}
```

## Migration Guide

### Frontend Code Migration:

**Before (DEPRECATED):**
```typescript
import { calculateTax } from '@/lib/tax/engine';

const taxResult = calculateTax({
  country: 'NP',
  cartBreakdown: { ... }
});
```

**After (SECURE):**
```typescript
import { calculateTaxSecure, buildTaxComponents } from '@/lib/tax/secure-tax-client';

const components = buildTaxComponents({
  metalCost: 100000,
  metalType: 'gold',
  makingCharge: 10000,
  gemstoneCost: 20000,
  platingCost: 0,
  finishCost: 0,
});

const taxResult = await calculateTaxSecure({
  region: 'NP',
  components,
});
```

## Running Tests

```bash
cd apps/api
pnpm test -- --testPathPattern=backend-tax-engine
```

## Shopkeeper Permissions

- ✅ Shopkeepers CAN override: Making charge %, Shop premium
- ❌ Shopkeepers CANNOT override: Tax rules, Tax rates

Tax rules are system-controlled and cannot be bypassed.

## Next Steps (TODO)

1. [ ] Integrate secure tax client into `calculate-estimate.ts` (replace local tax call)
2. [ ] Update `LivePricingPanel` to use backend tax response
3. [ ] Remove deprecated frontend tax engine after migration
4. [ ] Add pricing snapshot auditing for orders
5. [ ] Add admin UI for viewing tax rule configurations
