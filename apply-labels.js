const fs = require('fs');

const file = 'apps/web/src/app/m/quotes/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const replacements = [
  {
    old: \<div className="grid grid-cols-[100px_1fr] gap-2">
            <div className="relative">
              <select
                value={phoneCountryCode}
                onChange={(event) => setPhoneCountryCode(event.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 py-2.5 pl-3 pr-7 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                aria-label="Phone country code"\,
    new: \<div className="grid grid-cols-[100px_1fr] gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Code</T></label>
              <div className="relative">
                <select
                  value={phoneCountryCode}
                  onChange={(event) => setPhoneCountryCode(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-200 py-2.5 pl-3 pr-7 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  aria-label="Phone country code"\
  },
  {
    old: \</select>
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"\,
    new: \</select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Phone First</T></label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"\
  },
  {
    old: \)}
            </div>
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"\,
    new: \)}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Customer Name</T></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"\
  },
  {
    old: \/>
          </div>
          <input
            type="email"\,
    new: \/>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Email</T> <span className="normal-case lowercase">(optional)</span></label>
            <input
              type="email"\
  },
  {
    old: \/>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <textarea
              value={customerAddress}\,
    new: \/>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Address</T> <span className="normal-case lowercase">(optional)</span></label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={customerAddress}\
  },
  {
    old: \/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={customerCity}\,
    new: \/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>City</T></label>
              <input
                value={customerCity}\
  },
  {
    old: \/>
            <input
              value={customerCountry}\,
    new: \/>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Country</T></label>
              <input
                value={customerCountry}\
  },
  {
    old: \/>
          </div>
        </section>\,
    new: \/>
            </div>
          </div>
        </section>\
  },
  {
    old: \          <div className="grid grid-cols-2 gap-2">
            <select
              value={jewelleryType}\,
    new: \          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Jewellery Type</T></label>
              <select
                value={jewelleryType}\
  },
  {
    old: \</select>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={quantity || ""}
              onChange={(event) => setQuantity(Math.max(1, Number.parseInt(event.target.value) || 1))}
              placeholder="Qty"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"\,
    new: \</select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Quantity</T></label>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={quantity || ""}
                onChange={(event) => setQuantity(Math.max(1, Number.parseInt(event.target.value) || 1))}
                placeholder="Qty"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"\
  },
  {
    old: \/>
          </div>
          <select
            value={buildMethod}\,
    new: \/>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Build Method</T></label>
            <select
              value={buildMethod}\
  },
  {
    old: \</select>
          <select
            value={materialCode}\,
    new: \</select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Material</T></label>
            <select
              value={materialCode}\
  },
  {
    old: \</select>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid grid-cols-[1fr_82px] gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={targetTotalWeightG || ""}
                onChange={(event) => {\,
    new: \</select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Target Weight</T></label>
              <div className="grid grid-cols-[1fr_82px] gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={targetTotalWeightG || ""}
                  onChange={(event) => {\
  },
  {
    old: \</select>
            </div>
            <input
              value={sizeOrLength}\,
    new: \</select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Size / Length</T></label>
              <input
                value={sizeOrLength}\
  },
  {
    old: \/>
          </div>
          {selectedMaterial.category === "GOLD" && (
            <input\,
    new: \/>
            </div>
          </div>
          {selectedMaterial.category === "GOLD" && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Gold weight</T> <span className="normal-case lowercase">(optional)</span></label>
              <input\
  },
  {
    old: \/>
          )}
          {materialRateInfo.ratePerGram\,
    new: \/>
            </div>
          )}
          {materialRateInfo.ratePerGram\
  },
  {
    old: \        <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400"><T>Pricing</T></p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={metalCostNpr || ""}
              onChange={(event) => {\,
    new: \        <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400"><T>Pricing</T></p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Material Cost</T></label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={metalCostNpr || ""}
                onChange={(event) => {\
  },
  {
    old: \/>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={makingChargeNpr || ""}
              onChange={(event) => setMakingChargeNpr(numberFromInput(event.target.value))}
              placeholder="Making charge"\,
    new: \/>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Making Charge</T></label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={makingChargeNpr || ""}
                onChange={(event) => setMakingChargeNpr(numberFromInput(event.target.value))}
                placeholder="Making charge"\
  },
  {
    old: \/>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={gemstoneCostNpr || ""}
              onChange={(event) => {\,
    new: \/>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Gemstone Cost</T></label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={gemstoneCostNpr || ""}
                onChange={(event) => {\
  },
  {
    old: \/>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={finishCostNpr || ""}
              onChange={(event) => setFinishCostNpr(numberFromInput(event.target.value))}
              placeholder="Finish cost"\,
    new: \/>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Finish Cost</T></label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={finishCostNpr || ""}
                onChange={(event) => setFinishCostNpr(numberFromInput(event.target.value))}
                placeholder="Finish cost"\
  },
  {
    old: \/>
          </div>
          {autoMetalCost > 0 && (\,
    new: \/>
            </div>
          </div>
          {autoMetalCost > 0 && (\
  },
  {
    old: \          {gemstoneRateOptions.length > 0 && (
            <div className="grid grid-cols-[1fr_72px] gap-2">
              <select
                value={selectedGemstoneRateKey}\,
    new: \          {gemstoneRateOptions.length > 0 && (
            <div className="grid grid-cols-[1fr_72px] gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Gemstone Selection</T></label>
                <select
                  value={selectedGemstoneRateKey}\
  },
  {
    old: \</select>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={gemstoneCount || ""}
                onChange={(event) => {\,
    new: \</select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Qty</T></label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={gemstoneCount || ""}
                  onChange={(event) => {\
  },
  {
    old: \/>
            </div>
          )}
          <input type="number" inputMode="numeric" min="1" value={estimatedDays || ""} onChange={(event) => setEstimatedDays(Math.max(1, Number.parseInt(event.target.value) || 1))} placeholder="Estimated days" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <textarea value={gemstoneNotes}\,
    new: \/>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Estimated days</T></label>
            <input type="number" inputMode="numeric" min="1" value={estimatedDays || ""} onChange={(event) => setEstimatedDays(Math.max(1, Number.parseInt(event.target.value) || 1))} placeholder="Estimated days" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Gemstone details</T> <span className="normal-case lowercase">(optional)</span></label>
            <textarea value={gemstoneNotes}\
  },
  {
    old: \/>
          <textarea value={finishNotes}\,
    new: \/>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Finish / plating details</T></label>
            <textarea value={finishNotes}\
  },
  {
    old: \/>
          <textarea value={specialInstructions}\,
    new: \/>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Customer instructions</T></label>
            <textarea value={specialInstructions}\
  },
  {
    old: \/>
          <textarea value={shopNotes}\,
    new: \/>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500"><T>Internal shop notes</T></label>
            <textarea value={shopNotes}\
  },
  {
    old: \/>
        </section>\,
    new: \/>
          </div>
        </section>\
  }
];

let i = 0;
for (const {old, new: nv} of replacements) {
    i++;
    if (!code.includes(old)) {
        console.error('Missed block ' + i);
    } else {
        code = code.replace(old, nv);
    }
}

fs.writeFileSync(file, code, 'utf8');
console.log('Replaced successful blocks. Check for Missed block logs.');
