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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import {
  Bot,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type SellerAiKey = {
  id: string;
  keyName: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
};

type SellerAiAction = {
  id: string;
  keyPrefix: string;
  toolName: string;
  actionType: string;
  summary: string;
  status:
    | "PENDING"
    | "PROCESSING"
    | "CONFIRMED"
    | "REJECTED"
    | "EXPIRED"
    | "FAILED";
  expiresAt: string;
  createdAt: string;
};

const SCOPES = [
  {
    value: "inventory:read",
    label: "Read inventory",
    description: "Search stock, SKU, weight, price, and availability.",
  },
  {
    value: "inventory:write",
    label: "Propose inventory edits",
    description:
      "Draft price, description, label, or stock changes for your approval.",
  },
  {
    value: "orders:read",
    label: "Read orders",
    description: "List orders without exposing customer email or phone.",
  },
  {
    value: "orders:write",
    label: "Propose order status edits",
    description: "Draft a non-financial status update for your approval.",
  },
] as const;

const DURATIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
];

function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL || "https://api.orivraa.com/api"
  ).replace(/\/+$/, "");
}

function formatDate(date: string | null, neverText: string) {
  return date ? new Date(date).toLocaleString() : neverText;
}

function actionTone(status: SellerAiAction["status"]) {
  if (status === "CONFIRMED")
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (status === "PENDING" || status === "PROCESSING")
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

export function SellerAiIntegrationPanel() {
  const { toast } = useToast();
  const t = useT();
  const [keys, setKeys] = useState<SellerAiKey[]>([]);
  const [actions, setActions] = useState<SellerAiAction[]>([]);
  const [name, setName] = useState("Claude shop assistant");
  const [scopes, setScopes] = useState<string[]>(["inventory:read"]);
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const mcpUrl = useMemo(() => `${apiBaseUrl()}/seller-ai/mcp`, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [keysResponse, actionsResponse] = await Promise.all([
        api.get("/seller-ai/keys"),
        api.get("/seller-ai/actions"),
      ]);
      setKeys(keysResponse.data ?? []);
      setActions(actionsResponse.data ?? []);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : t("Please refresh and try again.");
      toast({
        variant: "destructive",
        title: t("Could not load AI integrations"),
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleScope = (scope: string, checked: boolean | string) => {
    setScopes((current) =>
      checked === true
        ? [...new Set([...current, scope])]
        : current.filter((value) => value !== scope),
    );
  };

  const createKey = async () => {
    if (scopes.length === 0) {
      toast({
        variant: "destructive",
        title: t("Choose at least one permission"),
        description: t("Start with read-only access whenever possible."),
      });
      return;
    }
    setIsCreating(true);
    try {
      const { data } = await api.post("/seller-ai/keys", {
        name,
        scopes,
        expiresInDays: Number(expiresInDays),
      });
      setCreatedKey(data.rawKey);
      toast({
        title: t("Seller AI key created"),
        description: t(
          "Copy it now. For your protection it is shown only once.",
        ),
      });
      await load();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Could not create seller AI key"),
        description:
          error?.response?.data?.message ??
          t("Please review the details and try again."),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copy = async (value: string, copiedLabel: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: t("Copied"), description: t(copiedLabel) });
    } catch {
      toast({
        variant: "destructive",
        title: t("Could not copy"),
        description: t("Copy the value manually and keep it private."),
      });
    }
  };

  const revoke = async (key: SellerAiKey) => {
    if (
      !window.confirm(
        t(
          "Revoke this AI key? Any connected assistant will lose access immediately.",
        ),
      )
    )
      return;
    setRevokingId(key.id);
    try {
      await api.delete(`/seller-ai/keys/${key.id}`);
      toast({
        title: t("Seller AI key revoked"),
        description: t("This key can no longer access your shop."),
      });
      await load();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Could not revoke seller AI key"),
        description: error?.response?.data?.message ?? t("Please try again."),
      });
    } finally {
      setRevokingId(null);
    }
  };

  const resolveAction = async (
    action: SellerAiAction,
    operation: "confirm" | "reject",
  ) => {
    const confirmText =
      operation === "confirm"
        ? t("Apply this AI request? This will change your shop data.")
        : t("Reject this AI request?");
    if (!window.confirm(confirmText)) return;
    setBusyActionId(action.id);
    try {
      await api.post(`/seller-ai/actions/${action.id}/${operation}`);
      toast({
        title:
          operation === "confirm"
            ? t("AI request applied")
            : t("AI request rejected"),
        description:
          operation === "confirm"
            ? t("The approved change is recorded in your audit history.")
            : t("No shop data was changed."),
      });
      await load();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Could not update AI request"),
        description:
          error?.response?.data?.message ?? t("Please refresh and try again."),
      });
    } finally {
      setBusyActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 dark:border-amber-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-amber-600" />
            <T>Connect your AI assistant</T>
          </CardTitle>
          <CardDescription>
            <T>
              Create a shop-specific key for Claude, ChatGPT developer tools, or
              another MCP client. Keys are scoped and revocable. AI writes
              always wait for your dashboard confirmation.
            </T>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="seller-ai-key-name">
                <T>Key name</T>
              </Label>
              <Input
                id="seller-ai-key-name"
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-ai-key-expiry">
                <T>Expires after</T>
              </Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger id="seller-ai-key-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((duration) => (
                    <SelectItem key={duration.value} value={duration.value}>
                      <T>{duration.label}</T>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              <T>Permissions</T>
            </legend>
            <div className="grid gap-3 md:grid-cols-2">
              {SCOPES.map((scope) => (
                <label
                  key={scope.value}
                  className="flex gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3 cursor-pointer"
                >
                  <Checkbox
                    checked={scopes.includes(scope.value)}
                    onCheckedChange={(checked) =>
                      toggleScope(scope.value, checked)
                    }
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      <T>{scope.label}</T>
                    </span>
                    <span className="block mt-1 text-xs text-muted-foreground">
                      <T>{scope.description}</T>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Button
            onClick={createKey}
            disabled={isCreating || name.trim().length < 3}
          >
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            <T>Create seller AI key</T>
          </Button>
        </CardContent>
      </Card>

      {createdKey && (
        <Alert className="border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>
            <T>Copy this key now</T>
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              <T>
                It is shown once and cannot be recovered. Treat it like a
                password; never paste it into public chat or source code.
              </T>
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={createdKey}
                aria-label={t("Seller AI key")}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                onClick={() => void copy(createdKey, "Seller AI key copied")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <T>Connect an MCP client</T>
          </CardTitle>
          <CardDescription>
            <T>
              Use the streamable HTTP endpoint and the key above as a Bearer
              token. Keep write-tool approvals enabled in your AI client.
            </T>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-lg bg-muted p-3 font-mono break-all">
            {mcpUrl}
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2">
            <p className="font-medium">
              <T>Claude Code</T>
            </p>
            <code className="block overflow-x-auto rounded bg-muted p-3 text-xs">
              claude mcp add --transport http orivraa {mcpUrl} --header
              "Authorization: Bearer YOUR_SELLER_AI_KEY"
            </code>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2">
            <p className="font-medium">
              <T>ChatGPT developer tools / Responses API</T>
            </p>
            <code className="block overflow-x-auto rounded bg-muted p-3 text-xs">{`{ "type": "mcp", "server_label": "orivraa", "server_url": "${mcpUrl}", "headers": { "Authorization": "Bearer YOUR_SELLER_AI_KEY" }, "require_approval": "always" }`}</code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>
              <T>Active seller AI keys</T>
            </CardTitle>
            <CardDescription>
              <T>
                Revoke any key immediately if a device, account, or prompt is no
                longer trusted.
              </T>
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void load()}
            disabled={isLoading}
            aria-label={t("Refresh")}
          >
            <RefreshCw
              className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isLoading && keys.length === 0 && (
            <p className="text-sm text-muted-foreground">
              <T>No seller AI keys yet.</T>
            </p>
          )}
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">
                  {key.keyName}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {key.keyPrefix}…
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <T>Expires</T>: {formatDate(key.expiresAt, t("Never"))} ·{" "}
                  <T>Last used</T>: {formatDate(key.lastUsedAt, t("Never"))}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {key.scopes.map((scope) => (
                    <Badge
                      key={scope}
                      variant="secondary"
                      className="font-mono text-[10px]"
                    >
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void revoke(key)}
                disabled={revokingId === key.id}
              >
                {revokingId === key.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                <T>Revoke</T>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <T>AI write approvals and audit trail</T>
          </CardTitle>
          <CardDescription>
            <T>
              Read tools work immediately. Every supported write stays here
              until you approve or reject it; sales, payments, refunds, and
              deletions are not MCP tools.
            </T>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isLoading && actions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              <T>No AI write requests yet.</T>
            </p>
          )}
          {actions.map((action) => (
            <div
              key={action.id}
              className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={actionTone(action.status)}>
                    {action.status}
                  </Badge>
                  <span className="font-medium">{action.summary}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <T>Requested by key</T> {action.keyPrefix}… ·{" "}
                  {new Date(action.createdAt).toLocaleString()}
                </p>
              </div>
              {action.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void resolveAction(action, "confirm")}
                    disabled={busyActionId === action.id}
                  >
                    {busyActionId === action.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    <T>Approve</T>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void resolveAction(action, "reject")}
                    disabled={busyActionId === action.id}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    <T>Reject</T>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
