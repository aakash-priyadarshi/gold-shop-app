"use client";

import { T } from "@/components/ui/T";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { Copy, KeyRound, Loader2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ShopOption {
  id: string;
  shopName: string;
  owner?: { email?: string };
}

interface SellerSmokeToken {
  id: string;
  tokenPrefix: string;
  expiresAt: string;
  lastUsedAt: string | null;
  isRevoked: boolean;
  shop: { id: string; name: string } | null;
  owner: { email: string; status: string };
}

const DURATIONS = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "180d", label: "180 days" },
  { value: "365d", label: "1 year" },
];

/**
 * Admin-only controls for the dedicated, read-only production seller canary.
 * This intentionally does not create seller AI integration keys.
 */
export function SellerSmokeTokenManager() {
  const { toast } = useToast();
  const t = useT();
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [tokens, setTokens] = useState<SellerSmokeToken[]>([]);
  const [shopId, setShopId] = useState("");
  const [duration, setDuration] = useState("365d");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [shopsResponse, tokensResponse] = await Promise.all([
        api.get("/shops?pageSize=100"),
        api.get("/auth/api-tokens/seller-smoke"),
      ]);
      setShops(shopsResponse.data?.shops ?? []);
      setTokens(tokensResponse.data ?? []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Could not load seller monitoring tokens"),
        description:
          error.response?.data?.message ??
          t("Please refresh and try again."),
      });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const createToken = async () => {
    if (!shopId) {
      toast({
        variant: "destructive",
        title: t("Select a test shop"),
        description: t("Choose the dedicated shopkeeper account for the production monitor."),
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data } = await api.post("/auth/api-tokens/seller-smoke", {
        shopId,
        duration,
      });
      setCreatedToken(data.token);
      toast({
        title: t("Seller smoke token created"),
        description: t("Copy it now and save it as SHOP_SMOKE_TOKEN in GitHub Actions."),
      });
      await load();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Could not create seller smoke token"),
        description:
          error.response?.data?.message ??
          t("Please choose an active shopkeeper account and try again."),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToken = async () => {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken);
      toast({
        title: t("Token copied"),
        description: t("Paste it into the SHOP_SMOKE_TOKEN GitHub Actions secret."),
      });
    } catch {
      toast({
        variant: "destructive",
        title: t("Could not copy token"),
        description: t("Copy the displayed value manually and keep it secret."),
      });
    }
  };

  const revokeToken = async (token: SellerSmokeToken) => {
    if (!window.confirm(t("Revoke this seller smoke token? GitHub monitoring will fail until you replace the secret."))) {
      return;
    }
    setRevokingId(token.id);
    try {
      await api.delete(`/auth/api-tokens/seller-smoke/${token.id}`);
      toast({
        title: t("Seller smoke token revoked"),
        description: t("The old credential can no longer access seller data."),
      });
      await load();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Could not revoke token"),
        description: error.response?.data?.message ?? t("Please try again."),
      });
    } finally {
      setRevokingId(null);
    }
  };

  const formatDate = (date: string | null) =>
    date
      ? new Date(date).toLocaleString()
      : t("Never used");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <T>Seller production monitor</T>
        </CardTitle>
        <CardDescription>
          <T>
            Create a revocable, shop-bound credential for the authenticated production canary. It can only make GET and HEAD requests; it cannot create sales, edit inventory, issue invoices, or process payments.
          </T>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {createdToken && (
          <Alert className="border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20">
            <KeyRound className="h-4 w-4" />
            <AlertTitle><T>Copy this token now</T></AlertTitle>
            <AlertDescription className="space-y-3">
              <p><T>It is shown once. Save it in the GitHub Actions secret named SHOP_SMOKE_TOKEN, not in source code or browser storage.</T></p>
              <div className="flex gap-2">
                <code className="min-w-0 flex-1 break-all rounded bg-background p-2 text-xs">
                  {createdToken}
                </code>
                <Button type="button" size="icon" variant="outline" onClick={copyToken} aria-label={t("Copy token")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="seller-smoke-shop"><T>Dedicated test shop</T></Label>
            <Select value={shopId} onValueChange={setShopId} disabled={isLoading || isCreating}>
              <SelectTrigger id="seller-smoke-shop">
                <SelectValue placeholder={t("Select a shop")} />
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.shopName}{shop.owner?.email ? ` — ${shop.owner.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seller-smoke-duration"><T>Expiry</T></Label>
            <Select value={duration} onValueChange={setDuration} disabled={isCreating}>
              <SelectTrigger id="seller-smoke-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={createToken} disabled={isCreating || isLoading || !shopId}>
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            <T>Create or rotate seller smoke token</T>
          </Button>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={isLoading || isCreating}>
            <RefreshCw className={"mr-2 h-4 w-4 " + (isLoading ? "animate-spin" : "")} />
            <T>Refresh</T>
          </Button>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium"><T>Issued seller smoke tokens</T></p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground"><T>Loading tokens…</T></p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground"><T>No seller smoke token has been created yet.</T></p>
          ) : (
            tokens.map((token) => (
              <div key={token.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 first:border-t-0 first:pt-0">
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{token.shop?.name ?? t("Deleted shop")}</p>
                  <p className="font-mono text-xs text-muted-foreground">{token.tokenPrefix}…</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Expires")}: {formatDate(token.expiresAt)} · {t("Last used")}: {formatDate(token.lastUsedAt)}
                  </p>
                </div>
                {token.isRevoked ? (
                  <Badge variant="secondary"><T>Revoked</T></Badge>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={() => void revokeToken(token)} disabled={revokingId === token.id}>
                    {revokingId === token.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                    <T>Revoke</T>
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
