"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { testingApi } from "@/lib/api";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Key,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/* ── Types ──────────────────────────────────────────────── */

interface GitHubTokenStatus {
  configured: boolean;
  tokenName: string | null;
  tokenPrefix: string | null;
  expiresAt: string | null;
  registeredAt: string | null;
  lastValidatedAt: string | null;
  isValid: boolean;
  isExpired: boolean;
  daysUntilExpiry: number | null;
  expiryWarning: "critical" | "warning" | "notice" | null;
  envVarPresent: boolean;
}

interface ValidationResult {
  valid: boolean;
  scopes: string[];
  rateLimit: { remaining: number; limit: number; reset: string };
  user: string;
  message?: string;
}

const EXPIRY_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
  { value: "custom", label: "Custom date" },
];

/* ── Component ──────────────────────────────────────────── */

export function GitHubTokenManager() {
  const { toast } = useToast();

  // State
  const [tokenStatus, setTokenStatus] = useState<GitHubTokenStatus | null>(
    null,
  );
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  // Form state
  const [tokenName, setTokenName] = useState("GitHub PAT");
  const [tokenPrefix, setTokenPrefix] = useState("");
  const [expiryDuration, setExpiryDuration] = useState("90");
  const [customDate, setCustomDate] = useState("");

  // ── Data loading ─────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await testingApi.getGitHubTokenStatus();
      setTokenStatus(data);

      // Show toast if token is expiring soon (only once per session)
      if (data.expiryWarning === "critical" && data.daysUntilExpiry !== null) {
        toast({
          variant: "destructive",
          title: "⚠️ GitHub Token Expiring!",
          description: data.isExpired
            ? "Your GitHub token has EXPIRED. CI/CD will stop working. Generate a new token immediately."
            : `Your GitHub token expires in ${data.daysUntilExpiry} day${data.daysUntilExpiry === 1 ? "" : "s"}. Generate a new token soon.`,
        });
      } else if (
        data.expiryWarning === "warning" &&
        data.daysUntilExpiry !== null
      ) {
        toast({
          title: "GitHub Token Expiring Soon",
          description: `Your GitHub token expires in ${data.daysUntilExpiry} days. Plan to rotate it.`,
        });
      }
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ── Handlers ─────────────────────────────────────────

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const { data } = await testingApi.validateGitHubToken();
      setValidation(data);
      if (data.valid) {
        toast({
          title: "Token Valid",
          description: `Authenticated as @${data.user}. Scopes: ${data.scopes.join(", ") || "none (fine-grained PAT)"}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Token Invalid",
          description:
            data.message || "The token failed validation against GitHub API.",
        });
      }
      // Refresh status after validation
      fetchStatus();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description:
          error.response?.data?.message || "Could not validate token.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      let expiresAt: string;
      if (expiryDuration === "custom") {
        if (!customDate) {
          toast({
            variant: "destructive",
            title: "Missing Date",
            description: "Please select an expiry date.",
          });
          setIsRegistering(false);
          return;
        }
        expiresAt = new Date(customDate).toISOString();
      } else {
        const days = Number(expiryDuration);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const { data } = await testingApi.registerGitHubToken({
        tokenName,
        tokenPrefix: tokenPrefix || "ghp_****",
        expiresAt,
      });

      setTokenStatus(data);
      setShowRegisterForm(false);
      toast({
        title: "Token Registered",
        description: `Tracking expiry for "${tokenName}". You'll be alerted before it expires.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description:
          error.response?.data?.message || "Could not register token.",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Remove the stored token expiry tracking? This won't delete the actual GITHUB_TOKEN env var.",
      )
    ) {
      return;
    }
    try {
      await testingApi.deleteGitHubTokenConfig();
      setTokenStatus(null);
      setValidation(null);
      fetchStatus();
      toast({
        title: "Token Config Removed",
        description:
          "Expiry tracking removed. The GITHUB_TOKEN env var is unchanged.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description:
          error.response?.data?.message || "Could not remove token config.",
      });
    }
  };

  // ── Helpers ──────────────────────────────────────────

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const expiryColor = (
    warning: "critical" | "warning" | "notice" | null,
    isExpired: boolean,
  ) => {
    if (isExpired) return "text-red-600 bg-red-50 border-red-200";
    if (warning === "critical") return "text-red-600 bg-red-50 border-red-200";
    if (warning === "warning")
      return "text-amber-600 bg-amber-50 border-amber-200";
    if (warning === "notice")
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const expiryIcon = (
    warning: "critical" | "warning" | "notice" | null,
    isExpired: boolean,
  ) => {
    if (isExpired || warning === "critical")
      return <ShieldAlert className="h-5 w-5 text-red-500" />;
    if (warning === "warning")
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    if (warning === "notice")
      return <Clock className="h-5 w-5 text-yellow-500" />;
    return <ShieldCheck className="h-5 w-5 text-green-500" />;
  };

  // ── Loading state ────────────────────────────────────

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading token status...
          </span>
        </CardContent>
      </Card>
    );
  }

  // ── Render ───────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Token Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">GitHub Token</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleValidate}
                disabled={isValidating}
              >
                {isValidating ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Shield className="mr-1 h-3 w-3" />
                )}
                Validate
              </Button>
              {tokenStatus?.tokenName ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowRegisterForm(!showRegisterForm)}
                >
                  Register Token
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Track your GitHub PAT expiry and get alerts before it expires
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Expiry Warning Banner */}
          {tokenStatus?.expiryWarning && (
            <div
              className={`flex items-start gap-3 rounded-lg border p-3 ${expiryColor(tokenStatus.expiryWarning, tokenStatus.isExpired)}`}
            >
              {expiryIcon(tokenStatus.expiryWarning, tokenStatus.isExpired)}
              <div>
                <p className="text-sm font-medium">
                  {tokenStatus.isExpired
                    ? "Token Expired!"
                    : tokenStatus.expiryWarning === "critical"
                      ? "Token Expiring Very Soon!"
                      : tokenStatus.expiryWarning === "warning"
                        ? "Token Expiring Soon"
                        : "Token Expiring in ~30 Days"}
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  {tokenStatus.isExpired
                    ? "Your GitHub token has expired. CI/CD integration will not work. Generate a new token immediately."
                    : `${tokenStatus.daysUntilExpiry} day${tokenStatus.daysUntilExpiry === 1 ? "" : "s"} remaining. ${
                        tokenStatus.expiryWarning === "critical"
                          ? "Generate a replacement token now!"
                          : "Plan to rotate it before it expires."
                      }`}
                </p>
                <a
                  href="https://github.com/settings/tokens?type=beta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs mt-1 underline hover:opacity-80"
                >
                  Generate new token
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* Token Info Grid */}
          {tokenStatus?.tokenName ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{tokenStatus.tokenName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Token</p>
                <code className="text-sm rounded bg-muted px-1.5 py-0.5">
                  {tokenStatus.tokenPrefix}...
                </code>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Expires</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">
                    {tokenStatus.expiresAt
                      ? formatDate(tokenStatus.expiresAt)
                      : "Unknown"}
                  </p>
                  {tokenStatus.daysUntilExpiry !== null && (
                    <Badge
                      variant="outline"
                      className={
                        tokenStatus.isExpired
                          ? "text-red-600 border-red-300"
                          : tokenStatus.daysUntilExpiry <= 14
                            ? "text-amber-600 border-amber-300"
                            : "text-green-600 border-green-300"
                      }
                    >
                      {tokenStatus.isExpired
                        ? "Expired"
                        : `${tokenStatus.daysUntilExpiry}d`}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Registered</p>
                <p className="text-sm">
                  {tokenStatus.registeredAt
                    ? formatDate(tokenStatus.registeredAt)
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Last Validated</p>
                <p className="text-sm">
                  {tokenStatus.lastValidatedAt
                    ? formatDate(tokenStatus.lastValidatedAt)
                    : "Never"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="flex items-center gap-1.5">
                  {tokenStatus.isValid ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-sm text-green-600">Valid</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-sm text-red-600">Invalid</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Key className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No Token Registered</p>
              <p className="text-xs mt-1">
                {tokenStatus?.envVarPresent
                  ? "GITHUB_TOKEN env var is set but not tracked. Register it to enable expiry alerts."
                  : "No GITHUB_TOKEN found. Add it to your Railway environment variables."}
              </p>
            </div>
          )}

          {/* Validation Result */}
          {validation && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Last Validation
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {validation.valid ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span>{validation.valid ? "Authenticated" : "Failed"}</span>
                  </div>
                  {validation.user && (
                    <div>
                      User:{" "}
                      <span className="font-medium">@{validation.user}</span>
                    </div>
                  )}
                  {validation.scopes.length > 0 && (
                    <div className="col-span-2">
                      Scopes:{" "}
                      {validation.scopes.map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="text-[10px] mr-1"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div>
                    Rate limit: {validation.rateLimit.remaining}/
                    {validation.rateLimit.limit}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Env Var Status */}
          <Separator />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">GITHUB_TOKEN env var:</span>
            {tokenStatus?.envVarPresent ? (
              <Badge
                variant="outline"
                className="text-green-600 border-green-300"
              >
                <CheckCircle className="mr-1 h-3 w-3" /> Set
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-300">
                <XCircle className="mr-1 h-3 w-3" /> Not Set
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Register Token Form */}
      {showRegisterForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Register GitHub Token</CardTitle>
            <CardDescription>
              Register your GitHub PAT metadata to track its expiry. The actual
              token is stored in the GITHUB_TOKEN env var on Railway.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gh-token-name">Token Name</Label>
                <Input
                  id="gh-token-name"
                  placeholder="e.g., GitHub CI PAT"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gh-token-prefix">
                  Token Prefix (first 8 chars)
                </Label>
                <Input
                  id="gh-token-prefix"
                  placeholder="e.g., ghp_Ab12"
                  value={tokenPrefix}
                  onChange={(e) => setTokenPrefix(e.target.value)}
                  maxLength={12}
                />
              </div>
            </div>

            <div
              className={`grid gap-4 ${expiryDuration === "custom" ? "grid-cols-2" : "grid-cols-1"}`}
            >
              <div className="space-y-2">
                <Label>Expiry Duration</Label>
                <Select
                  value={expiryDuration}
                  onValueChange={setExpiryDuration}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {expiryDuration === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="gh-token-date">Expiry Date</Label>
                  <Input
                    id="gh-token-date"
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              )}
            </div>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-3">
                <p className="text-xs text-blue-800 font-medium mb-1 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Reminder
                </p>
                <p className="text-xs text-blue-700">
                  After creating the token on GitHub, add it as{" "}
                  <code className="rounded bg-blue-100 px-1">GITHUB_TOKEN</code>{" "}
                  in your{" "}
                  <a
                    href="https://railway.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Railway
                  </a>{" "}
                  environment variables and redeploy.
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                onClick={handleRegister}
                disabled={isRegistering || !tokenName}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Token"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRegisterForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <a
          href="https://github.com/settings/personal-access-tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          Generate token <ExternalLink className="h-3 w-3" />
        </a>
        <span>•</span>
        <Link
          href="/dashboard/admin/testing/github-token-guide"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          Setup guide →
        </Link>
        <span>•</span>
        <a
          href="https://github.com/aakash-priyadarshi/gold-shop-app/settings/secrets/actions"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          Repo secrets <ExternalLink className="h-3 w-3" />
        </a>
        <span>•</span>
        <button
          onClick={() => fetchStatus()}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>
    </div>
  );
}
