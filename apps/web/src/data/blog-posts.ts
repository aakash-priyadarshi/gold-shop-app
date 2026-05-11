/* ────────────────────────────────────────────────────────────── */
/*  Blog Post Type                                                */
/* ────────────────────────────────────────────────────────────── */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  updated?: string;
  author: string;
  authorRole: string;
  readTime: string;
  category: string;
  tags: string[];
  featured?: boolean;
  content: string; // HTML content
}

/* ────────────────────────────────────────────────────────────── */
/*  Blog Posts                                                    */
/* ────────────────────────────────────────────────────────────── */

export const BLOG_POSTS: BlogPost[] = [
  /* ── Post 0 ────────────────────────────────────────────────── */
  {
    slug: "best-billing-software-for-jewellery-shops-india-2026",
    title:
      "Best Billing Software for Jewellery Shops in India (2026): Compare Vyapar, Tally, Marg ERP and Orivraa",
    description:
      "Compare the best billing software for Indian jewellery shops. See how Orivraa, Vyapar, TallyPrime, Busy and Marg ERP differ on GST billing, making charges, old gold exchange, offline POS, and total operating cost.",
    date: "2026-05-03",
    author: "Orivraa Team",
    authorRole: "Product & Market Research",
    readTime: "11 min read",
    category: "Billing Software",
    tags: [
      "billing software for jewellery shops",
      "jewellery billing software India",
      "GST billing jewellery",
      "Vyapar alternative",
      "Tally alternative",
      "Marg ERP alternative",
      "offline jewellery POS",
    ],
    featured: true,
    content: `
<p>For most jewellers, billing software is not just a counter tool anymore. It affects how fast you invoice, how accurately you handle GST, how easily you track old gold exchanges, and how much time you lose at month-end fixing mistakes.</p>

<p>If you are comparing the <strong>best billing software for jewellery shops in India</strong>, the shortlist usually includes Vyapar, TallyPrime, Busy, Marg ERP, and now newer jewellery-first platforms like Orivraa.</p>

<p>This guide explains which tool is best for which type of shop and where the real cost savings come from.</p>

<h2>Why jewellery billing is different from normal retail billing</h2>

<p>A jewellery invoice is rarely a simple quantity × rate calculation. A proper billing workflow often needs to handle:</p>

<ul>
<li><strong>Weight-based pricing</strong> for gold, silver, and sometimes platinum</li>
<li><strong>Purity tracking</strong> such as 24K, 22K, 18K, 14K, 925, and 999</li>
<li><strong>Making charges</strong> as flat amount, per-gram amount, or percentage</li>
<li><strong>Stone charges</strong> and custom add-ons</li>
<li><strong>Old gold exchange / buy-back</strong> adjustments</li>
<li><strong>GST split</strong> across jewellery value and making charges</li>
<li><strong>Customer history</strong> for repeat sales, alterations, and custom work</li>
</ul>

<p>That is why generic billing software often looks affordable at first, but becomes expensive once your staff starts using manual workarounds.</p>

<h2>Quick comparison: which billing software fits which shop?</h2>

<table>
<thead>
<tr><th>Requirement</th><th>Orivraa</th><th>Vyapar</th><th>TallyPrime</th><th>Busy</th><th>Marg ERP</th></tr>
</thead>
<tbody>
<tr><td>Jewellery-specific billing</td><td>✓</td><td>Partial</td><td>Manual setup</td><td>Manual setup</td><td>✓ Jewellery module</td></tr>
<tr><td>Making charges and wastage</td><td>✓</td><td>Partial</td><td>Manual</td><td>Manual</td><td>✓</td></tr>
<tr><td>Old gold exchange workflows</td><td>✓</td><td>Basic</td><td>Partial</td><td>Partial</td><td>✓</td></tr>
<tr><td>GST-ready invoicing</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
<tr><td>Offline counter usage</td><td>✓ Desktop app</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
<tr><td>Customer follow-up and repeat sales</td><td>✓</td><td>Basic</td><td>✗</td><td>✗</td><td>Basic</td></tr>
<tr><td>Digital catalogues / WhatsApp selling</td><td>✓</td><td>✗</td><td>✗</td><td>✗</td><td>✗</td></tr>
<tr><td>Tax-ready reports for traders</td><td>✓</td><td>Basic</td><td>Strong accounting</td><td>Strong GST</td><td>Strong GST</td></tr>
<tr><td>Pricing model</td><td>Free + Pro from ₹299/month in India</td><td>Free mobile + paid annual plans</td><td>Licence-based</td><td>Annual / licence-based</td><td>Licence + AMC</td></tr>
</tbody>
</table>

<h2>Where Orivraa saves money for jewellery traders</h2>

<h3>1. Lower software entry cost</h3>

<p>Orivraa has a free starting point, and <strong>India Pro starts at ₹299/month</strong>. That matters if you are moving away from paper billing or replacing a mix of WhatsApp, Excel, and manual GST calculations.</p>

<h3>2. Fewer manual GST mistakes</h3>

<p>Generic billing apps can handle invoices, but jewellery traders still end up fixing the same issues repeatedly: making-charge treatment, old gold exchange entries, and missing product detail. Those mistakes cost time and often push month-end work back to the CA.</p>

<h3>3. Better staff speed at the counter</h3>

<p>Fast billing is not just convenience. Shorter queues reduce lost sales. Staff who can bill, pull up customer history, and share catalogues from one system need less switching between apps.</p>

<h3>4. Repeat sales from billing data</h3>

<p>Most billing software stops after the invoice. Orivraa uses the same customer and product data for follow-up, RFQs, catalogue sharing, and repeat selling. That means the software can help generate revenue instead of only recording it.</p>

<h3>5. Desktop plus cloud workflow</h3>

<p>If your shop wants <strong>offline counter billing with cloud sync</strong>, Orivraa gives you both. The <a href="/download">desktop app</a> is useful when internet quality is inconsistent but you still want modern reports and remote visibility.</p>

<h2>When Vyapar, TallyPrime, Busy, or Marg ERP are still the better fit</h2>

<ul>
<li><strong>Choose Vyapar</strong> if your shop is extremely small and you mainly want simple GST billing with minimal setup.</li>
<li><strong>Choose TallyPrime</strong> if accounting depth is your top priority and your accountant already runs everything in Tally.</li>
<li><strong>Choose Busy</strong> if you want a GST-heavy business package and can handle manual jewellery workflows.</li>
<li><strong>Choose Marg ERP</strong> if you need legacy ERP depth, jewellery modules, and your team is comfortable with a more traditional desktop workflow.</li>
</ul>

<p>For many jewellers, the practical decision is simpler: use a tool that helps both at the counter and after the sale. That is where Orivraa usually wins for growing shops.</p>

<h2>What we recommend</h2>

<p>If you are comparing software this month, start with the questions below:</p>

<ol>
<li>Do you need <strong>only billing</strong>, or billing plus customer retention?</li>
<li>Do you need <strong>old gold exchange</strong>, making charges, and jewellery-specific invoicing?</li>
<li>Do you want <strong>offline desktop billing</strong> with cloud sync?</li>
<li>Do you want the software to help with <strong>catalogues, repeat sales, and trader reports</strong> too?</li>
</ol>

<p>If the answer to the last two is yes, <a href="/compare/billing-software-india-jewellery-shops">compare the full billing stack here</a>, then <a href="/auth/register">start free on Orivraa</a>.</p>
`,
  },

  /* ── Post 0B ───────────────────────────────────────────────── */
  {
    slug: "how-tax-reports-save-jewellery-traders-money",
    title:
      "How Tax Reports Save Jewellery Traders Money in 2026: Cut GST Errors, CA Time and Audit Stress",
    description:
      "Learn how tax reports and jewellery billing software help traders save money on GST filing, old-gold accounting, making-charge splits, stock mismatches, and month-end audit preparation.",
    date: "2026-05-03",
    author: "Orivraa Team",
    authorRole: "Operations & Compliance",
    readTime: "9 min read",
    category: "Tax & Compliance",
    tags: [
      "tax reports for jewellers",
      "jewellery GST reports",
      "billing software tax reports",
      "audit prep jewellery shops",
      "old gold exchange GST",
      "jewellery compliance",
    ],
    content: `
<p>Many jewellery traders think software is expensive until they calculate the hidden cost of manual reporting. The real leak is not only in software spend &mdash; it is in repeated GST mistakes, rushed month-end reconciliations, and time spent preparing files for the accountant.</p>

<p><strong>Tax reports save money</strong> because they reduce correction work, improve billing accuracy, and make it easier to spot issues before they become compliance or cash-flow problems.</p>

<p><em>This article is practical guidance, not legal or tax advice. Always confirm filing requirements with your CA or tax advisor.</em></p>

<h2>Where jewellery traders usually lose money</h2>

<ul>
<li><strong>Wrong GST split</strong> between metal value and making charges</li>
<li><strong>Missed old gold entries</strong> that later create confusion during reconciliation</li>
<li><strong>Stock mismatches</strong> between sales records and physical inventory</li>
<li><strong>Manual month-end cleanup</strong> by the owner or accountant</li>
<li><strong>Slow billing</strong> that leads to incomplete or inconsistent invoice data</li>
<li><strong>No clear tax-ready summary</strong> when filing deadlines arrive</li>
</ul>

<p>Each of these issues looks small on its own. Together, they waste time every single month.</p>

<h2>The reports every jewellery trader should review monthly</h2>

<h3>1. Sales summary by tax treatment</h3>

<p>You should be able to quickly review total sales, GST applied, invoice count, and high-value invoices. This makes it easier to spot unusual billing entries before filing.</p>

<h3>2. Making charges report</h3>

<p>For jewellers, this matters more than in most retail businesses. If making charges are not tracked cleanly, you end up with messy invoices and avoidable CA correction time.</p>

<h3>3. Old gold exchange register</h3>

<p>This is one of the most common areas of confusion. A proper report should show the incoming old gold value, the linked sale, and how the transaction affected the final bill.</p>

<h3>4. Purchase and stock valuation summary</h3>

<p>Tax reporting and stock control are tied together in jewellery. If your stock view is weak, month-end explanations become harder and audit prep becomes slower.</p>

<h3>5. Outstanding receivables and cash summary</h3>

<p>Traders often focus only on invoices and forget that the real business question is: what was sold, what was collected, and what is still pending?</p>

<h2>How billing software and tax reports save money together</h2>

<h3>Fewer accountant hours spent fixing raw data</h3>

<p>If invoices are already structured correctly, your CA spends less time cleaning exports and more time reviewing what actually matters. That directly reduces cost or at least reduces the owner&apos;s follow-up burden.</p>

<h3>Faster month-end close</h3>

<p>Owners who still rely on paper or spreadsheets usually spend the last few days of the month searching for missing entries. Tax-ready reports reduce that scramble.</p>

<h3>Better audit preparedness</h3>

<p>When billing, stock movement, and tax summaries live in one system, audit preparation becomes a reporting task instead of a reconstruction exercise.</p>

<h3>Fewer avoidable penalties caused by confusion</h3>

<p>Software cannot remove every compliance risk, but it does reduce the chance of errors caused by manual invoice formatting, forgotten exchange entries, or incomplete records.</p>

<h3>Stronger pricing decisions</h3>

<p>Good reports are not just for tax. They also show which products move faster, how much revenue comes from making charges, and where your real margins are under pressure.</p>

<h2>A practical monthly routine for jewellers</h2>

<ol>
<li>Review billing totals weekly instead of waiting until month-end.</li>
<li>Check making-charge summaries and exchange transactions.</li>
<li>Match tax summaries against your cash and bank collections.</li>
<li>Reconcile stock value and top-selling categories.</li>
<li>Share clean reports with your accountant before the deadline week.</li>
</ol>

<p>This routine is much easier when the same system handles billing and reporting together.</p>

<h2>Why this matters for Orivraa users</h2>

<p>Orivraa now gives jewellers a better way to combine <strong>billing software and tax-ready reporting</strong> without forcing them into multiple disconnected tools. That means traders can bill faster, review cleaner reports, and spend less time chasing data when GST work or audit prep starts.</p>

<p>If you want the GST side explained in more detail, read our <a href="/blog/jewellery-gst-billing-guide-india">complete GST billing guide for jewellery shops in India</a>.</p>

<p>If you want the software shortlist, read our <a href="/blog/best-billing-software-for-jewellery-shops-india-2026">billing software comparison</a> or <a href="/auth/register">start free on Orivraa</a>.</p>
`,
  },

  /* ── Post 1 ────────────────────────────────────────────────── */
  {
    slug: "best-jewellery-shop-software-2025",
    title:
      "Best Jewellery Shop Software in 2025: Complete Comparison & Buyer's Guide",
    description:
      "Compare the top jewellery shop software solutions for 2025. Detailed analysis of Orivraa, Zoho, Marg ERP, Vyapar, Jwelly ERP & more — features, pricing, pros & cons for gold, silver & diamond businesses.",
    date: "2025-12-15",
    updated: "2026-03-01",
    author: "Orivraa Team",
    authorRole: "Product & Market Research",
    readTime: "12 min read",
    category: "Software Guide",
    tags: [
      "jewellery shop software",
      "gold shop software",
      "jewellery ERP",
      "software comparison",
      "Marg ERP",
      "Zoho",
      "Vyapar",
    ],
    featured: true,
    content: `
<p>Running a jewellery shop in 2025 without dedicated software is like weighing gold without a scale — technically possible, but you're leaving money and accuracy on the table. The right <strong>jewellery shop software</strong> can transform how you manage inventory, serve customers, and grow your business.</p>

<p>In this guide, we compare the <strong>best jewellery shop software solutions</strong> available today, including pricing, key features, and which type of business each is best suited for.</p>

<h2>What to Look for in Jewellery Shop Software</h2>

<p>Before diving into specific products, here are the <strong>essential features</strong> every jewellery business software should have:</p>

<ul>
<li><strong>Inventory management by weight & purity</strong> — Track gold (24K, 22K, 18K), silver, diamond, and platinum by weight in grams/tola and purity levels</li>
<li><strong>Billing & invoicing</strong> — GST/VAT-compliant invoicing with making charges, stone charges, and old gold exchange support</li>
<li><strong>Barcode/HUID support</strong> — Scan barcodes or HUID (Hallmark Unique Identification) numbers for fast billing</li>
<li><strong>Customer management</strong> — Track customer history, preferences, and communication</li>
<li><strong>Reporting & analytics</strong> — Sales trends, inventory valuation, profit margins, and tax reports</li>
<li><strong>Multi-branch support</strong> — If you have more than one location, centralised management is critical</li>
<li><strong>Cloud access</strong> — Access your data from anywhere, not just the shop computer</li>
</ul>

<h2>Top 7 Jewellery Shop Software Solutions Compared</h2>

<h3>1. Orivraa — Best Free Cloud-Based Jewellery Platform</h3>

<p><strong>Pricing:</strong> Free plan available (₹0/month) · India Pro from ₹299/month · Nepal Pro from NPR 399/month · Enterprise custom pricing</p>

<p>Orivraa is a <strong>cloud-based jewellery shop management platform</strong> that combines inventory management, a built-in marketplace, digital catalogues, customer messaging, and AI-powered tools — all starting free.</p>

<p><strong>Key strengths:</strong></p>
<ul>
<li>Free tier with 15 products, marketplace listing, and customer chat</li>
<li>Built-in international marketplace reaching buyers in Nepal, India, Dubai, UK, USA & Europe</li>
<li>Digital catalogue creation shareable on WhatsApp and social media</li>
<li>AI-powered product descriptions and smart tagging</li>
<li>Multi-currency pricing (NPR, INR, AED, GBP, USD, EUR) with automatic tax calculation</li>
<li>Desktop app available for offline access</li>
</ul>

<p><strong>Best for:</strong> Jewellery shops wanting an affordable, modern platform with international selling capabilities. Ideal for small-to-medium retailers, custom designers, and shops looking to sell online without building a separate website.</p>

<h3>2. Marg ERP 9+ Jewellery — Best Traditional Desktop ERP</h3>

<p><strong>Pricing:</strong> ₹15,000–₹50,000 (one-time or annual license)</p>

<p>Marg ERP has been a staple in Indian jewellery shops for decades. It's a comprehensive desktop ERP with deep support for <strong>barcode/RFID billing, weight management, karigar (artisan) tracking</strong>, and GST compliance.</p>

<p><strong>Key strengths:</strong></p>
<ul>
<li>Comprehensive karigar management (material issued, received, wastage)</li>
<li>RFID/barcode scanning for fast billing</li>
<li>Old gold exchange and buy-back support</li>
<li>Detailed GST reports and compliance</li>
</ul>

<p><strong>Limitations:</strong> Primarily desktop-based. No built-in marketplace. No digital catalogues. Requires professional installation. Mobile app has limited functionality.</p>

<p><strong>Best for:</strong> Large, established Indian jewellery shops with in-house IT support who need deep ERP functionality and karigar management.</p>

<h3>3. Zoho — Best General-Purpose CRM (Not Jewellery-Specific)</h3>

<p><strong>Pricing:</strong> ₹749/month (Standard) · ₹1,299/month (Professional)</p>

<p>Zoho is a powerful general-purpose CRM and business suite. While it's not built for jewellery, some shops use it for customer management, invoicing, and basic inventory.</p>

<p><strong>Key strengths:</strong></p>
<ul>
<li>Excellent CRM and customer management</li>
<li>Strong invoicing and accounting modules</li>
<li>Wide ecosystem of integrated apps</li>
<li>Good mobile apps</li>
</ul>

<p><strong>Limitations:</strong> <strong>Not built for jewellery</strong> — no weight/purity tracking, no making charge support, no karigar management, no barcode/HUID features. Requires extensive customisation to work for a jewellery business. No marketplace. Expensive for the jewellery-specific value it provides.</p>

<p><strong>Best for:</strong> Shops that primarily need CRM and accounting, and are willing to customise. Not recommended as a primary jewellery management solution.</p>

<h3>4. Vyapar — Best Budget Billing App</h3>

<p><strong>Pricing:</strong> ₹4,999/year (Silver) · ₹8,499/year (Gold)</p>

<p>Vyapar is a popular, affordable billing and inventory app used across many small businesses in India, including some jewellery shops.</p>

<p><strong>Key strengths:</strong></p>
<ul>
<li>Very user-friendly interface</li>
<li>Affordable pricing</li>
<li>GST invoicing and returns filing</li>
<li>Basic inventory management</li>
</ul>

<p><strong>Limitations:</strong> Basic inventory — no weight/purity tracking designed for jewellery. No making charge line items. No marketplace. Limited to INR. No jewellery-specific features.</p>

<p><strong>Best for:</strong> Very small shops needing basic billing and GST compliance on a tight budget, who don't need advanced jewellery-specific features.</p>

<h3>5. Jwelly ERP — Best Full-Suite Jewellery ERP</h3>

<p><strong>Pricing:</strong> ₹25,000–₹80,000+ (perpetual license)</p>

<p>MMI Jwelly ERP is one of the most comprehensive jewellery-specific ERPs available. It handles everything from billing to gold schemes to karigar management.</p>

<p><strong>Key strengths:</strong></p>
<ul>
<li>Complete jewellery ERP with manufacturing, wholesale, and retail modules</li>
<li>Gold scheme management (monthly savings schemes)</li>
<li>Karigar management with detailed wastage tracking</li>
<li>HUID/hallmark integration</li>
<li>Mobile app for on-the-go tracking</li>
</ul>

<p><strong>Limitations:</strong> High upfront cost. Steep learning curve. Requires professional setup and training. Primarily desktop-based. No international marketplace.</p>

<p><strong>Best for:</strong> Large jewellery businesses, manufacturers, and wholesalers who need end-to-end ERP with manufacturing and scheme management.</p>

<h3>6. TallyPrime — Best for Accounting-First Shops</h3>

<p><strong>Pricing:</strong> ₹18,000/year (Silver) · ₹54,000/year (Gold)</p>

<p>TallyPrime is India's most trusted accounting software with specialised modules for jewellery inventory management by weight and purity.</p>

<p><strong>Key strengths:</strong></p>
<ul>
<li>Rock-solid accounting and GST compliance</li>
<li>Inventory tracking by weight and purity</li>
<li>Old gold exchange handling</li>
<li>Trusted by CAs and auditors</li>
</ul>

<p><strong>Limitations:</strong> Primarily an accounting tool, not a complete jewellery management solution. No catalogue, marketplace, or customer chat. Desktop-only.</p>

<p><strong>Best for:</strong> Shops that prioritise accounting accuracy and already use Tally for their business.</p>

<h3>7. Online Munim — Best for Multi-Branch Chains</h3>

<p><strong>Pricing:</strong> ₹20,000–₹60,000/year</p>

<p>Online Munim is a cloud-based jewellery ERP with strong multi-branch and e-commerce integration capabilities.</p>

<p><strong>Key strengths:</strong></p>
<ul>
<li>Cloud-based with real-time multi-branch sync</li>
<li>RFID and barcode integration</li>
<li>E-commerce integration for online selling</li>
<li>Customer scheme management</li>
</ul>

<p><strong>Best for:</strong> Multi-branch jewellery chains needing centralised cloud management.</p>

<h2>Quick Comparison Table</h2>

<table>
<thead>
<tr><th>Software</th><th>Starting Price</th><th>Jewellery-Specific</th><th>Cloud</th><th>Marketplace</th><th>Best For</th></tr>
</thead>
<tbody>
<tr><td><strong>Orivraa</strong></td><td>Free (₹0)</td><td>✓</td><td>✓</td><td>✓ Built-in</td><td>SMBs, online sellers</td></tr>
<tr><td>Marg ERP</td><td>₹15,000/yr</td><td>✓</td><td>Partial</td><td>✗</td><td>Large Indian shops</td></tr>
<tr><td>Zoho</td><td>₹749/mo</td><td>✗</td><td>✓</td><td>✗</td><td>CRM-focused shops</td></tr>
<tr><td>Vyapar</td><td>₹4,999/yr</td><td>✗</td><td>✓</td><td>✗</td><td>Basic billing</td></tr>
<tr><td>Jwelly ERP</td><td>₹25,000+</td><td>✓</td><td>Partial</td><td>✗</td><td>Large manufacturers</td></tr>
<tr><td>TallyPrime</td><td>₹18,000/yr</td><td>Partial</td><td>✗</td><td>✗</td><td>Accounting-first</td></tr>
<tr><td>Online Munim</td><td>₹20,000/yr</td><td>✓</td><td>✓</td><td>Partial</td><td>Multi-branch chains</td></tr>
</tbody>
</table>

<h2>Our Recommendation</h2>

<p>For most small-to-medium jewellery shops in 2025, <strong>Orivraa</strong> offers the best value — it's the only platform that starts free, includes a built-in international marketplace, and requires zero technical setup. If you need heavy-duty ERP with manufacturing and karigar management, consider Jwelly ERP or Marg ERP as complementary tools.</p>

<p>The best approach? <a href="/auth/register">Start with Orivraa's free plan</a> to get your shop online and selling internationally, then evaluate whether you need additional ERP features as your business grows.</p>
`,
  },

  /* ── Post 2 ────────────────────────────────────────────────── */
  {
    slug: "jewellery-inventory-management-guide",
    title:
      "Complete Guide to Jewellery Inventory Management: Track Gold, Silver & Diamond Stock Efficiently",
    description:
      "Learn how to manage jewellery inventory by weight, purity, and making charges. Best practices for gold, silver & diamond stock tracking, barcode systems, and inventory software for jewellery shops.",
    date: "2026-01-10",
    updated: "2026-03-01",
    author: "Orivraa Team",
    authorRole: "Product & Operations",
    readTime: "10 min read",
    category: "Business Guide",
    tags: [
      "jewellery inventory",
      "gold inventory management",
      "inventory software",
      "stock management",
      "jewellery business",
    ],
    content: `
<p>Jewellery inventory management is fundamentally different from regular retail. You're not just tracking quantities — you're tracking <strong>weight in grams, purity in karats, making charges, stone weights, and fluctuating market values</strong>. A single gold necklace might have 18K gold, three diamonds, and custom making charges — all of which need precise tracking.</p>

<p>This guide covers everything you need to know about managing jewellery inventory effectively, whether you're a small retail shop or a multi-branch operation.</p>

<h2>Why Jewellery Inventory Is Different</h2>

<p>Unlike a clothing store where you count "5 blue shirts, size M", a jewellery shop needs to track:</p>

<ul>
<li><strong>Gross weight</strong> — Total weight of the piece including stones and attachments</li>
<li><strong>Net weight</strong> — Weight of the precious metal only</li>
<li><strong>Purity/Karat</strong> — 24K, 22K, 18K, 14K for gold; 925, 950 for silver</li>
<li><strong>Stone weight & count</strong> — Number, weight, and type of stones (diamond, ruby, emerald, etc.)</li>
<li><strong>Making charges</strong> — Labour cost per gram or as a percentage</li>
<li><strong>HUID/Hallmark number</strong> — Mandatory in India for gold jewellery</li>
<li><strong>Market value</strong> — Changes daily based on gold/silver rates</li>
</ul>

<h2>Best Practices for Jewellery Inventory Management</h2>

<h3>1. Categorise by Metal Type and Purity</h3>

<p>Organise your inventory into clear categories:</p>
<ul>
<li>Gold — subdivided by 24K, 22K, 18K, 14K</li>
<li>Silver — Sterling (925), Fine (999)</li>
<li>Diamond — by cut, clarity, colour, carat (the 4 Cs)</li>
<li>Platinum</li>
<li>Fashion/Costume jewellery</li>
</ul>

<p>Within each category, further organise by product type: rings, necklaces, earrings, bangles, pendants, chains, etc.</p>

<h3>2. Track Both Weight and Count</h3>

<p>For precious metals, <strong>weight is more important than count</strong>. You need to know:</p>
<ul>
<li>Total gold weight in your inventory (by purity)</li>
<li>Total stone weight</li>
<li>Total inventory value at today's market rate</li>
</ul>

<p>This is critical for insurance, auditing, and understanding your true stock value.</p>

<h3>3. Implement a Barcode/Tag System</h3>

<p>Every piece should have a unique identifier. Options include:</p>
<ul>
<li><strong>Barcode tags</strong> — Affordable, works with most billing software</li>
<li><strong>QR codes</strong> — Can store more information, scannable by phones</li>
<li><strong>RFID tags</strong> — Best for high-volume shops, enables bulk scanning</li>
<li><strong>HUID number</strong> — Mandatory in India, can serve as your primary identifier</li>
</ul>

<h3>4. Daily Stock Reconciliation</h3>

<p>Jewellery is high-value. Even a small discrepancy matters. Best practices:</p>
<ul>
<li>Weigh all returned-to-tray items at end of day</li>
<li>Compare physical stock against software records weekly</li>
<li>Do a full physical inventory count monthly</li>
<li>Investigate any discrepancy immediately — even 0.1g matters in gold</li>
</ul>

<h3>5. Track Karigar (Artisan) Inventory Separately</h3>

<p>If you work with karigars/artisans:</p>
<ul>
<li>Record weight of metal issued to karigar</li>
<li>Record weight of finished product received</li>
<li>Calculate and track wastage (typically 2-5% for gold)</li>
<li>Maintain a running ledger per karigar</li>
</ul>

<h3>6. Use Software — Not Spreadsheets</h3>

<p>Excel spreadsheets break down quickly with jewellery inventory. You need software that:</p>
<ul>
<li>Calculates inventory value in real-time based on market rates</li>
<li>Tracks weight & purity natively (not as custom fields)</li>
<li>Generates GST/VAT-compliant invoices with making charges</li>
<li>Provides stock alerts when items run low</li>
<li>Creates reports for auditing and tax filing</li>
</ul>

<p><a href="/jewellery-shop-software">Orivraa's inventory management</a> is designed specifically for jewellery — track stock by weight, purity, making charges, and stone details. It's free to start with up to 15 products.</p>

<h2>Common Inventory Management Mistakes</h2>

<ul>
<li><strong>Not tracking making charges separately</strong> — This affects your GST calculation (3% on gold value + 5% on making charges in India)</li>
<li><strong>Ignoring old gold exchanges</strong> — When customers trade in old gold, you need to track the incoming weight and purity accurately</li>
<li><strong>Not updating stock after repairs</strong> — If a piece comes back for resizing or stone setting, the weight may change</li>
<li><strong>Using generic inventory software</strong> — Tools like Zoho or generic POS systems don't handle weight/purity natively, leading to workarounds that cause errors</li>
</ul>

<h2>Digital Catalogues: The Modern Inventory Display</h2>

<p>In 2025, your inventory should also serve as a <strong>digital sales tool</strong>. Modern jewellery software like Orivraa lets you create digital catalogues from your inventory that you can share on:</p>
<ul>
<li>WhatsApp — Send curated collections to customers and B2B buyers</li>
<li>Instagram & Facebook — Link to your product catalogue</li>
<li>Your website — Embed a live catalogue that updates automatically</li>
</ul>

<p>This turns your inventory management system into a sales engine — products you add to stock are immediately available for customers to browse and enquire about.</p>

<h2>Getting Started</h2>

<p>If you're currently managing inventory on paper or spreadsheets, the shift to software will save you hours every week and reduce errors significantly. <a href="/auth/register">Start with Orivraa's free plan</a> — it takes under 5 minutes to set up and you can upload your first products immediately.</p>
`,
  },

  /* ── Post 3 ────────────────────────────────────────────────── */
  {
    slug: "zoho-vs-orivraa-jewellery-business",
    title:
      "Zoho vs Orivraa for Jewellery Shops: Which Software Is Better in 2025?",
    description:
      "Detailed comparison of Zoho CRM and Orivraa for jewellery businesses. Compare pricing, features, jewellery-specific capabilities, and find out which is better for your gold, silver, or diamond shop.",
    date: "2026-01-25",
    updated: "2026-03-01",
    author: "Orivraa Team",
    authorRole: "Product & Market Research",
    readTime: "8 min read",
    category: "Software Comparison",
    tags: [
      "Zoho alternative",
      "Zoho vs Orivraa",
      "jewellery software comparison",
      "CRM for jewellery",
      "jewellery shop software",
    ],
    content: `
<p>If you've searched for "software for jewellery shops", you've likely come across Zoho. With its extensive business suite and strong brand recognition, Zoho appears to be a solid choice. But is it actually the right fit for a <strong>jewellery business</strong>?</p>

<p>In this detailed comparison, we'll look at <strong>Zoho vs Orivraa</strong> specifically for jewellery shops — covering pricing, features, jewellery-specific capabilities, and which type of business each serves best.</p>

<h2>The Fundamental Difference</h2>

<p><strong>Zoho</strong> is a general-purpose business suite — a CRM, invoicing tool, and project manager that can be adapted to many industries. <strong>Orivraa</strong> is purpose-built for the jewellery industry — every feature is designed around how jewellery businesses actually work.</p>

<p>This distinction matters more than you might think.</p>

<h2>Pricing Comparison</h2>

<table>
<thead>
<tr><th>Plan</th><th>Zoho</th><th>Orivraa</th></tr>
</thead>
<tbody>
<tr><td>Free Plan</td><td>Limited (3 users, basic CRM)</td><td>✓ Full features, 15 products, marketplace</td></tr>
<tr><td>Starter/Pro</td><td>₹749/month (Standard CRM)</td><td>₹299/month in India (unlimited products, AI-ready workflows, local pricing by country)</td></tr>
<tr><td>Professional</td><td>₹1,299/month</td><td>Custom Enterprise pricing</td></tr>
<tr><td>Hidden Costs</td><td>Add-ons for inventory, chat, etc.</td><td>No hidden costs — all-inclusive</td></tr>
</tbody>
</table>

<p>While Zoho's starting price (₹749/mo) appears lower than Orivraa Pro in some comparisons, Orivraa's India Pro pricing starts at ₹299/month and already includes jewellery-specific workflows. Zoho's base plan also doesn't include inventory management, which requires Zoho Inventory (additional ₹1,999/mo). For a jewellery shop needing CRM + inventory + invoicing, Zoho can cost ₹3,000–₹5,000/month when you add all the required modules.</p>

<h2>Jewellery-Specific Features</h2>

<table>
<thead>
<tr><th>Feature</th><th>Zoho</th><th>Orivraa</th></tr>
</thead>
<tbody>
<tr><td>Weight & Purity Tracking</td><td>✗ Manual custom fields</td><td>✓ Native support (24K/22K/18K)</td></tr>
<tr><td>Making Charges on Invoice</td><td>✗ Workaround needed</td><td>✓ Built-in line item</td></tr>
<tr><td>Old Gold Exchange</td><td>✗ Not supported</td><td>✓ Supported</td></tr>
<tr><td>HUID/Hallmark Tracking</td><td>✗ Not supported</td><td>✓ Supported</td></tr>
<tr><td>Stone Weight Tracking</td><td>✗ Not supported</td><td>✓ Native field</td></tr>
<tr><td>Jewellery Marketplace</td><td>✗ None</td><td>✓ Built-in (6+ countries)</td></tr>
<tr><td>Digital Catalogues</td><td>✗ None</td><td>✓ Auto-generated, shareable</td></tr>
<tr><td>AI Product Descriptions</td><td>✗ None</td><td>✓ Jewellery-optimised AI</td></tr>
<tr><td>GST for Jewellery (3% + 5%)</td><td>Partial (generic GST)</td><td>✓ Pre-configured for jewellery</td></tr>
</tbody>
</table>

<h2>Where Zoho Wins</h2>

<p>To be fair, Zoho does have strengths that Orivraa doesn't match:</p>
<ul>
<li><strong>Mature CRM</strong> — Zoho CRM is one of the best in the market for pipe management, lead scoring, and automation workflows</li>
<li><strong>Ecosystem breadth</strong> — 50+ apps (HR, projects, desk, analytics) all integrated</li>
<li><strong>Custom automation</strong> — Zoho's workflow builder is very powerful for complex business rules</li>
<li><strong>API & integrations</strong> — Connects with hundreds of third-party tools</li>
</ul>

<h2>Where Orivraa Wins</h2>

<ul>
<li><strong>Free to start</strong> — Full-featured free plan vs Zoho's limited free tier</li>
<li><strong>Built-in marketplace</strong> — Your products are visible to thousands of buyers in 6+ countries from day one</li>
<li><strong>Zero setup</strong> — Sign up and start listing products in 5 minutes. Zoho requires hours of configuration</li>
<li><strong>Jewellery-native inventory</strong> — Weight, purity, making charges, stones are first-class fields, not custom adaptations</li>
<li><strong>Digital catalogues</strong> — Create and share product catalogues on WhatsApp in one click</li>
<li><strong>International by default</strong> — Multi-currency, multi-country tax compliance built in</li>
</ul>

<h2>The Verdict</h2>

<p><strong>Choose Zoho if:</strong> You're a large business that needs a comprehensive CRM with automation, you have IT staff to configure it, and you're willing to invest ₹3,000–₹5,000/month for the full suite. Jewellery-specific features will need manual setup.</p>

<p><strong>Choose Orivraa if:</strong> You want software that's built for jewellery from day one, you want to start free, sell internationally, and get online quickly without technical setup. Orivraa is the better choice for 90% of jewellery shops.</p>

<p>Many shops use both — Orivraa for marketplace selling and inventory, with Zoho or Tally for accounting. They complement each other well.</p>

<p><a href="/auth/register">Try Orivraa free</a> — no credit card required, set up in under 5 minutes.</p>
`,
  },

  /* ── Post 4 ────────────────────────────────────────────────── */
  {
    slug: "how-to-sell-jewellery-online-2025",
    title:
      "How to Start Selling Jewellery Online in 2025: Step-by-Step Guide for Gold & Diamond Shops",
    description:
      "Complete guide to selling jewellery online in 2025. Learn how to set up your online jewellery shop, list products, reach international buyers, and grow your gold & diamond business across Nepal, India, Dubai, USA & UK.",
    date: "2026-02-05",
    updated: "2026-03-01",
    author: "Orivraa Team",
    authorRole: "Growth & Strategy",
    readTime: "11 min read",
    category: "Business Guide",
    tags: [
      "sell jewellery online",
      "online jewellery business",
      "jewellery e-commerce",
      "gold business online",
      "jewellery marketplace",
    ],
    content: `
<p>The jewellery industry is undergoing a massive shift. In 2025, <strong>over 40% of jewellery buyers start their search online</strong>, even if they end up buying in-store. If your jewellery shop doesn't have an online presence, you're invisible to nearly half your potential customers.</p>

<p>The good news? Starting to sell jewellery online has never been easier or more affordable. This guide walks you through everything — from setting up your online shop to making your first international sale.</p>

<h2>Why Sell Jewellery Online?</h2>

<ul>
<li><strong>Reach beyond your city</strong> — Your physical shop serves a 10-20km radius. Online, you serve the world</li>
<li><strong>24/7 showcase</strong> — Customers browse your products at midnight, on holidays, whenever they want</li>
<li><strong>International buyers</strong> — NRIs in the USA and UK actively seek authentic South Asian jewellery online</li>
<li><strong>B2B opportunities</strong> — Other jewellers and retailers discover your products through online marketplaces</li>
<li><strong>Lower cost per acquisition</strong> — Digital marketing costs a fraction of print ads and shop rent</li>
</ul>

<h2>Step 1: Choose Your Selling Platform</h2>

<p>You have three main options:</p>

<h3>Option A: Jewellery Marketplace (Recommended)</h3>
<p>Platforms like <strong>Orivraa</strong> give you a ready-made shop with built-in buyers. You don't need to build a website, handle hosting, or figure out payment processing. List your products, and they're immediately visible to thousands of buyers. <strong>Best for: Getting started quickly with minimal investment.</strong></p>

<h3>Option B: Your Own Website</h3>
<p>Build a custom website using Shopify, WooCommerce, or custom development. You control everything but need to drive your own traffic. Costs ₹5,000–₹50,000+ for setup plus monthly hosting. <strong>Best for: Established brands with marketing budgets.</strong></p>

<h3>Option C: Social Media Selling</h3>
<p>Use Instagram, Facebook, and WhatsApp to showcase and sell. Free to start but limited in inventory management and payment processing. <strong>Best for: Testing the waters before committing to a platform.</strong></p>

<p>Our recommendation: <strong>Start with a marketplace like Orivraa</strong> (it's free) to validate demand and learn the process, then expand to your own website as you grow.</p>

<h2>Step 2: Set Up Your Online Shop</h2>

<p>On Orivraa, this takes under 5 minutes:</p>

<ol>
<li><strong>Sign up</strong> at <a href="/auth/register">orivraa.com/auth/register</a> — free, no credit card</li>
<li><strong>Add shop details</strong> — Name, logo, banner image, description, location</li>
<li><strong>Configure business info</strong> — Tax registration (PAN/VAT), bank account for payouts</li>
<li><strong>Set your preferences</strong> — Currency, default making charge calculation, shipping options</li>
</ol>

<h2>Step 3: Photograph Your Products</h2>

<p>Photography makes or breaks online jewellery sales. Here's what works:</p>

<ul>
<li><strong>White or neutral background</strong> — Use a lightbox or plain white paper</li>
<li><strong>Multiple angles</strong> — Front, back, side, and close-up of details</li>
<li><strong>Show scale</strong> — Include a shot on a hand/neck or next to a coin for size reference</li>
<li><strong>Hallmark close-up</strong> — Buyers want to see purity stamps</li>
<li><strong>Natural light</strong> — Shoot near a window. Avoid harsh flash</li>
<li><strong>Minimum 3 photos per product</strong> — More photos = more trust = more sales</li>
</ul>

<p>You don't need expensive equipment. A smartphone with a ₹500 lightbox produces professional-enough results.</p>

<h2>Step 4: List Your Products</h2>

<p>For each product, provide:</p>

<ul>
<li><strong>Title</strong> — Descriptive and keyword-rich: "22K Gold Temple Necklace with Ruby - 45g"</li>
<li><strong>Photos</strong> — 3-6 high-quality images</li>
<li><strong>Metal type & purity</strong> — Gold 22K, Silver 925, etc.</li>
<li><strong>Weight</strong> — Gross weight and net metal weight</li>
<li><strong>Making charges</strong> — Per gram or percentage</li>
<li><strong>Stone details</strong> — If applicable: type, count, total carat weight</li>
<li><strong>Price</strong> — Based on current metal rate + making charges + stone value</li>
<li><strong>Description</strong> — Detailed description of the piece, occasion, and craftsmanship</li>
</ul>

<p>Tip: Orivraa's AI can auto-generate optimised descriptions from your basic input — saving you 10-15 minutes per product.</p>

<h2>Step 5: Set Competitive Pricing</h2>

<p>Online buyers compare prices easily. To stay competitive:</p>

<ul>
<li><strong>Be transparent</strong> — Show making charges separately from metal value</li>
<li><strong>Monitor metal rates</strong> — Update prices when gold/silver rates change significantly</li>
<li><strong>Research competitors</strong> — Check what similar products sell for on other platforms</li>
<li><strong>Consider introductory offers</strong> — Lower making charges for your first 10-20 online sales to build reviews</li>
</ul>

<h2>Step 6: Create Digital Catalogues</h2>

<p>Digital catalogues are your online equivalent of a physical showroom. On Orivraa, you can create catalogues from your inventory and share them via:</p>

<ul>
<li><strong>WhatsApp</strong> — Send to customers who enquire, or broadcast to your contact list</li>
<li><strong>Instagram/Facebook</strong> — Link in your bio or stories</li>
<li><strong>Email</strong> — Include in follow-up emails to interested buyers</li>
</ul>

<p>Catalogues update automatically when you change prices or stock levels.</p>

<h2>Step 7: Reach International Buyers</h2>

<p>One of the biggest advantages of selling online is reaching international markets:</p>

<ul>
<li><strong>NRIs</strong> — Nepali and Indian diaspora in the USA, UK, and UAE actively buy jewellery online for weddings, festivals, and gifts</li>
<li><strong>B2B buyers</strong> — Retailers in other countries look for wholesale suppliers on marketplace platforms</li>
<li><strong>Custom order requests</strong> — International customers submit design requests and receive quotes from multiple sellers</li>
</ul>

<p>On Orivraa, your products are automatically visible in all supported countries (Nepal, India, UAE, UK, USA, Europe) with local currency pricing.</p>

<h2>Step 8: Respond Fast & Build Reviews</h2>

<p>Online jewellery buying requires trust. Build it by:</p>

<ul>
<li><strong>Responding within 1 hour</strong> — Sellers who reply fast have 5× higher conversion</li>
<li><strong>Being transparent about pricing</strong> — No hidden charges at checkout</li>
<li><strong>Following up after delivery</strong> — Ask for a review and address any issues promptly</li>
<li><strong>Getting verified</strong> — Complete your business verification for the trust badge</li>
</ul>

<h2>Getting Started Today</h2>

<p>The biggest mistake jewellery shops make is waiting. Every day without an online presence is a day of lost potential sales. <a href="/auth/register">Sign up on Orivraa for free</a>, list your first 5 products this week, and share your catalogue with your existing WhatsApp contacts. That's all it takes to start.</p>

<p>You can always upgrade, add more products, and expand your online strategy later. But the first step is getting your shop online — and with Orivraa, that takes less than 5 minutes.</p>
`,
  },

  /* ── Post 5 ────────────────────────────────────────────────── */
  {
    slug: "jewellery-gst-billing-guide-india",
    title:
      "GST Billing for Jewellery Shops in India: Complete Guide to Tax Compliance (2025)",
    description:
      "Complete guide to GST billing for jewellery shops in India. Learn about GST rates on gold (3%), making charges (5%), HSN codes, invoice formats, old gold exchange rules, and how to stay compliant with the latest regulations.",
    date: "2026-02-20",
    updated: "2026-03-01",
    author: "Orivraa Team",
    authorRole: "Compliance & Operations",
    readTime: "9 min read",
    category: "Tax & Compliance",
    tags: [
      "GST jewellery",
      "jewellery billing India",
      "gold GST rate",
      "jewellery tax compliance",
      "HUID",
      "hallmark",
      "jewellery invoicing",
    ],
    content: `
<p>GST compliance is one of the most confusing aspects of running a jewellery shop in India. With <strong>different tax rates on metal value (3%) and making charges (5%)</strong>, mandatory hallmarking, HUID requirements, and specific rules for old gold exchanges — getting billing right is both critical and complex.</p>

<p>This guide covers everything Indian jewellers need to know about GST billing in 2025.</p>

<h2>GST Rates for Jewellery in India</h2>

<table>
<thead>
<tr><th>Item</th><th>GST Rate</th><th>HSN Code</th></tr>
</thead>
<tbody>
<tr><td>Gold (bars, coins, ornaments)</td><td>3%</td><td>7108 / 7113</td></tr>
<tr><td>Silver (bars, coins, ornaments)</td><td>3%</td><td>7106 / 7114</td></tr>
<tr><td>Platinum</td><td>3%</td><td>7110 / 7113</td></tr>
<tr><td>Diamonds (unset)</td><td>0.25%</td><td>7102</td></tr>
<tr><td>Diamond jewellery</td><td>3%</td><td>7113</td></tr>
<tr><td>Making/labour charges</td><td>5%</td><td>9988</td></tr>
<tr><td>Imitation/fashion jewellery</td><td>3%</td><td>7117</td></tr>
</tbody>
</table>

<p><strong>Key point:</strong> When selling a gold ornament, you must split the invoice into two taxable components — the gold value (3% GST) and the making charges (5% GST). This is a common area where jewellers make errors.</p>

<h2>How to Calculate GST on a Gold Jewellery Sale</h2>

<p>Let's walk through an example:</p>

<p><strong>Sale: 22K Gold Chain, Net Weight 20g, Gold Rate ₹6,500/g, Making Charges ₹800/g</strong></p>

<table>
<thead>
<tr><th>Component</th><th>Calculation</th><th>Amount</th></tr>
</thead>
<tbody>
<tr><td>Gold Value</td><td>20g × ₹6,500</td><td>₹1,30,000</td></tr>
<tr><td>Making Charges</td><td>20g × ₹800</td><td>₹16,000</td></tr>
<tr><td>Subtotal</td><td></td><td>₹1,46,000</td></tr>
<tr><td>GST on Gold (3%)</td><td>₹1,30,000 × 3%</td><td>₹3,900</td></tr>
<tr><td>GST on Making (5%)</td><td>₹16,000 × 5%</td><td>₹800</td></tr>
<tr><td>Total GST</td><td></td><td>₹4,700</td></tr>
<tr><td><strong>Invoice Total</strong></td><td></td><td><strong>₹1,50,700</strong></td></tr>
</tbody>
</table>

<h2>Invoice Requirements for Jewellery</h2>

<p>Your GST invoice must include:</p>

<ul>
<li>Shop name, address, and GSTIN</li>
<li>Customer name and address (for sales above ₹50,000)</li>
<li>Date and sequential invoice number</li>
<li>HSN codes for each item (7113 for ornaments, 9988 for making charges)</li>
<li><strong>Separate line items</strong> for metal value and making charges</li>
<li>CGST + SGST or IGST as applicable</li>
<li>HUID/Hallmark number for each gold ornament</li>
<li>Net weight and gross weight</li>
<li>Purity (karat/fineness)</li>
</ul>

<h2>Old Gold Exchange: GST Rules</h2>

<p>When a customer exchanges old gold as part payment:</p>

<ol>
<li><strong>You must issue a purchase invoice</strong> for the old gold bought from the customer</li>
<li><strong>Deduct the old gold value</strong> from the new jewellery invoice</li>
<li><strong>Old gold purchase attracts 3% GST</strong> — but under reverse charge mechanism, YOU (the jeweller) pay this GST</li>
<li>The customer pays GST only on the net amount (new jewellery value minus old gold credit)</li>
</ol>

<p><strong>Example:</strong> Customer buys ₹2,00,000 necklace and exchanges old gold worth ₹80,000. Customer pays GST on ₹1,20,000 (the net amount). You pay 3% GST on the ₹80,000 old gold purchase under reverse charge.</p>

<h2>HUID and Hallmarking Requirements</h2>

<p>Since June 2021, <strong>hallmarking is mandatory for gold jewellery</strong> sold in India. As of 2025:</p>

<ul>
<li>All gold jewellery must have a BIS Hallmark and HUID (6-digit alphanumeric code)</li>
<li>Only 14K, 18K, 20K, 22K, and 24K are permitted for hallmarking</li>
<li>HUID must be printed on the invoice</li>
<li>Jewellers must register on the BIS portal and maintain records</li>
</ul>

<h2>Filing Requirements</h2>

<table>
<thead>
<tr><th>Return</th><th>Frequency</th><th>Due Date</th></tr>
</thead>
<tbody>
<tr><td>GSTR-1 (Outward supplies)</td><td>Monthly/Quarterly</td><td>11th of next month</td></tr>
<tr><td>GSTR-3B (Summary)</td><td>Monthly/Quarterly</td><td>20th of next month</td></tr>
<tr><td>GSTR-9 (Annual)</td><td>Annual</td><td>31st December</td></tr>
</tbody>
</table>

<p>Jewellers under the <strong>Composition Scheme</strong> (turnover below ₹1.5 crore) pay a flat 1% tax and file quarterly. However, they cannot claim input tax credit or sell to other states.</p>

<h2>Common GST Mistakes by Jewellers</h2>

<ul>
<li><strong>Not splitting gold value and making charges</strong> — Applying a single 3% rate on the total amount (incorrect — making charges are 5%)</li>
<li><strong>Incorrect old gold accounting</strong> — Not paying reverse charge GST on old gold purchases</li>
<li><strong>Missing HUID on invoices</strong> — Mandatory and can result in penalties</li>
<li><strong>Wrong HSN codes</strong> — Using generic codes instead of jewellery-specific ones</li>
<li><strong>Not issuing invoices for small sales</strong> — All B2C sales require a bill regardless of amount</li>
</ul>

<h2>How Jewellery Software Helps with GST</h2>

<p>The right <a href="/jewellery-shop-software">jewellery shop software</a> automates most of this:</p>

<ul>
<li>Automatic split of metal value and making charges on invoices</li>
<li>Pre-configured GST rates (3% and 5%) for jewellery</li>
<li>HUID field on every product record</li>
<li>Old gold exchange calculations with reverse charge</li>
<li>HSN code auto-assignment based on product category</li>
<li>GSTR-ready reports for filing</li>
</ul>

<p>Orivraa handles GST compliance for Indian jewellers automatically — including the tricky making charges split. <a href="/auth/register">Start free</a> and see how it simplifies your billing.</p>
`,
  },
  /* ── Post 6 ────────────────────────────────────────────────── */
  {
    slug: "best-jewellery-store-management-software-2026",
    title: "Best Jewellery Store Management Software in 2026: Complete Guide",
    description:
      "Compare the best jewellery store management software for 2026. Orivraa, Marg ERP, Zoho, Vyapar — features, pricing, and which one suits your gold shop. Includes free options.",
    date: "2026-03-01",
    author: "Orivraa Team",
    authorRole: "Product & Market Research",
    readTime: "11 min read",
    category: "Software Guide",
    tags: [
      "jewellery store management",
      "jewellery shop software",
      "gold shop management",
      "jewellery ERP",
      "software comparison",
      "Marg ERP",
      "Vyapar",
    ],
    content: `
<p>Managing a jewellery store in 2026 is more complex than ever. Between fluctuating gold prices, GST compliance, karigar management, and the shift to online selling — you need software that understands the jewellery business inside out.</p>

<p>In this guide, we compare the <strong>best jewellery store management software</strong> available in 2026, covering features, pricing, and which type of jewellery business each serves best.</p>

<h2>Why Jewellery Stores Need Specialised Software</h2>

<p>A jewellery store isn't a regular retail shop. You can't manage gold with software designed for groceries or clothing. Here's why:</p>

<ul>
<li><strong>Inventory is tracked by weight and purity</strong> — not just quantity. A "gold necklace" could be 22K at 15 grams or 18K at 22 grams. Each requires different tracking.</li>
<li><strong>Pricing changes daily</strong> — Gold and silver rates fluctuate. Your software must support dynamic pricing or manual rate entry.</li>
<li><strong>Billing is complex</strong> — Making charges, stone charges, wastage, old gold exchange — regular billing software can't handle any of this.</li>
<li><strong>Compliance requirements</strong> — HUID tracking, hallmark verification, GST with different rates on gold (3%) vs making charges (5%) in India.</li>
<li><strong>Karigar management</strong> — Track raw materials issued to artisans, returned items, and wastage.</li>
</ul>

<h2>Top Jewellery Store Management Software in 2026</h2>

<h3>1. Orivraa — Best Free Cloud-Based Platform</h3>

<p><strong>Pricing:</strong> Free plan (15 products) · India Pro ₹299/month · India Pro+ ₹599/month · Nepal Pro NPR 399/month · Enterprise custom</p>

<p>Orivraa is the most modern jewellery store management platform available. It combines inventory management, billing, a built-in marketplace, customer messaging, digital catalogues, and AI-powered tools — all accessible from any device.</p>

<p><strong>What sets it apart:</strong></p>
<ul>
<li>Cloud-based — access from anywhere, no installation needed</li>
<li>Built-in marketplace reaching buyers across Nepal, India, Dubai, USA, UK & Europe</li>
<li>AI product descriptions and smart tagging</li>
<li>Multi-currency support (NPR, INR, AED, GBP, USD, EUR)</li>
<li>Digital catalogues shareable on WhatsApp</li>
<li>Desktop app available for offline access</li>
</ul>

<p><strong>Best for:</strong> Small to medium jewellery shops wanting a modern, affordable, cloud-based solution. Especially powerful for shops wanting to sell online without building a separate website.</p>

<h3>2. Marg ERP 9+ Jewellery — Best Legacy Desktop ERP</h3>

<p><strong>Pricing:</strong> ₹15,000–₹50,000 (one-time/annual)</p>

<p>Marg ERP has been the go-to choice for Indian jewellery shops for over two decades. It excels at <strong>karigar management, RFID billing, and detailed GST compliance</strong>.</p>

<p><strong>Best for:</strong> Large Indian jewellery shops with complex karigar networks and extensive walk-in billing. However, it lacks cloud access, online selling features, and modern UI.</p>

<h3>3. Zoho Inventory + Books — Best General Business Suite</h3>

<p><strong>Pricing:</strong> Free plan available · Paid from ₹749/month</p>

<p>Zoho is a powerful general business suite, but it's not jewellery-specific. You'll need to customise fields for weight and purity tracking. It excels at <strong>accounting, CRM, and multi-channel selling</strong>.</p>

<p><strong>Best for:</strong> Tech-savvy jewellers who want a complete business suite and are willing to do custom configuration. Not ideal for traditional shops or those needing karigar management.</p>

<h3>4. Vyapar — Best Simple Billing App</h3>

<p><strong>Pricing:</strong> Free plan · Paid from ₹399/month</p>

<p>Vyapar is a popular Indian billing app that's simple to use. However, it's designed for general businesses and lacks jewellery-specific features like weight tracking, making charges, and purity management.</p>

<p><strong>Best for:</strong> Very small jewellery shops that primarily need basic GST billing and don't require weight-based inventory management. Limited for growth.</p>

<h2>Feature Comparison Table</h2>

<table>
<thead>
<tr><th>Feature</th><th>Orivraa</th><th>Marg ERP</th><th>Zoho</th><th>Vyapar</th></tr>
</thead>
<tbody>
<tr><td>Cloud-Based</td><td>✅</td><td>❌</td><td>✅</td><td>✅</td></tr>
<tr><td>Weight & Purity Tracking</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
<tr><td>Making Charges</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
<tr><td>Built-in Marketplace</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
<tr><td>Multi-Currency</td><td>✅</td><td>❌</td><td>✅</td><td>❌</td></tr>
<tr><td>AI Features</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
<tr><td>Karigar Management</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
<tr><td>Free Plan</td><td>✅</td><td>❌</td><td>✅</td><td>✅</td></tr>
<tr><td>Desktop App</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
<tr><td>International Selling</td><td>✅</td><td>❌</td><td>✅ (with setup)</td><td>❌</td></tr>
</tbody>
</table>

<h2>How to Choose the Right Software</h2>

<p>Ask yourself these questions:</p>

<ol>
<li><strong>Do you want to sell online?</strong> → Orivraa (built-in marketplace)</li>
<li><strong>Do you have complex karigar operations?</strong> → Orivraa or Marg ERP</li>
<li><strong>Do you want cloud access from anywhere?</strong> → Orivraa or Zoho</li>
<li><strong>Is budget a constraint?</strong> → Orivraa Free, Zoho Free, or Vyapar Free</li>
<li><strong>Do you sell internationally?</strong> → Orivraa (multi-currency, multi-market)</li>
</ol>

<h2>Conclusion</h2>

<p>For most jewellery shops in 2026, <strong>Orivraa offers the best combination</strong> of jewellery-specific features, modern cloud-based architecture, and affordability. It's the only platform that combines store management with an international marketplace and AI tools — starting free.</p>

<p><a href="/auth/register">Try Orivraa free</a> — no credit card required. Or <a href="/jewellery-store-management-software">learn more about store management features</a>.</p>
`,
  },

  /* ── Post 7 ────────────────────────────────────────────────── */
  {
    slug: "how-jewellery-shops-can-go-digital",
    title:
      "How Jewellery Shops Can Go Digital in 2026: A Complete Transformation Guide",
    description:
      "Step-by-step guide for jewellery shops going digital. From inventory digitisation to online sales, digital catalogues, social media marketing, and customer management. Practical tips for gold & diamond shops.",
    date: "2026-02-20",
    author: "Orivraa Team",
    authorRole: "Business Strategy",
    readTime: "10 min read",
    category: "Business Guide",
    tags: [
      "digital transformation",
      "jewellery shop",
      "go digital",
      "online selling",
      "digital catalogue",
      "jewellery marketing",
    ],
    content: `
<p>The jewellery industry is undergoing a massive digital shift. Customers research online before visiting shops, compare prices on their phones, and increasingly buy jewellery online. If your shop is still operating purely offline, you're losing customers to competitors who have embraced digital.</p>

<p>But "going digital" doesn't mean abandoning your physical store. It means <strong>extending your reach, improving efficiency, and meeting customers where they are</strong> — online.</p>

<h2>Step 1: Digitise Your Inventory</h2>

<p>The foundation of going digital is having your inventory in a digital system, not in paper registers or spreadsheets.</p>

<p><strong>What to digitise for each product:</strong></p>
<ul>
<li>Product name and category (necklace, ring, bangle, etc.)</li>
<li>Metal type and purity (22K gold, 925 silver, etc.)</li>
<li>Gross weight and net weight (after stones)</li>
<li>Stone details (type, weight, quality)</li>
<li>Making charges and pricing</li>
<li>Photos from multiple angles</li>
<li>HUID/barcode numbers</li>
</ul>

<p><strong>Tool:</strong> <a href="/jewellery-inventory-software">Orivraa's inventory management</a> supports all these fields natively. You can bulk upload existing inventory via CSV/Excel if you have digital records, or add products one-by-one with photos.</p>

<h2>Step 2: Create a Digital Catalogue</h2>

<p>A digital catalogue is the jewellery equivalent of a restaurant menu — customers can browse your collection before visiting your shop (or instead of visiting).</p>

<p><strong>Benefits of digital catalogues:</strong></p>
<ul>
<li>Share your collection via WhatsApp and social media</li>
<li>Update instantly when products sell or new stock arrives</li>
<li>Reach customers in other cities and countries</li>
<li>Reduce the need for physical showroom visits for initial browsing</li>
</ul>

<p>With Orivraa, every product you add automatically becomes part of your digital catalogue. You can share your shop profile link on WhatsApp, Instagram, or Facebook — customers browse your full collection with photos, weights, and prices.</p>

<h2>Step 3: Set Up Online Ordering</h2>

<p>Once customers can see your products digitally, the natural next step is allowing them to order online or place custom requests.</p>

<p><strong>Online ordering options:</strong></p>
<ul>
<li><strong>Direct purchase</strong> — Customer adds to cart and pays online (for standard items)</li>
<li><strong>RFQ (Request for Quote)</strong> — Customer asks for pricing on custom designs or bulk orders</li>
<li><strong>Chat enquiry</strong> — Customer messages you about a specific product to negotiate or ask questions</li>
</ul>

<p>Orivraa supports all three methods. Customers can browse your shop on the <a href="/shops">marketplace</a>, send enquiries, request custom orders, or purchase directly.</p>

<h2>Step 4: Build a Social Media Presence</h2>

<p>Social media is where jewellery discovery happens in 2026. Instagram and Facebook are visual platforms perfect for jewellery.</p>

<p><strong>Content ideas for jewellery shops:</strong></p>
<ul>
<li>Daily new arrival posts with product photos</li>
<li>Behind-the-scenes videos of craftsmanship</li>
<li>Customer testimonials and reviews</li>
<li>Jewellery care and maintenance tips</li>
<li>Festival and wedding season collections</li>
<li>Educational content (how to check gold purity, etc.)</li>
</ul>

<p><strong>Pro tip:</strong> Orivraa's AI can generate product descriptions and social media captions for you. Upload a photo and get ready-to-post content in seconds.</p>

<h2>Step 5: Implement Digital Billing</h2>

<p>Replace handwritten bills and manual calculations with <a href="/jewellery-shop-billing-software">digital billing software</a>. Benefits include:</p>

<ul>
<li>Faster checkout with barcode scanning</li>
<li>Automatic tax calculation (GST/VAT)</li>
<li>Accurate making charges and weight-based pricing</li>
<li>Professional invoices that build trust</li>
<li>Digital records for audit and compliance</li>
</ul>

<h2>Step 6: Embrace Multi-Channel Selling</h2>

<p>Don't limit yourself to one sales channel. Modern jewellery businesses succeed by being present everywhere:</p>

<ul>
<li><strong>Physical store</strong> — Walk-in customers and local buyers</li>
<li><strong>Orivraa marketplace</strong> — Online buyers across 6 countries</li>
<li><strong>WhatsApp</strong> — Share catalogues and accept orders via chat</li>
<li><strong>Instagram/Facebook</strong> — Social selling with product posts</li>
<li><strong>Google Business</strong> — Local search visibility</li>
</ul>

<h2>Step 7: Use Data for Better Decisions</h2>

<p>Digital tools give you data that paper registers never could:</p>

<ul>
<li>Which products sell fastest</li>
<li>Which categories have dead stock</li>
<li>Peak selling seasons and days</li>
<li>Customer demographics and preferences</li>
<li>Profit margins by product type</li>
</ul>

<p>Orivraa's analytics dashboard shows all of this in real-time, helping you make smarter buying, pricing, and marketing decisions.</p>

<h2>Common Concerns About Going Digital</h2>

<h3>"My customers are traditional — they won't buy online"</h3>
<p>Digital isn't just about online sales. It's about digital billing, inventory tracking, and WhatsApp catalogues. Even traditional customers appreciate professional invoices and being able to browse your collection on WhatsApp before visiting.</p>

<h3>"I don't have technical knowledge"</h3>
<p>Modern platforms like Orivraa are designed for non-technical users. If you can use WhatsApp, you can use Orivraa. Most shops get set up in under 30 minutes.</p>

<h3>"Digital transformation is expensive"</h3>
<p>Orivraa starts free. Upload 15 products, get a marketplace listing, digital billing, and customer chat — all for ₹0. Upgrade only when your business grows.</p>

<h2>Start Your Digital Journey Today</h2>

<p>The best time to digitise your jewellery shop was 5 years ago. The second best time is today. <a href="/auth/register">Sign up for Orivraa free</a> and take the first step.</p>
`,
  },

  /* ── Post 8 ────────────────────────────────────────────────── */
  {
    slug: "how-to-manage-gold-inventory-jewellery-store",
    title:
      "How to Manage Gold Inventory in a Jewellery Store: Best Practices for 2026",
    description:
      "Complete guide to managing gold inventory in a jewellery store. Weight tracking, purity management, karigar allotment, stock valuation, and loss prevention. Practical tips for gold shop owners.",
    date: "2026-02-10",
    author: "Orivraa Team",
    authorRole: "Industry Expert",
    readTime: "9 min read",
    category: "Business Guide",
    tags: [
      "gold inventory",
      "inventory management",
      "jewellery store",
      "gold tracking",
      "karigar management",
      "stock valuation",
    ],
    content: `
<p>Gold inventory management is the backbone of any jewellery business. Unlike retail goods where you count units, gold must be tracked by <strong>weight, purity, and value</strong> — and the value changes every single day.</p>

<p>Poor inventory management leads to theft, inaccurate valuation, tax discrepancies, and lost profits. This guide covers the best practices for managing gold inventory in a modern jewellery store.</p>

<h2>The Unique Challenges of Gold Inventory</h2>

<p>Gold inventory management is fundamentally different from any other retail inventory:</p>

<ul>
<li><strong>Weight accuracy matters to the milligram</strong> — A 0.5-gram discrepancy on a 22K gold piece at ₹7,200/gram = ₹3,600 loss</li>
<li><strong>Purity must be tracked per item</strong> — You may have 24K, 22K, 18K, and 14K gold in the same display case</li>
<li><strong>Value fluctuates daily</strong> — Today's inventory valuation may be different from tomorrow's by lakhs</li>
<li><strong>Karigar allotments create "float" stock</strong> — Raw gold with artisans isn't in your display but is still your inventory</li>
<li><strong>Stones add complexity</strong> — Gross weight includes stones, net weight is the actual metal content</li>
</ul>

<h2>Best Practice #1: Track Gross and Net Weight Separately</h2>

<p>Every piece of jewellery should have two weight records:</p>

<ul>
<li><strong>Gross weight</strong> — Total weight of the finished piece (metal + stones + other materials)</li>
<li><strong>Net weight</strong> — Weight of the precious metal only (what determines the metal value)</li>
</ul>

<p>The difference is the <strong>stone weight</strong>, which has its own value based on type, quality, and carat. Accurate separation ensures correct pricing and inventory valuation.</p>

<h2>Best Practice #2: Categorise by Purity</h2>

<p>Never mix purity grades in your tracking. Maintain separate inventory registers or categories for:</p>

<ul>
<li><strong>24K (99.9% pure)</strong> — Coins, bars, investment pieces</li>
<li><strong>22K (91.6% pure)</strong> — Traditional Indian/Nepali jewellery</li>
<li><strong>18K (75% pure)</strong> — Contemporary designs, diamond settings</li>
<li><strong>14K (58.3% pure)</strong> — Affordable everyday jewellery</li>
</ul>

<p>Your total gold stock should be reportable by purity grade — how much 22K gold do you have in total? How much 18K? This is critical for purchasing decisions and financial reporting.</p>

<h2>Best Practice #3: Implement Barcode or HUID Tracking</h2>

<p>Every piece should have a unique identifier — either a barcode label you generate or the HUID (Hallmark Unique Identification) number assigned by the hallmarking centre.</p>

<p><strong>Benefits of individual tracking:</strong></p>
<ul>
<li>Instant product lookup during billing (scan and bill in seconds)</li>
<li>Theft detection — know exactly which pieces are missing</li>
<li>Hallmark compliance (mandatory in India since 2023)</li>
<li>Customer confidence — verifiable authenticity</li>
</ul>

<h2>Best Practice #4: Manage Karigar Allotments Rigorously</h2>

<p>When you issue raw gold to karigars (artisans), that gold is still your asset. Track meticulously:</p>

<ul>
<li><strong>Gold issued</strong> — Date, weight, purity, and artisan name</li>
<li><strong>Gold returned</strong> — Finished pieces weight + scrap/wastage weight</li>
<li><strong>Wastage</strong> — Normal wastage is 2-5% depending on the design. Anything above should be investigated.</li>
<li><strong>Outstanding balance</strong> — How much gold is currently with each karigar?</li>
</ul>

<p><a href="/jewellery-inventory-software">Orivraa's karigar management</a> automates this tracking, calculating balances and flagging unusual wastage automatically.</p>

<h2>Best Practice #5: Daily Physical Verification</h2>

<p>For high-value inventory like gold, daily verification of display stock is essential:</p>

<ul>
<li><strong>Morning opening</strong> — Verify display case items match the digital inventory count</li>
<li><strong>Evening closing</strong> — Reconcile: opening stock − sold items + newly added items = closing stock</li>
<li><strong>Weight check</strong> — Periodically weigh display categories and compare against the system</li>
</ul>

<p>With digital inventory software, this process is faster — scan barcodes and the system flags any mismatches.</p>

<h2>Best Practice #6: Real-Time Stock Valuation</h2>

<p>Your gold inventory value changes daily with market rates. Your system should calculate:</p>

<ul>
<li><strong>Total gold stock by weight and purity</strong> — e.g., 2.5 kg of 22K gold, 800g of 18K gold</li>
<li><strong>Current market value</strong> — Based on today's gold rate per gram for each purity</li>
<li><strong>Cost vs market value</strong> — Did your inventory appreciate or depreciate since purchase?</li>
<li><strong>Stock ageing</strong> — Which items have been in stock the longest? (slow-moving stock ties up capital)</li>
</ul>

<h2>Best Practice #7: Maintain an Audit Trail</h2>

<p>Every inventory movement should be logged:</p>

<ul>
<li>New stock additions (with purchase details)</li>
<li>Sales and removals (with invoice reference)</li>
<li>Transfers between branches or display cases</li>
<li>Karigar issuances and returns</li>
<li>Adjustments (with reason and authorisation)</li>
</ul>

<p>This audit trail is essential for loss prevention, tax compliance, and dispute resolution.</p>

<h2>Common Gold Inventory Mistakes to Avoid</h2>

<ul>
<li><strong>Mixing gross and net weight</strong> — Leads to incorrect valuation and pricing</li>
<li><strong>Not tracking karigar wastage</strong> — Can result in significant gold loss over time</li>
<li><strong>Monthly instead of daily reconciliation</strong> — Theft or discrepancies go unnoticed for weeks</li>
<li><strong>Using general inventory software</strong> — No purity tracking means inaccurate stock reports</li>
<li><strong>Paper-based systems</strong> — Prone to errors, slow, and difficult to audit</li>
</ul>

<h2>The Right Software Makes It Easy</h2>

<p>All of these best practices become simple with the right <a href="/jewellery-inventory-software">jewellery inventory software</a>. Orivraa tracks weight, purity, karigars, and valuations automatically — so you can focus on your customers and designs instead of spreadsheets.</p>

<p><a href="/auth/register">Start free with Orivraa</a> — manage up to 15 products with full inventory tracking at no cost.</p>
`,
  },

  /* ── Post 9 ────────────────────────────────────────────────── */
  {
    slug: "jewellery-shop-billing-software-guide",
    title:
      "Jewellery Shop Billing Software Guide: Everything You Need to Know in 2026",
    description:
      "Complete guide to jewellery shop billing software. How to calculate making charges, handle old gold exchange, generate GST/VAT invoices, and choose the right billing software for your gold shop.",
    date: "2026-01-25",
    author: "Orivraa Team",
    authorRole: "Product Expert",
    readTime: "10 min read",
    category: "Software Guide",
    tags: [
      "jewellery billing",
      "billing software",
      "GST billing",
      "making charges",
      "old gold exchange",
      "jewellery invoicing",
    ],
    content: `
<p>Billing in a jewellery shop is nothing like billing in a grocery store or clothing boutique. When a customer buys a gold necklace, the bill involves <strong>metal weight, purity rate, making charges, stone charges, old gold exchange, and tax calculations</strong> — all in a single transaction.</p>

<p>This guide explains how jewellery billing works, what features to look for in billing software, and how to choose the right solution for your shop.</p>

<h2>How Jewellery Billing Works</h2>

<p>A typical jewellery invoice has these components:</p>

<h3>1. Metal Value Calculation</h3>
<p>Metal value = <strong>Net weight × Purity rate per gram</strong></p>
<p>Example: A 22K gold necklace weighing 15 grams net weight at ₹7,200/gram (22K rate) = ₹1,08,000</p>

<h3>2. Making Charges</h3>
<p>Making charges cover the artisan's labour. They can be calculated as:</p>
<ul>
<li><strong>Per gram:</strong> ₹800/gram × 15g = ₹12,000</li>
<li><strong>Per piece:</strong> Flat ₹15,000 for the entire piece</li>
<li><strong>Percentage:</strong> 15% of metal value = ₹16,200</li>
</ul>

<h3>3. Stone Charges</h3>
<p>If the piece contains gemstones (diamonds, rubies, emeralds), each stone is priced separately based on type, carat, clarity, and cut.</p>

<h3>4. Tax Calculation</h3>
<p>In India:</p>
<ul>
<li>Gold/silver value: <strong>3% GST</strong></li>
<li>Making charges: <strong>5% GST</strong></li>
<li>Diamond value: <strong>0.25% GST</strong></li>
</ul>

<h3>5. Old Gold Exchange (Optional)</h3>
<p>If the customer trades in old gold:</p>
<ul>
<li>Weigh and test the old gold</li>
<li>Calculate value at current rate × purity</li>
<li>Deduct from the total bill</li>
</ul>

<h3>6. Final Invoice</h3>
<p>The invoice shows all components: metal value + making charges + stone charges + tax − old gold exchange = <strong>amount payable</strong>.</p>

<h2>Essential Features in Jewellery Billing Software</h2>

<p>When evaluating billing software for your jewellery shop, ensure it supports:</p>

<table>
<thead>
<tr><th>Feature</th><th>Why It Matters</th></tr>
</thead>
<tbody>
<tr><td>Weight-based pricing</td><td>Jewellery is priced by weight, not unit price</td></tr>
<tr><td>Purity calculations</td><td>Different prices for 24K, 22K, 18K, 14K</td></tr>
<tr><td>Making charges (per gram/piece/%)</td><td>Different products have different making charge structures</td></tr>
<tr><td>Stone/gem charges</td><td>Separate pricing for diamonds and gemstones</td></tr>
<tr><td>Old gold exchange</td><td>Very common in jewellery — must be on the invoice</td></tr>
<tr><td>GST/VAT auto-calculation</td><td>3% on gold, 5% on making — automatic splitting</td></tr>
<tr><td>Barcode/HUID scanning</td><td>Fast billing at the counter</td></tr>
<tr><td>Multiple payment methods</td><td>Cash + card + UPI + old gold in one transaction</td></tr>
<tr><td>Invoice printing</td><td>Professional templates with your branding</td></tr>
<tr><td>Returns and credit notes</td><td>Handle exchanges and refunds properly</td></tr>
</tbody>
</table>

<h2>Choosing the Right Billing Software</h2>

<h3>Option 1: Orivraa (Recommended)</h3>
<p><strong>Best for:</strong> Modern jewellery shops wanting cloud-based billing with online selling capabilities</p>
<p>Orivraa's billing module handles all jewellery-specific calculations — weight-based pricing, making charges, old gold exchange, and multi-country tax compliance. Plus, it integrates with inventory, customer management, and the online marketplace. <strong>Free plan available.</strong></p>

<h3>Option 2: Marg ERP</h3>
<p><strong>Best for:</strong> Large Indian shops needing comprehensive desktop ERP with karigar and RFID features</p>
<p>Proven solution with deep jewellery features, but desktop-only, expensive, and no online selling integration.</p>

<h3>Option 3: Vyapar</h3>
<p><strong>Best for:</strong> Very small shops needing basic GST billing only</p>
<p>Easy to use but lacks jewellery-specific features like weight-based pricing and making charges.</p>

<h2>Common Billing Mistakes in Jewellery Shops</h2>

<ul>
<li><strong>Rounding weight</strong> — Always bill to 2 decimal places (grams). Rounding costs you money on hundreds of transactions.</li>
<li><strong>Wrong GST rate</strong> — Gold is 3%, making charges are 5%. Mixing these up leads to tax shortfall or overpayment.</li>
<li><strong>Not recording old gold exchange properly</strong> — This needs proper documentation for tax purposes. The exchange value must appear on the invoice.</li>
<li><strong>No invoice numbering sequence</strong> — GST requires sequential invoice numbers. Gaps can trigger audit scrutiny.</li>
<li><strong>Handwritten bills</strong> — Illegible, error-prone, and not accepted by tax authorities for digital filing.</li>
</ul>

<h2>Getting Started with Digital Billing</h2>

<p>Switching from manual to digital billing is easier than you think. With <a href="/jewellery-shop-billing-software">Orivraa's billing software</a>:</p>

<ol>
<li>Sign up free (2 minutes)</li>
<li>Add your products with weight and purity</li>
<li>Configure your tax settings (automatic for India, Nepal, UAE, UK, USA)</li>
<li>Start billing — scan barcodes or search products</li>
</ol>

<p><a href="/auth/register">Try Orivraa billing free</a> — generate professional invoices with making charges, old gold exchange, and GST compliance from day one.</p>
`,
  },

  /* ── Post 10 ───────────────────────────────────────────────── */
  {
    slug: "how-jewellery-pricing-works",
    title:
      "How Jewellery Pricing Works: The Complete Guide to Gold, Diamond & Silver Pricing",
    description:
      "Learn how jewellery pricing works — from gold rate calculations and making charges to diamond pricing (4Cs), silver pricing, and international currency differences. Essential guide for buyers and jewellers.",
    date: "2026-01-15",
    author: "Orivraa Team",
    authorRole: "Industry Expert",
    readTime: "12 min read",
    category: "Industry Guide",
    tags: [
      "jewellery pricing",
      "gold pricing",
      "diamond pricing",
      "making charges",
      "gold rate",
      "jewellery buying guide",
    ],
    content: `
<p>Jewellery pricing confuses many buyers — and even some shop owners get it wrong. Understanding how jewellery is priced helps buyers make informed decisions and helps sellers price their products competitively.</p>

<p>This guide breaks down the pricing structure for <strong>gold, diamond, and silver jewellery</strong>, explains making charges, and covers how prices vary across countries.</p>

<h2>Gold Jewellery Pricing</h2>

<p>Gold jewellery pricing has three main components:</p>

<h3>1. Gold Metal Value</h3>
<p><strong>Formula:</strong> Net weight (grams) × Gold rate per gram (for specific purity)</p>

<p>Gold rates vary by purity:</p>
<ul>
<li><strong>24K (99.9% pure)</strong> — The benchmark rate. Used for coins and bars. Example: ₹7,800/gram</li>
<li><strong>22K (91.6% pure)</strong> — Most common for Indian/Nepali jewellery. Rate = 24K rate × 0.916. Example: ₹7,143/gram</li>
<li><strong>18K (75% pure)</strong> — Common for Western-style jewellery and diamond settings. Rate = 24K rate × 0.75. Example: ₹5,850/gram</li>
<li><strong>14K (58.3% pure)</strong> — Affordable everyday jewellery. Rate = 24K rate × 0.583. Example: ₹4,547/gram</li>
</ul>

<p><strong>Important:</strong> The "net weight" is the weight of gold only, excluding stones. If a ring weighs 8 grams total but has a 0.5-gram diamond, the gold net weight is 7.5 grams.</p>

<h3>2. Making Charges</h3>
<p>Making charges (also called labour charges or wastage charges) cover the artisan's craftsmanship. They vary significantly based on design complexity:</p>

<table>
<thead>
<tr><th>Design Type</th><th>Typical Making Charges (India)</th></tr>
</thead>
<tbody>
<tr><td>Plain gold chain</td><td>₹200–400/gram</td></tr>
<tr><td>Simple bangles</td><td>₹300–600/gram</td></tr>
<tr><td>Standard necklace</td><td>₹500–800/gram</td></tr>
<tr><td>Intricate temple jewellery</td><td>₹800–1,500/gram</td></tr>
<tr><td>Kundan/Meenakari work</td><td>₹1,000–2,500/gram</td></tr>
<tr><td>Custom handcrafted piece</td><td>₹1,500–5,000/gram</td></tr>
</tbody>
</table>

<p>Some shops charge making as a percentage of gold value (8-25%) or a flat fee per piece for standardised designs.</p>

<h3>3. Stone Charges</h3>
<p>If the piece contains gemstones, they are priced separately. Diamonds are priced by the 4Cs (see below). Coloured stones (ruby, emerald, sapphire) are priced based on origin, quality, and carat weight.</p>

<h3>Gold Pricing Example</h3>
<p>A 22K gold necklace, 20 grams net weight, with making charges of ₹600/gram:</p>
<ul>
<li>Gold value: 20g × ₹7,143/gram = <strong>₹1,42,860</strong></li>
<li>Making charges: 20g × ₹600/gram = <strong>₹12,000</strong></li>
<li>Sub-total: ₹1,54,860</li>
<li>GST (3% on gold): ₹4,286</li>
<li>GST (5% on making): ₹600</li>
<li><strong>Total: ₹1,59,746</strong></li>
</ul>

<h2>Diamond Jewellery Pricing</h2>

<p>Diamond pricing is based on the <strong>4Cs</strong>:</p>

<h3>1. Carat (Weight)</h3>
<p>One carat = 0.2 grams. Larger diamonds are exponentially more expensive — a 2-carat diamond isn't just twice the price of a 1-carat; it could be 4-5 times more because larger diamonds are rarer.</p>

<h3>2. Clarity</h3>
<p>How "clean" the diamond is internally. Grades from FL (Flawless) to I3 (Included). Most jewellery uses VS to SI grade, which offers the best value — inclusions aren't visible to the naked eye.</p>

<h3>3. Colour</h3>
<p>Diamond colour grades from D (colourless, most expensive) to Z (yellow tint). D-F are "colourless" and command premium prices. G-J are "near colourless" and offer excellent value.</p>

<h3>4. Cut</h3>
<p>How well the diamond is cut determines its sparkle. Grades from Excellent to Poor. An "Excellent" cut diamond will sparkle more than a "Good" cut, even if other factors are the same.</p>

<h3>Diamond Price Ranges (Approximate)</h3>
<table>
<thead>
<tr><th>Size</th><th>VS-SI / G-H Colour</th><th>VVS-VS / D-F Colour</th></tr>
</thead>
<tbody>
<tr><td>0.25 carat</td><td>₹15,000–30,000</td><td>₹30,000–60,000</td></tr>
<tr><td>0.50 carat</td><td>₹40,000–80,000</td><td>₹80,000–1,50,000</td></tr>
<tr><td>1.0 carat</td><td>₹2,00,000–4,00,000</td><td>₹4,00,000–10,00,000</td></tr>
<tr><td>2.0 carat</td><td>₹8,00,000–15,00,000</td><td>₹15,00,000–40,00,000+</td></tr>
</tbody>
</table>

<h2>Silver Jewellery Pricing</h2>

<p>Silver jewellery pricing is simpler than gold:</p>

<ul>
<li><strong>Silver rate</strong> — Currently around ₹85-95/gram (fluctuates daily)</li>
<li><strong>Purity</strong> — 999 (fine silver) or 925 (sterling silver, 92.5% pure)</li>
<li><strong>Making charges</strong> — Usually a higher percentage of metal value compared to gold (since silver is cheaper, making is proportionally more expensive)</li>
</ul>

<p>Many silver pieces are priced as a "per piece" rate rather than weight-based, as the metal cost is relatively low and the craftsmanship is the dominant value.</p>

<h2>Why Prices Differ Between Countries</h2>

<p>Jewellery prices vary significantly by country due to:</p>

<ul>
<li><strong>Import duties</strong> — India charges ~15% on gold imports; Nepal and UAE have lower duties</li>
<li><strong>Tax rates</strong> — GST (India: 3%), VAT (UK: 20%), Sales Tax (USA: varies by state)</li>
<li><strong>Making charge standards</strong> — Italian and European making charges are much higher due to labour costs</li>
<li><strong>Currency exchange</strong> — Gold is priced globally in USD; local prices depend on exchange rates</li>
<li><strong>Hallmarking requirements</strong> — Mandatory hallmarking adds cost but ensures quality</li>
</ul>

<p>This is why <a href="/jewellery-shop-software">Orivraa supports multi-currency pricing</a> — jewellers can set prices in NPR, INR, AED, GBP, USD, and EUR with automatic tax calculations for each market.</p>

<h2>Tips for Jewellery Buyers</h2>

<ol>
<li><strong>Always ask for the gold rate per gram</strong> — Don't accept a "per piece" price without knowing the weight and rate breakdown</li>
<li><strong>Compare making charges</strong> — This is where you can negotiate. Gold rate is fixed, making charges aren't.</li>
<li><strong>Check the weight on a certified scale</strong> — The shop should weigh the item in front of you</li>
<li><strong>Verify hallmark/HUID</strong> — Ensures purity is as claimed</li>
<li><strong>Keep your invoice</strong> — Essential for exchange, returns, and insurance claims</li>
</ol>

<h2>Tips for Jewellery Sellers</h2>

<ol>
<li><strong>Be transparent about pricing</strong> — Show the gold rate, weight, making charges, and taxes separately. Transparent pricing builds trust.</li>
<li><strong>Use software for accurate billing</strong> — Manual calculations lead to errors that cost you or the customer money</li>
<li><strong>Display today's rates prominently</strong> — In your shop and on your digital presence</li>
<li><strong>Standardise making charges</strong> — Have a clear making charge structure by product category</li>
</ol>

<p>Need help pricing your jewellery correctly? <a href="/jewellery-shop-billing-software">Orivraa's billing software</a> handles all these calculations automatically. <a href="/auth/register">Start free</a>.</p>
`,
  },
  /* ── Post: GST on Gold Jewellery in India ────────────────────────── */
  {
    slug: "how-to-calculate-gst-on-gold-jewellery-india",
    title: "How to Calculate GST on Gold Jewellery in India (2026 Guide)",
    description:
      "Step-by-step guide to GST on gold jewellery in India: 3% on gold value, 5% on making charges, HSN codes, invoice format, and how to bill correctly without losing margin.",
    date: "2026-04-10",
    updated: "2026-04-25",
    author: "Orivraa Team",
    authorRole: "Tax & Compliance",
    readTime: "8 min read",
    category: "Tax & Compliance",
    tags: [
      "GST on gold",
      "jewellery GST India",
      "making charges GST",
      "HSN code 7113",
      "jewellery billing",
    ],
    content: `
<p>Confused about how GST applies to your gold jewellery sales? You&rsquo;re not alone. The 3% + 5% split between gold value and making charges trips up jewellers every day — and getting it wrong means under-billing customers or over-paying tax.</p>

<p>This guide breaks down exactly how to calculate GST on gold jewellery in India in 2026, with worked examples and a downloadable invoice template.</p>

<h2>The two GST rates you need to know</h2>

<ul>
<li><strong>3% GST on the value of gold</strong> (HSN 7113) — applies to the metal portion of the bill</li>
<li><strong>5% GST on making charges</strong> — applies to labour and craftsmanship</li>
</ul>

<p>If you bundle these into a single line item, you risk being assessed at the higher rate by tax authorities. <strong>Always show gold value and making charges as separate lines on your invoice.</strong></p>

<h2>Worked example: 22K gold ring</h2>

<p>Let&rsquo;s say a customer buys a 22K gold ring weighing 8 grams.</p>

<table>
<tr><th>Item</th><th>Amount (&#8377;)</th></tr>
<tr><td>Gold rate (22K) per gram</td><td>5,800</td></tr>
<tr><td>Gold value (8 &times; 5,800)</td><td>46,400</td></tr>
<tr><td>Making charges (&#8377;500/gram &times; 8)</td><td>4,000</td></tr>
<tr><td>GST on gold (3% of 46,400)</td><td>1,392</td></tr>
<tr><td>GST on making (5% of 4,000)</td><td>200</td></tr>
<tr><td><strong>Total</strong></td><td><strong>52,992</strong></td></tr>
</table>

<p>If you instead applied 3% to the combined &#8377;50,400, you&rsquo;d charge &#8377;1,512 — saving the customer &#8377;80, but exposing yourself to a tax-audit reassessment at 5% on making charges retroactively.</p>

<h2>Old gold exchange — how GST works</h2>

<p>When a customer brings old gold in exchange:</p>

<ul>
<li>You only charge GST on the <em>net value</em> (new jewellery value minus old gold value)</li>
<li>Making charges GST (5%) still applies on the full making charge</li>
<li>You must record the old gold purchase separately for input credit purposes</li>
</ul>

<h2>Hallmark, HUID and invoice requirements</h2>

<p>From April 2023 onwards, every piece of jewellery 14K and above must carry a <strong>6-digit HUID (Hallmark Unique ID)</strong>. Your invoice must list:</p>

<ul>
<li>HUID number(s)</li>
<li>Net weight and gross weight</li>
<li>Purity (22K / 18K / 14K)</li>
<li>HSN code 7113</li>
<li>Gold value, making charges, and GST as separate lines</li>
<li>Buyer&rsquo;s GSTIN if it&rsquo;s a B2B sale above &#8377;50,000</li>
</ul>

<h2>Common mistakes to avoid</h2>

<ol>
<li><strong>Charging 3% on the whole bill</strong> — under-collects on making charges</li>
<li><strong>Charging 5% on the whole bill</strong> — over-charges customer on metal value</li>
<li><strong>Forgetting HUID</strong> — invoice can be rejected on audit</li>
<li><strong>Manual rate updates</strong> — yesterday&rsquo;s rate on today&rsquo;s sale costs you margin</li>
</ol>

<h2>Automate it</h2>

<p>Calculating GST manually for every sale is error-prone and slow. <a href="/jewellery-shop-billing-software">Orivraa&rsquo;s GST-ready billing</a> applies the correct rate to gold value and making charges automatically, prints HUID-compliant invoices, and pulls live gold rates so every bill is current. <a href="/auth/register">Start free</a> &mdash; no credit card required.</p>
`,
  },
  /* ── Post: Hallmarking compliance checklist ──────────────────────── */
  {
    slug: "hallmarking-compliance-checklist-jewellers-india",
    title: "Hallmarking Compliance Checklist for Indian Jewellers (2026)",
    description:
      "Complete BIS hallmarking compliance checklist for Indian jewellery shops. HUID requirements, registration steps, penalties, exempted categories, and how to stay audit-ready in 2026.",
    date: "2026-04-18",
    updated: "2026-04-28",
    author: "Orivraa Team",
    authorRole: "Tax & Compliance",
    readTime: "10 min read",
    category: "Tax & Compliance",
    tags: [
      "BIS hallmarking",
      "HUID",
      "jewellery compliance",
      "hallmarking rules India",
      "BIS registration",
    ],
    content: `
<p>BIS hallmarking has moved from &ldquo;recommended&rdquo; to <strong>mandatory</strong> for almost every jeweller in India. Selling unhallmarked gold jewellery (14K and above) can attract a fine of up to &#8377;1 lakh or one year imprisonment. Yet many shops are still operating with partial compliance.</p>

<p>Use this checklist to make sure your shop is fully compliant in 2026.</p>

<h2>1. BIS registration</h2>

<ul>
<li>Apply for BIS registration on the <a href="https://www.manakonline.in" rel="nofollow">manakonline.in</a> portal</li>
<li>Submit shop trade licence, GST certificate, PAN, and ID proof</li>
<li>Pay the applicable registration fee (currently &#8377;7,500 for 1 year, with discounts for 5/10-year plans)</li>
<li>Renew before expiry &mdash; lapsed registration means you cannot legally sell hallmarked jewellery</li>
</ul>

<h2>2. HUID compliance</h2>

<p>Every piece of gold jewellery you sell at 14K, 18K, 20K, 22K, 23K, or 24K purity <strong>must carry a 6-digit alphanumeric HUID</strong>. The HUID is printed on every BIS-tested piece by an Assaying &amp; Hallmarking Centre (AHC).</p>

<ul>
<li>Send all unhallmarked stock to a registered AHC</li>
<li>Pay the per-piece hallmarking fee (currently &#8377;45 + GST per article)</li>
<li>Receive the article back with laser-etched HUID and BIS mark</li>
<li>Record the HUID against the SKU in your inventory system</li>
</ul>

<h2>3. Invoice requirements</h2>

<p>Your invoice must clearly show:</p>

<ul>
<li>BIS hallmark logo</li>
<li>HUID number for each piece</li>
<li>Purity in karat (e.g., 22K916, 18K750)</li>
<li>Net weight in grams</li>
<li>HSN code 7113</li>
<li>GST split (3% gold, 5% making) &mdash; see our <a href="/blog/how-to-calculate-gst-on-gold-jewellery-india">GST guide</a></li>
</ul>

<h2>4. Display requirements at the shop</h2>

<ul>
<li>BIS registration certificate displayed visibly at the counter</li>
<li>List of hallmarked categories sold</li>
<li>Daily gold rate board (recommended for trust)</li>
<li>Customer-facing notice: &ldquo;All gold jewellery 14K and above is BIS-hallmarked with HUID&rdquo;</li>
</ul>

<h2>5. Exempted categories</h2>

<p>Hallmarking is <em>not</em> required for:</p>

<ul>
<li>Gold thread (zari), watches, fountain pens</li>
<li>Medical, dental, and scientific gold articles</li>
<li>Articles for export</li>
<li>Articles below &#8377;2 lakh per piece intended only for export display</li>
<li>Unfinished work-in-progress jewellery (must be hallmarked before sale)</li>
</ul>

<h2>6. Common compliance mistakes</h2>

<ol>
<li><strong>Hallmarked stock without HUID record in inventory</strong> &mdash; you can&rsquo;t prove provenance on audit</li>
<li><strong>Old (pre-HUID) hallmarked stock still on display</strong> &mdash; must be re-hallmarked</li>
<li><strong>Selling under-karat (e.g., 20K labelled as 22K)</strong> &mdash; severe penalties, possible criminal case</li>
<li><strong>Lapsed BIS registration</strong> &mdash; inadvertent selling becomes illegal overnight</li>
<li><strong>Not documenting karigar work returns</strong> &mdash; karigar receives 22K, returns 20K, and you sell it as 22K</li>
</ol>

<h2>7. Penalties for non-compliance</h2>

<ul>
<li>Sale of unhallmarked jewellery: fine up to &#8377;1,00,000 or 1-year imprisonment, or both</li>
<li>Misrepresentation of purity: fine of up to 5x the value of the article</li>
<li>Counterfeit BIS mark: criminal prosecution under Section 17 of the BIS Act</li>
</ul>

<h2>Stay compliant without manual tracking</h2>

<p>Tracking HUID against every SKU on paper is error-prone. <a href="/jewellery-inventory-software">Orivraa&rsquo;s inventory module</a> ties HUID to each piece, surfaces hallmarking expiry alerts, and prints fully BIS-compliant invoices with one click.</p>

<p><a href="/auth/register">Try Orivraa free</a> &mdash; or <a href="/compare/orivraa-vs-marg-erp">see how it compares to Marg ERP</a>.</p>
`,
  },
];

/* ────────────────────────────────────────────────────────────── */
/*  Helper                                                        */
/* ────────────────────────────────────────────────────────────── */

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const current = getBlogPost(currentSlug);
  if (!current)
    return BLOG_POSTS.filter((p) => p.slug !== currentSlug).slice(0, limit);

  // Score by shared tags
  return BLOG_POSTS.filter((p) => p.slug !== currentSlug)
    .map((p) => ({
      post: p,
      score: p.tags.filter((t) => current.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.post);
}
