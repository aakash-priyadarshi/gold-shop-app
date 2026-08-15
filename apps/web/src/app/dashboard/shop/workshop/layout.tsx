"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FeatureGate } from "@/components/FeatureGate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import Link from "next/link";

export default function WorkshopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { hasFeature, planName, loading } = useFeatures();

  return (
    <ShopGuard>
      <DashboardLayout>
        <FeatureGate
          feature="workshopManufacturing"
          featureLabel="Workshop manufacturing (factory floor)"
          hasFeature={hasFeature}
          planName={planName}
          loading={loading}
        >
          {user?.shop?.workshopMode ? (
            children
          ) : (
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>
                  <T>Workshop mode is off</T>
                </CardTitle>
                <CardDescription>
                  <T>
                    Turn on Workshop mode in Settings to replace Supply Chain
                    with the factory floor (tower, jobs, departments, metal,
                    QC). This setting is not on the karigar page.
                  </T>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/dashboard/shop/settings?tab=preferences">
                    <T>Open shop settings</T>
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </FeatureGate>
      </DashboardLayout>
    </ShopGuard>
  );
}
