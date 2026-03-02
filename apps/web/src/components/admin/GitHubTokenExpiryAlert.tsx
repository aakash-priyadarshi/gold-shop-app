"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { testingApi } from "@/lib/api";
import { AlertTriangle, ExternalLink, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TokenAlert {
  daysUntilExpiry: number | null;
  isExpired: boolean;
  tokenName: string | null;
  expiryWarning: "critical" | "warning" | "notice" | null;
}

/**
 * Lightweight banner that appears on any admin page when the GitHub token
 * is expiring soon or has expired. Full management UI is on the Testing dashboard.
 */
export function GitHubTokenExpiryAlert() {
  const [alert, setAlert] = useState<TokenAlert | null>(null);

  useEffect(() => {
    testingApi
      .getGitHubTokenStatus()
      .then(({ data }) => {
        if (
          data.expiryWarning === "critical" ||
          data.expiryWarning === "warning"
        ) {
          setAlert({
            daysUntilExpiry: data.daysUntilExpiry,
            isExpired: data.isExpired,
            tokenName: data.tokenName,
            expiryWarning: data.expiryWarning,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!alert) return null;

  const isCritical = alert.isExpired || alert.expiryWarning === "critical";

  return (
    <Card
      className={`border ${isCritical ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}`}
    >
      <CardContent className="flex items-center justify-between py-3 px-4">
        <div className="flex items-center gap-3">
          {isCritical ? (
            <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          )}
          <div>
            <p
              className={`text-sm font-medium ${isCritical ? "text-red-800" : "text-amber-800"}`}
            >
              {alert.isExpired
                ? "GitHub Token Expired!"
                : `GitHub Token Expires in ${alert.daysUntilExpiry} Day${alert.daysUntilExpiry === 1 ? "" : "s"}`}
            </p>
            <p
              className={`text-xs ${isCritical ? "text-red-600" : "text-amber-600"}`}
            >
              {alert.isExpired
                ? "CI/CD integration will not work. Generate a new token immediately."
                : "Rotate the token before it expires to avoid CI/CD disruptions."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/dashboard/admin/testing">
            <Badge
              variant="outline"
              className={`cursor-pointer ${isCritical ? "text-red-700 border-red-400 hover:bg-red-100" : "text-amber-700 border-amber-400 hover:bg-amber-100"}`}
            >
              Manage Token →
            </Badge>
          </Link>
          <a
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Badge
              variant="outline"
              className={`cursor-pointer ${isCritical ? "text-red-700 border-red-400 hover:bg-red-100" : "text-amber-700 border-amber-400 hover:bg-amber-100"}`}
            >
              New Token <ExternalLink className="ml-1 h-3 w-3" />
            </Badge>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
