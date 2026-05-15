"use client";

import { ArrowRight, BookOpen, Clock, ExternalLink, PlayCircle } from "lucide-react";
import Link from "next/link";

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/en";
const SHORT_DEMO_URL = "https://images.orivraa.com/demo/en";

const CHAPTERS = [
  { time: "0:08", label: "Introduction & overview" },
  { time: "1:12", label: "Dashboard — live gold & silver prices" },
  { time: "3:24", label: "Inventory management by weight & purity" },
  { time: "5:45", label: "Point of Sale (POS) — create a sale" },
  { time: "7:30", label: "GST invoice generation & printing" },
  { time: "9:00", label: "Digital catalogue builder" },
  { time: "11:10", label: "Customer management & CRM" },
  { time: "13:20", label: "Karigar (artisan) job & account tracking" },
  { time: "15:40", label: "Tax engine — GST / VAT / CGST / SGST" },
  { time: "17:50", label: "Business reports & analytics" },
  { time: "19:30", label: "AI business insights" },
  { time: "21:30", label: "Mobile app & multi-branch support" },
  { time: "23:00", label: "Pricing plans & free trial" },
];

export default function HelpPage() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-amber-400" />
          Tutorial &amp; Help
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Watch the complete walkthrough of every Orivraa feature. Use the chapter
          index to jump to a specific topic.
        </p>
      </div>

      {/* Quick demo card */}
      <div className="bg-gray-900 rounded-xl border border-white/5 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-start gap-3">
          <PlayCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-white">
              In a hurry? See the 30-second visual demo.
            </div>
            <p className="text-xs text-gray-400 mt-1">
              A blink-and-miss tour of the dashboard, inventory, POS, billing, and
              analytics.
            </p>
          </div>
        </div>
        <a
          href={SHORT_DEMO_URL}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 font-medium shrink-0"
        >
          Watch 30s demo
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Full tutorial player */}
      <div>
        <div
          className="relative w-full rounded-xl overflow-hidden ring-1 ring-white/10 bg-black"
          style={{ paddingTop: "56.25%" }}
        >
          <video
            className="absolute inset-0 w-full h-full"
            controls
            preload="metadata"
            poster="https://www.orivraa.com/og-image.png"
            aria-label="Orivraa jewellery shop software complete tutorial"
          >
            <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
            Your browser does not support HTML5 video. Please{" "}
            <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">
              download the tutorial
            </a>
            .
          </video>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Full walkthrough · 24 minutes · English</span>
          <a
            href={TUTORIAL_VIDEO_URL}
            download="orivraa-tutorial-en.mp4"
            className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
          >
            Download <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Chapter index */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Jump to a chapter</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {CHAPTERS.map(({ time, label }) => (
            <div
              key={time}
              className="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-2.5 border border-white/5 text-sm"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono text-amber-400 w-12 shrink-0">{time}</span>
              <span className="text-gray-300">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Tip: Right-click the video and use &quot;Loop&quot; or &quot;Picture in
          Picture&quot; to watch while you work.
        </p>
      </div>

      {/* Need more help */}
      <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl border border-amber-500/20 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white mb-2">
          Still stuck on something?
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Our support chat is on every page (bottom-right corner) — ask in plain
          English or Hindi. For complex issues, raise a support ticket.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard/shop/support"
            className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Open support
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/tutorial"
            className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Open public tutorial page
          </Link>
        </div>
      </div>
    </div>
  );
}
