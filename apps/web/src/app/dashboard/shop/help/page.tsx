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

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/en";

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
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tutorial & Help</h1>
            <p className="text-muted-foreground">
              Watch the full walkthrough, jump to a chapter, or raise a support
              ticket — all from here.
            </p>
          </div>

          {/* Tutorial video card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-amber-500" />
                  Full Product Tutorial
                </CardTitle>
                <CardDescription className="mt-1">
                  Complete walkthrough of every Orivraa feature · 24 minutes
                </CardDescription>
              </div>
              <Badge variant="secondary">English</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video player */}
              <div
                className="relative w-full rounded-lg overflow-hidden bg-black"
                style={{ paddingTop: "56.25%" }}
              >
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  className="absolute inset-0 w-full h-full"
                  controls
                  preload="metadata"
                  poster="https://www.orivraa.com/og-image.png"
                  aria-label="Orivraa jewellery shop software complete tutorial"
                >
                  <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
                  Your browser does not support video. Please{" "}
                  <a
                    href={TUTORIAL_VIDEO_URL}
                    className="text-amber-500 underline"
                  >
                    download the tutorial
                  </a>
                  .
                </video>
              </div>

              <p className="text-xs text-muted-foreground">
                Tip: right-click the video and choose &quot;Picture in
                Picture&quot; to watch while you work in another tab.
              </p>
            </CardContent>
          </Card>

          {/* Chapter index */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-500" />
                Chapter Index
              </CardTitle>
              <CardDescription>
                Jump to any topic in the tutorial above
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CHAPTERS.map(({ time, label }) => (
                  <div
                    key={time}
                    className="flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm"
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="font-mono text-amber-600 dark:text-amber-400 w-12 shrink-0 tabular-nums">
                      {time}
                    </span>
                    <span className="text-foreground">{label}</span>
                  </div>
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
                Need more help?
              </CardTitle>
              <CardDescription>
                Our support team is available via chat or ticket. Use the
                floating chat bubble at the bottom-right of any page, or open a
                support ticket below.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link href="/dashboard/shop/support">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Open a support ticket
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={TUTORIAL_VIDEO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open video in new tab
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
