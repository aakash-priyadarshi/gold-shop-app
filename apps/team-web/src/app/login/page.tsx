"use client";

import { Turnstile } from "@/components/auth/turnstile";
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
import { ALLOWED_ROLES } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const MAIN_API =
  process.env.NEXT_PUBLIC_MAIN_API_URL || "http://localhost:4000";
const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL || "http://localhost:3000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${MAIN_API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Login failed");
        return;
      }

      // Check role — only employees can access
      const payload = JSON.parse(atob(data.accessToken.split(".")[1]));
      if (!ALLOWED_ROLES.includes(payload.role)) {
        toast.error(
          "Access denied. Only ADMIN, SUPPORT, and SALES roles can access the team portal.",
        );
        return;
      }

      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      router.push("/");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to main API's Google OAuth with state preserving team context
    const state = btoa(
      JSON.stringify({ role: "ADMIN", mode: "login", source: "team" }),
    );
    window.location.href = `${MAIN_API}/api/auth/google?state=${state}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gold-500 text-white font-bold text-2xl shadow-lg">
              O
            </div>
          </div>
          <CardTitle className="text-2xl">Orivraa Team Portal</CardTitle>
          <CardDescription>
            Internal access only — ADMIN, SUPPORT &amp; SALES team members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google OAuth */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleLogin}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                or sign in with email
              </span>
            </div>
          </div>

          {/* Email + Password */}
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="you@orivraa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoComplete="current-password"
            />
          </div>

          {/* Cloudflare Turnstile CAPTCHA */}
          <Turnstile
            onVerify={handleTurnstileVerify}
            onExpire={() => setTurnstileToken(null)}
            className="flex justify-center"
          />

          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Only Orivraa team members (Admin, Support, Sales) can sign in.
            <br />
            Shopkeepers and customers — use{" "}
            <a
              href={MAIN_URL}
              className="text-gold-600 hover:text-gold-500 underline-offset-4 hover:underline"
            >
              orivraa.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
