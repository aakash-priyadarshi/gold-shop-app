
>         <section data-tour="m-quote-customer" className="space-y-3 
rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide 
text-gray-400"><T>Customer</T></p>
              {matchedCustomerId && <span className="text-[11px] font-semibold 
text-emerald-600"><T>Matched</T></span>}
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <div className="relative">
                <select
                  value={phoneCountryCode}
                  onChange={(event) => setPhoneCountryCode(event.target.value)}
                  className="w-full appearance-none rounded-xl border 
border-gray-200 py-2.5 pl-3 pr-7 text-sm font-medium focus:outline-none 
focus:ring-2 focus:ring-amber-400 bg-white"
                  aria-label="Phone country code"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg 
xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' 
fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 
6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                  }}
                >
                  <option value="+91">ðŸ‡®ðŸ‡³ +91</option>
                  <option value="+977">ðŸ‡³ðŸ‡µ +977</option>
                  <option value="+1">ðŸ‡ºðŸ‡¸ +1</option>
                  <option value="+44">ðŸ‡¬ðŸ‡§ +44</option>
                  <option value="+971">ðŸ‡¦ðŸ‡ª +971</option>
                </select>
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 
-translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="Phone first"
                  className="w-full rounded-xl border border-gray-200 py-2.5 
pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {lookingUpCustomer && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 
-translate-y-1/2 animate-spin text-amber-500" />
                )}
              </div>
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 
-translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Customer name"
                className="w-full rounded-xl border border-gray-200 py-2.5 
pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="Email (optional)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 
text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" 
/>
              <textarea
                value={customerAddress}
                onChange={(event) => setCustomerAddress(event.target.value)}
                placeholder="Address (optional)"
                rows={2}
                className="w-full resize-none rounded-xl border 
border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 
focus:ring-amber-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={customerCity}
                onChange={(event) => setCustomerCity(event.target.value)}
                placeholder="City"
                className="rounded-xl border border-gray-200 px-3 py-2.5 
text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />


