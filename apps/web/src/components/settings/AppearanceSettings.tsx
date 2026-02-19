"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const THEME_OPTIONS = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    description: "Classic light appearance",
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
    description: "Easy on the eyes",
  },
  {
    value: "system",
    label: "System",
    icon: Monitor,
    description: "Match device settings",
  },
] as const;

export function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleThemeChange = (value: string) => {
    setTheme(value);
    // Persist to server if authenticated
    (window as any).__saveThemeToServer?.(value);
  };

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="h-5 w-5 text-gold-500" />
            Appearance
          </CardTitle>
          <CardDescription>
            Choose your preferred theme. Your selection is saved to your
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {resolvedTheme === "dark" ? (
            <Moon className="h-5 w-5 text-gold-400" />
          ) : (
            <Sun className="h-5 w-5 text-gold-500" />
          )}
          Appearance
        </CardTitle>
        <CardDescription>
          Choose your preferred theme. Your selection is saved to your account
          and will apply on every device you sign in to.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleThemeChange(option.value)}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
                  "hover:border-gold-400 hover:shadow-md",
                  isActive
                    ? "border-gold-500 bg-gold-50 dark:bg-gold-950/30 shadow-sm ring-1 ring-gold-500/20"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161B22]",
                )}
              >
                {/* Preview swatch */}
                <div
                  className={cn(
                    "w-full h-10 rounded-lg mb-1 flex items-center justify-center gap-1.5 text-xs font-medium",
                    option.value === "light" &&
                      "bg-white border border-gray-200 text-gray-700",
                    option.value === "dark" &&
                      "bg-[#0B0C10] border border-gray-700 text-gray-300",
                    option.value === "system" &&
                      "bg-gradient-to-r from-white to-[#0B0C10] border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-sm font-medium",
                    isActive
                      ? "text-gold-700 dark:text-gold-300"
                      : "text-gray-700 dark:text-gray-300",
                  )}
                >
                  {option.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-gold-500" />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
