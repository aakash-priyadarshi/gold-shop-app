# Orivraa seller app — Kane CLI local context

Product: Orivraa jewellery ERP (orivraa.com). Sellers are shopkeepers.

Auth: Cloudflare Turnstile on /auth/login. Do not try to solve CAPTCHA in
headless Chrome. If the login page is shown, stop and report "login blocked by
Turnstile" instead of guessing credentials.

Never create, pay, void, or checkout real documents on production.

Seller routes (desktop):

- /dashboard/shop/pos
- /dashboard/shop/invoices
- /dashboard/shop/invoices/create
- /dashboard/shop/quotes
- /dashboard/shop/quotes/create
- /dashboard/shop/stock
- /dashboard/shop/settings/hardware

Seller routes (phone / m.orivraa.com):

- /m/pos
- /m/invoices
- /m/invoices/create
- /m/quotes
- /m/settings/hardware

Invoice Print is one button: thermal 58/80mm vs A4 window.print. Hardware
settings live at Settings → Receipt printer.

If a page asks to confirm a destructive action, cancel and report it.
