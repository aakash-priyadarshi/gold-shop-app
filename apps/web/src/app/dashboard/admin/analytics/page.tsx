"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Business Analytics</h1>
        <p className="text-muted-foreground">
          Analytics dashboard is currently disabled.
        </p>
      </div>

      <Card className="border-gold/20 shadow-lg overflow-hidden flex flex-col min-h-[50vh]">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold" />
            <CardTitle className="text-lg">Analytics Update</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <Shield className="h-16 w-16 mb-4 text-gold/20" />
          <h2 className="text-xl font-semibold mb-2">Analytics Disabled</h2>
          <p className="max-w-md">
            The external analytics provider has been removed. We are migrating to a custom analytics 
            infrastructure to better serve our customers and maintain maximum data privacy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
