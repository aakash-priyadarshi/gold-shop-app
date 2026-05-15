"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Clock,
  ExternalLink,
  LifeBuoy,
  MessageSquare,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

const CDN_BASE = "https://images.orivraa.com";

/** Parse "M:SS" or "MM:SS" → seconds (same format used in the chapter list) */
function timeToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

const CHAPTERS: Record<"en" | "hi", { time: string; label: string }[]> = {
  en: [
    { time: "0:08",  label: "Introduction & overview" },
    { time: "1:12",  label: "Dashboard — live gold & silver prices" },
    { time: "3:24",  label: "Inventory management by weight & purity" },
    { time: "5:45",  label: "Point of Sale (POS) — create a sale" },
    { time: "7:30",  label: "GST invoice generation & printing" },
    { time: "9:00",  label: "Digital catalogue builder" },
    { time: "11:10", label: "Customer management & CRM" },
    { time: "13:20", label: "Karigar (artisan) job & account tracking" },
    { time: "15:40", label: "Tax engine — GST / VAT / CGST / SGST" },
    { time: "17:50", label: "Business reports & analytics" },
    { time: "19:30", label: "AI business insights" },
    { time: "21:30", label: "Mobile app & multi-branch support" },
    { time: "23:00", label: "Pricing plans & free trial" },
  ],
  hi: [
    { time: "0:08",  label: "परिचय और अवलोकन" },
    { time: "1:12",  label: "डैशबोर्ड — लाइव सोना और चांदी के भाव" },
    { time: "3:24",  label: "इन्वेंटरी प्रबंधन — वजन और शुद्धता के अनुसार" },
    { time: "5:45",  label: "पॉइंट ऑफ सेल (POS) — बिक्री करें" },
    { time: "7:30",  label: "GST इनवॉइस तैयार करें और प्रिंट करें" },
    { time: "9:00",  label: "डिजिटल कैटलॉग बिल्डर" },
    { time: "11:10", label: "ग्राहक प्रबंधन और CRM" },
    { time: "13:20", label: "कारीगर का काम और खाता ट्रैकिंग" },
    { time: "15:40", label: "टैक्स इंजन — GST / VAT / CGST / SGST" },
    { time: "17:50", label: "बिज़नेस रिपोर्ट और एनालिटिक्स" },
    { time: "19:30", label: "AI बिज़नेस इनसाइट्स" },
    { time: "21:30", label: "मोबाइल ऐप और मल्टी-ब्रांच सपोर्ट" },
    { time: "23:00", label: "प्राइसिंग प्लान और फ्री ट्रायल" },
  ],
};

export default function HelpPage() {
  const [lang, setLang] = useState<"en" | "hi">("hi");
  const videoRef = useRef<HTMLVideoElement>(null);

  const seekTo = useCallback((time: string) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = timeToSeconds(time);
    // Scroll video into view, then play
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.play().catch(() => {
      // Autoplay blocked by browser — user still sees the seeked position
    });
  }, []);

  const videoUrl = `${CDN_BASE}/tutorial/${lang}`;
  const chapters = CHAPTERS[lang];

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tutorial &amp; Help</h1>
              <p className="text-muted-foreground">
                Watch the full walkthrough, jump to a chapter, or raise a support
                ticket — all from here.
              </p>
            </div>
            {/* Language toggle */}
            <div className="flex gap-2 shrink-0">
              <Button
                variant={lang === "hi" ? "default" : "outline"}
                size="sm"
                onClick={() => setLang("hi")}
              >
                हिंदी
              </Button>
              <Button
                variant={lang === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setLang("en")}
              >
                English
              </Button>
            </div>
          </div>

          {/* Tutorial video card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-amber-500" />
                  {lang === "hi" ? "पूरा प्रोडक्ट ट्यूटोरियल" : "Full Product Tutorial"}
                </CardTitle>
                <CardDescription className="mt-1">
                  {lang === "hi"
                    ? "Orivraa की हर सुविधा का पूरा वॉकथ्रू · 23 मिनट"
                    : "Complete walkthrough of every Orivraa feature · 23 minutes"}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {lang === "hi" ? "हिंदी" : "English"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video player — key={lang} remounts when language switches,
                  ensuring the src change takes effect cleanly */}
              <div
                className="relative w-full rounded-lg overflow-hidden bg-black"
                style={{ paddingTop: "56.25%" }}
              >
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  key={lang}
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full"
                  controls
                  preload="metadata"
                  poster="https://www.orivraa.com/og-image.png"
                  aria-label={
                    lang === "hi"
                      ? "Orivraa ज्वेलरी शॉप सॉफ्टवेयर का पूरा ट्यूटोरियल"
                      : "Orivraa jewellery shop software complete tutorial"
                  }
                >
                  <source src={videoUrl} type="video/mp4" />
                  {lang === "hi" ? (
                    <>वीडियो चलाने में समस्या है? <a href={videoUrl} className="text-amber-500 underline">यहाँ डाउनलोड करें</a>.</>
                  ) : (
                    <>Your browser does not support video. <a href={videoUrl} className="text-amber-500 underline">Download the tutorial</a>.</>
                  )}
                </video>
              </div>

              <p className="text-xs text-muted-foreground">
                {lang === "hi"
                  ? "टिप: वीडियो पर राइट-क्लिक करें और 'Picture in Picture' चुनें ताकि काम करते हुए भी देख सकें।"
                  : "Tip: right-click the video and choose \"Picture in Picture\" to watch while you work in another tab."}
              </p>
            </CardContent>
          </Card>

          {/* Chapter index */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-500" />
                {lang === "hi" ? "चैप्टर इंडेक्स" : "Chapter Index"}
              </CardTitle>
              <CardDescription>
                {lang === "hi"
                  ? "किसी भी टॉपिक पर क्लिक करें — वीडियो उस पल पर चला जाएगा"
                  : "Click any chapter — the video will jump to that moment"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {chapters.map(({ time, label }) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => seekTo(time)}
                    className="flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm text-left
                               hover:bg-accent hover:border-amber-500/40 transition-colors cursor-pointer group"
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-mono text-amber-600 dark:text-amber-400 w-12 shrink-0 tabular-nums">
                      {time}
                    </span>
                    <span className="text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Help & support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-amber-500" />
                {lang === "hi" ? "और मदद चाहिए?" : "Need more help?"}
              </CardTitle>
              <CardDescription>
                {lang === "hi"
                  ? "हमारी सपोर्ट टीम चैट या टिकट के ज़रिए उपलब्ध है। किसी भी पेज के नीचे-दाईं तरफ चैट बब्बल है, या नीचे टिकट खोलें।"
                  : "Our support team is available via chat or ticket. Use the floating chat bubble at the bottom-right of any page, or open a support ticket below."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link href="/dashboard/shop/support">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {lang === "hi" ? "सपोर्ट टिकट खोलें" : "Open a support ticket"}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {lang === "hi" ? "वीडियो नए टैब में खोलें" : "Open video in new tab"}
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
