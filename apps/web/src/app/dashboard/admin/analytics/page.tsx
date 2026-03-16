"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Shield } from "lucide-react";

export default function AnalyticsPage() {
  // This is your official Umami Share URL using the Website ID you provided
  const UMAMI_URL = "https://umami-production-1a7e.up.railway.app/share/016b6603-4f42-4679-b8c6-26fe5f23b3ab";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Business Analytics</h1>
        <p className="text-muted-foreground">
          Real-time traffic and visitor insights powered by Umami.
        </p>
      </div>

      <Card className="border-gold/20 shadow-lg overflow-hidden flex flex-col min-h-[85vh]">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold" />
            <CardTitle className="text-lg">Analytics Dashboard</CardTitle>
          </div>
          <a
            href={UMAMI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-gold hover:underline"
          >
            Open in New Tab
            <ExternalLink className="h-4 w-4" />
          </a>
        </CardHeader>
        <CardContent className="flex-1 p-0 relative">
          {/* 
            Note: Umami might block embedding if the domain is different and X-Frame-Options is set.
            If the iframe remains blank, ensure Umami is configured to allow your admin domain 
            in its environment variables or settings.
          */}
          <iframe
            src={UMAMI_URL}
            className="w-full h-full border-none absolute inset-0 bg-white"
            title="Umami Analytics"
            allow="fullscreen"
          />
          
          <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
              <p>Loading analytics dashboard...</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Privacy First</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Umami analytics do not use cookies and do not collect any personally identifiable 
              information (PII). All visitor data is anonymized and stays 100% on your infrastructure.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Dashboard Access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Only users with Administrator access can see this page. This analytics dashboard 
              is embedded via a secure share token generated from your Umami settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
