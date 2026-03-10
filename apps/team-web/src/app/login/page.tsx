"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [token, setToken] = useState("");

  const handleSubmit = () => {
    if (!token.trim()) return;
    localStorage.setItem("token", token.trim());
    window.location.href = "/";
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
          <CardTitle>Orivraa Team Ops</CardTitle>
          <CardDescription>
            Enter your authentication token from the main Orivraa app to access the team dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Auth Token</Label>
            <Input
              type="password"
              placeholder="Paste your JWT token from orivraa.com"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            You can find your token in the main Orivraa app under Profile → Developer → Copy Token.
            The same login session is shared between both apps.
          </p>
          <Button className="w-full" onClick={handleSubmit}>
            Access Team Dashboard
          </Button>
          <div className="text-center">
            <a
              href={process.env.NEXT_PUBLIC_MAIN_URL || "https://orivraa.com"}
              className="text-sm text-gold-600 hover:text-gold-500 underline-offset-4 hover:underline"
            >
              Go to main Orivraa app →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
