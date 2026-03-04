import { BRAND } from "@/config/brand";

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

<p><strong>Pricing:</strong> Free plan available (₹0/month) · Pro from ₹999/month · Enterprise custom pricing</p>

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
<tr><td>Starter/Pro</td><td>₹749/month (Standard CRM)</td><td>₹999/month (unlimited products, AI)</td></tr>
<tr><td>Professional</td><td>₹1,299/month</td><td>Custom Enterprise pricing</td></tr>
<tr><td>Hidden Costs</td><td>Add-ons for inventory, chat, etc.</td><td>No hidden costs — all-inclusive</td></tr>
</tbody>
</table>

<p>While Zoho's starting price (₹749/mo) appears lower than Orivraa Pro (₹999/mo), Zoho's base plan doesn't include inventory management, which requires Zoho Inventory (additional ₹1,999/mo). For a jewellery shop needing CRM + inventory + invoicing, Zoho can cost ₹3,000–₹5,000/month when you add all the required modules.</p>

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
];

/* ────────────────────────────────────────────────────────────── */
/*  Helper                                                        */
/* ────────────────────────────────────────────────────────────── */

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRelatedPosts(
  currentSlug: string,
  limit = 3,
): BlogPost[] {
  const current = getBlogPost(currentSlug);
  if (!current) return BLOG_POSTS.filter((p) => p.slug !== currentSlug).slice(0, limit);

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
