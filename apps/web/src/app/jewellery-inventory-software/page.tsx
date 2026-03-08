import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Database,
  Layers,
  Scale,
  Search,
  Tag,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Orivraa — Jewellery Inventory Software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Windows, macOS, Android, iOS",
      description:
        "Cloud-based jewellery inventory management software. Track gold, silver, diamond, and gemstone inventory by weight, purity, and category with automatic stock alerts.",
      url: "https://www.orivraa.com/jewellery-inventory-software",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free plan available. Pro from $12.99/month.",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "320",
        bestRating: "5",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does jewellery inventory software differ from regular inventory management?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Jewellery inventory must track weight (grams, tola), purity (24K, 22K, 18K), stone weights, making charges, and HUID numbers. Regular inventory software only tracks quantity and price — it cannot handle the unique attributes of precious metals and gemstones.",
          },
        },
        {
          "@type": "Question",
          name: "Can Orivraa track inventory across multiple locations?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa Enterprise supports multi-branch inventory with centralised stock visibility, inter-branch transfers, and location-specific reports.",
          },
        },
        {
          "@type": "Question",
          name: "Does Orivraa support bulk inventory upload?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Upload your inventory via CSV or Excel files. Map your columns to Orivraa fields including weight, purity, category, making charges, and images.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: Scale,
    title: "Weight & Purity Tracking",
    desc: "Track every item by gross weight, net weight, purity (24K, 22K, 18K, 14K gold; 925/999 silver), stone weight, and making charges. Never lose track of even a milligram.",
  },
  {
    icon: Layers,
    title: "Category & Tag Management",
    desc: "Organise inventory by metal type, category (necklace, ring, bangle), occasion, style, and custom tags. Filter and search across thousands of items instantly.",
  },
  {
    icon: AlertTriangle,
    title: "Low-Stock Alerts",
    desc: "Set minimum stock levels for categories. Get automatic notifications when inventory drops below thresholds — never miss a restocking opportunity.",
  },
  {
    icon: Tag,
    title: "Barcode & HUID Labels",
    desc: "Generate and print barcode labels for every product. Store HUID (Hallmark Unique Identification) numbers for compliance and instant lookup during billing.",
  },
  {
    icon: Upload,
    title: "Bulk Upload & Import",
    desc: "Import your entire inventory from CSV/Excel files. Map columns to Orivraa fields for weight, purity, price, images, and category in minutes.",
  },
  {
    icon: Users,
    title: "Karigar (Artisan) Management",
    desc: "Track gold/silver allotted to karigars, received items, wastage, and pending work. Know exactly how much material is with each artisan at any time.",
  },
  {
    icon: Database,
    title: "Real-Time Stock Valuation",
    desc: "See the total value of your inventory based on current metal rates. Break down by metal type, purity, category, or branch for precise financial tracking.",
  },
  {
    icon: Search,
    title: "Advanced Search & Filters",
    desc: "Find any item instantly by name, barcode, HUID, weight range, purity, category, or price range. Powerful filters for large inventories.",
  },
  {
    icon: BarChart3,
    title: "Inventory Reports & Analytics",
    desc: "Ageing reports, fast/slow moving items, stock turnover, dead stock identification, and inventory valuation reports for smarter purchasing decisions.",
  },
];

const INVENTORY_TYPES = [
  {
    icon: "🥇",
    title: "Gold Inventory",
    desc: "Track 24K, 22K, 18K, and 14K gold items by weight in grams or tola. Manage both finished jewellery and raw gold stock.",
  },
  {
    icon: "🥈",
    title: "Silver Inventory",
    desc: "Track 925 Sterling and 999 Fine silver items. Manage silverware, jewellery, and bulk silver stock with weight-based tracking.",
  },
  {
    icon: "💎",
    title: "Diamond & Gemstone",
    desc: "Track diamonds by carat, clarity, colour, and cut. Manage loose stones and set jewellery with detailed gemstone specifications.",
  },
  {
    icon: "🪙",
    title: "Platinum & Other Metals",
    desc: "Support for platinum, palladium, and other precious metals. Track by weight and purity with custom attributes.",
  },
];

export default function JewelleryInventorySoftwarePage() {
  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-white dark:bg-gray-950">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-16 lg:py-24">
          <div className="container mx-auto px-4 max-w-6xl text-center">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-amber-700 dark:text-gold-400 mb-4">
              Inventory Management
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
              Jewellery Inventory Software{" "}
              <span className="text-amber-600 dark:text-gold-400">
                — Track Every Gram, Every Karat
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              Stop using spreadsheets to track gold. Orivraa's inventory
              management tracks your{" "}
              <strong>
                gold, silver, diamond, and gemstone inventory by weight, purity,
                and category
              </strong>{" "}
              with automatic stock alerts, bulk upload, and real-time valuation.
              Trusted by <strong>2,000+ jewellers</strong>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-base transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                Start Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-base hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ───────────────────────────────────── */}
        <section className="bg-gray-900 py-6">
          <div className="container mx-auto px-4 max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { n: "50,000+", l: "Products Tracked" },
              { n: "99.9%", l: "Inventory Accuracy" },
              { n: "6", l: "Weight Units Supported" },
              { n: "5", l: "Purity Grades Tracked" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl lg:text-3xl font-bold text-gold-400">
                  {s.n}
                </div>
                <div className="text-sm text-gray-400 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why Jewellery Inventory Is Different ─────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
              Why Spreadsheets and Generic Software Fail for Jewellery Inventory
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
              <p>
                Jewellery inventory isn't about counting units on a shelf. A
                single gold necklace has attributes that most software can't
                handle:{" "}
                <strong>
                  gross weight, net weight (after stones), gold purity, stone
                  weight, stone type, making charges per gram, HUID number,
                  hallmark certification
                </strong>
                , and more.
              </p>
              <p>
                Using a spreadsheet or generic inventory app means you're
                constantly creating workarounds — extra columns, manual
                calculations, no automated alerts. One misplaced decimal and
                your inventory valuation is off by lakhs.
              </p>
              <p>
                Orivraa was built from day one for jewellery businesses. Every
                field, every calculation, every report is designed around how{" "}
                <strong>gold, silver, and diamond inventory</strong> actually
                works. Whether you're a single-store retailer or a multi-branch
                wholesaler, your inventory stays accurate down to the milligram.
              </p>
            </div>
          </div>
        </section>

        {/* ── Inventory Types ─────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              Track Every Type of Jewellery Inventory
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {INVENTORY_TYPES.map((t) => (
                <div
                  key={t.title}
                  className="flex gap-4 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                >
                  <span className="text-3xl shrink-0">{t.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                      {t.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Core Features ───────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              Powerful Inventory Features for Jewellers
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12">
              From weight tracking to stock valuation — everything you need to
              manage precious inventory.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
                >
                  <f.icon className="h-8 w-8 text-amber-600 dark:text-gold-400 mb-3" />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "How does jewellery inventory software track weight and purity?",
                  a: "Each product record in Orivraa stores gross weight, net weight (minus stones), metal purity (e.g., 22K gold = 91.6% pure), stone weight, and stone details. Inventory reports automatically group by metal type and purity for accurate stock valuation.",
                },
                {
                  q: "Can I import existing inventory from a spreadsheet?",
                  a: "Yes. Orivraa supports CSV and Excel bulk upload. Map your spreadsheet columns (name, weight, purity, price, images, etc.) to Orivraa fields and import hundreds of products in minutes.",
                },
                {
                  q: "What weight units are supported?",
                  a: "Orivraa supports grams, kilograms, tola (used in Nepal/India), laal (Nepal), ounce, and pound. The system automatically converts between units when needed.",
                },
                {
                  q: "How does karigar (artisan) tracking work?",
                  a: "Issue gold/silver to karigars with weight and purity records. When the artisan returns finished pieces, record the returned weight, finished items, and wastage. Orivraa calculates the remaining balance automatically.",
                },
                {
                  q: "Can I track inventory across multiple store branches?",
                  a: "Yes. Orivraa Enterprise supports multi-branch inventory with centralised visibility, inter-branch transfers, and location-specific stock reports.",
                },
                {
                  q: "How does real-time valuation work?",
                  a: "Orivraa calculates your total inventory value by multiplying the weight of each item by its purity and the current market rate for that metal. You can see a breakdown by metal type, purity, category, or branch at any time.",
                },
                {
                  q: "Is there an audit trail for inventory changes?",
                  a: "Yes. Every inventory action (add, edit, delete, transfer, sale) is logged with timestamps and user details. This helps with compliance, loss prevention, and accountability.",
                },
              ].map((faq) => (
                <details
                  key={faq.q}
                  className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-750">
                    {faq.q}
                    <ArrowRight className="h-4 w-4 text-gray-400 group-open:rotate-90 transition-transform shrink-0 ml-4" />
                  </summary>
                  <p className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gradient-to-r from-amber-600 to-yellow-500 text-white">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              Take Control of Your Jewellery Inventory
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              Stop guessing. Track every gram, every karat, every piece with
              cloud-based inventory software. Free to start.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-white text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-all shadow-lg flex items-center gap-2"
              >
                Start Free Today <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/jewellery-shop-software"
                className="px-8 py-3 border-2 border-white/50 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                Full Feature List
              </Link>
            </div>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </>
  );
}
