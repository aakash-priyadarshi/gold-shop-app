/**
 * Integration Test: Tax Engine with Pricing Calculator
 * 
 * This demonstrates how the tax engine integrates with estimate calculations
 */

import { calculateEstimate, type EstimateRequest } from '../calculate-estimate';

// Test Case 1: Nepal gold jewellery with gemstones
console.log('=== Test 1: Nepal Gold Jewellery with Gemstones ===');
const nepalGoldRequest: EstimateRequest = {
  buildMethod: 'METHOD_A',
  jewelleryType: 'Gold Ring with Diamond',
  country: 'NP',
  currency: 'NPR',
  methodA: {
    metal: 'GOLD_22K',
    weightGrams: 5,
  },
  gemstones: [
    {
      stoneType: 'DIAMOND_NATURAL',
      shape: 'ROUND',
      sizeValue: '1.0',
      sizeUnit: 'CARAT',
      count: 1,
    },
  ],
  marketRates: {
    metals: {
      GOLD_22K: 6000,
    },
  },
};

const estimate1 = calculateEstimate(nepalGoldRequest);
console.log(`Status: ${estimate1.status}`);
console.log(`Metal Cost: ₨${estimate1.metalCost.toFixed(2)}`);
console.log(`Gemstone Cost: ₨${estimate1.gemstoneCost.toFixed(2)}`);
console.log(`Making Charge: ₨${estimate1.makingCharge.toFixed(2)}`);
console.log(`Subtotal: ₨${estimate1.subtotal.toFixed(2)}`);
console.log(`Tax (Luxury Tax 2% + VAT 13%): ₨${estimate1.taxAmount.toFixed(2)}`);
console.log(`Total: ₨${estimate1.total.toFixed(2)}`);
console.log(`\nTax Breakdown:`);
estimate1.lineItems
  .filter(item => item.category === 'METAL' || item.label.includes('%'))
  .forEach(item => {
    console.log(`  - ${item.label}: ₨${item.amount.toFixed(2)}`);
  });
console.log(`\nTax Result Details:`);
if (estimate1.taxResult) {
  console.log(`  Total Tax: ₨${estimate1.taxResult.totalTax.toFixed(2)}`);
  console.log(`  Effective Rate: ${(estimate1.taxResult.effectiveRate * 100).toFixed(2)}%`);
  console.log(`  Tax Line Items: ${estimate1.taxResult.lineItems.length}`);
}

// Test Case 2: India jewellery
console.log('\n\n=== Test 2: India Gold Jewellery (GST) ===');
const indiaGoldRequest: EstimateRequest = {
  buildMethod: 'METHOD_A',
  jewelleryType: 'Gold Bracelet',
  country: 'IN',
  currency: 'INR',
  methodA: {
    metal: 'GOLD_24K',
    weightGrams: 10,
  },
  marketRates: {
    metals: {
      GOLD_24K: 80000,
    },
  },
};

const estimate2 = calculateEstimate(indiaGoldRequest);
console.log(`Status: ${estimate2.status}`);
console.log(`Metal Cost: ₹${estimate2.metalCost.toFixed(2)}`);
console.log(`Making Charge: ₹${estimate2.makingCharge.toFixed(2)}`);
console.log(`Subtotal: ₹${estimate2.subtotal.toFixed(2)}`);
console.log(`Tax (GST): ₹${estimate2.taxAmount.toFixed(2)}`);
console.log(`Total: ₹${estimate2.total.toFixed(2)}`);

// Test Case 3: Non-jewellery (no VAT in Nepal)
console.log('\n\n=== Test 3: Nepal Non-Jewellery (no VAT) ===');
const nepalNonJewelryRequest: EstimateRequest = {
  buildMethod: 'METHOD_C',
  jewelleryType: 'Metal Decorative Piece',
  country: 'NP',
  currency: 'NPR',
  methodC: {
    baseMetal: 'COPPER',
    weightGrams: 100,
    platingType: 'GOLD',
    platingTier: 'STANDARD',
  },
  marketRates: {
    metals: {
      COPPER: 100,
    },
  },
};

const estimate3 = calculateEstimate(nepalNonJewelryRequest);
console.log(`Status: ${estimate3.status}`);
console.log(`Base Metal Cost: ₨${estimate3.baseMetalCost.toFixed(2)}`);
console.log(`Plating Cost: ₨${estimate3.platingCost.toFixed(2)}`);
console.log(`Making Charge: ₨${estimate3.makingCharge.toFixed(2)}`);
console.log(`Subtotal: ₨${estimate3.subtotal.toFixed(2)}`);
console.log(`Tax: ₨${estimate3.taxAmount.toFixed(2)}`);
console.log(`Total: ₨${estimate3.total.toFixed(2)}`);

console.log('\n✅ Integration test completed successfully!');
