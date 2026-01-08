# Tax Calculation Test Guide

## Testing Steps

1. **Clear browser cache**:
   - Press `Ctrl+Shift+Delete` or `Cmd+Shift+Delete`
   - Clear cached images and files
   - Close and reopen browser

2. **Check console logs**:
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for messages starting with `[Tax Engine]` and `[LivePricingPanel]`

3. **Expected behavior**:

### For India (IN) with 1g of 24K Gold:

**Console should show**:
```
[Tax Engine] calculateTax called with: { country: 'IN', ... }
[Tax Engine] Tax config: { country: 'IN', rules: [...] }
[Tax Engine] Final result: { lineItems: [2 items], totalTax: ~425, ... }
[Tax Engine] Adding 2 tax line items
[Tax Engine] Adding tax line item: { label: 'GST', category: 'TAX', amount: ~425 }
[Tax Engine] Adding tax line item: { label: 'GST on Making', category: 'TAX', amount: ~85 }
[LivePricingPanel] Line items: [4-5 items including TAX]
[LivePricingPanel] Tax amount: ~510
```

**UI should display**:
- 24K Gold (1g × ₹14,179/g) = ₹14,179
- Making charge (12%) = ₹1,701
- **GST (3% of ₹14,179)** = ₹425 ← MUST BE VISIBLE
- **GST on Making (5% of ₹1,701)** = ₹85 ← MUST BE VISIBLE
- Subtotal: ₹14,179
- Tax: ₹510 (shown in summary)
- Total: ₹16,390

### For Nepal (NP):

**Should show**:
- Luxury Tax (2%)
- VAT (13% if gemstones)

## If tax still not showing:

1. **Check console for errors**
2. **Verify lineItems count**: Should be 3+ (metal + making + tax)
3. **Check estimate.taxAmount**: Should be > 0
4. **Restart Next.js dev server** if changes not picked up

## Known Issues Fixed:

✅ LineItem type now includes 'TAX' category
✅ Tax line items use displayName instead of internal name
✅ Tax line items properly added to lineItems array
✅ Fallback tax also creates line items
✅ Console logging for debugging

## If console shows tax but UI doesn't:

Check these files:
- `apps/web/src/components/pricing/LivePricingPanel.tsx` - Rendering component
- `apps/web/src/lib/pricing/calculate-estimate.ts` - Calculation logic
- Browser dev tools → Elements → Search for "TAX" in HTML

The lineItems should include entries with `category: "TAX"` that get rendered in the UI.
