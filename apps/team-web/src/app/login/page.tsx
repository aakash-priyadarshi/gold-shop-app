"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Login failed");
        return;
      }
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("employee", JSON.stringify(data.employee));
      router.push("/");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    if (!email.trim() || !password.trim() || !employeeCode.trim()) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/setup-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          setupToken: employeeCode.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Setup failed");
        return;
      }
      toast.success("Password set! You can now login.");
      setMode("login");
      setEmployeeCode("");
      setPassword("");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold-500 text-white font-bold text-xl">
              O
            </div>
          </div>
          <CardTitle>Orivraa Team Portal</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Internal team access only. Login with your employee credentials."
              : "First time? Set up your password using your employee code."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {mode === "setup" && (
            <div>
              <Label>Employee Code</Label>
              <Input
                type="text"
                placeholder="ORI-EMP-001"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your employee code was shared by your admin when you were onboarded.
              </p>
            </div>
          )}

          <div>
            <Label>Password</Label>
            <Input
              type="password"
              placeholder={mode === "setup" ? "Create a password (min 8 chars)" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (mode === "login" ? handleLogin() : handleSetup())
              }
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "login" ? (
            <>
              <Button className="w-full" onClick={handleLogin} disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                First time?{" "}
                <button
                  onClick={() => setMode("setup")}
                  className="text-gold-600 hover:text-gold-500 underline-offset-4 hover:underline"
                >
                  Set up your password
                </button>
              </p>
            </>
          ) : (
            <>
              <Button className="w-full" onClick={handleSetup} disabled={loading}>
                {loading ? "Setting up..." : "Set Password"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have a password?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-gold-600 hover:text-gold-500 underline-offset-4 hover:underline"
                >
                  Sign in
                </button>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
