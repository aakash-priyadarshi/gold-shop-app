"use client";

/**
 * Lightweight skeleton shimmer placeholders for the mobile POS.
 * Use these instead of plain spinners while async data is loading.
 */

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

function Shimmer({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-gray-200/70",
        "after:absolute after:inset-0 after:-translate-x-full",
        "after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent",
        className,
      )}
    />
  );
}

export function MobileSkeletonRow({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center gap-3 py-3", className)}>
      <Shimmer className="h-10 w-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-3 w-2/3" />
        <Shimmer className="h-3 w-1/3" />
      </div>
      <Shimmer className="h-6 w-12 rounded-md" />
    </div>
  );
}

export function MobileSkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-2xl border border-gray-100 bg-white p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-6 w-16 rounded-full" />
      </div>
      <Shimmer className="h-3 w-full" />
      <Shimmer className="h-3 w-5/6" />
      <Shimmer className="h-9 w-full rounded-xl" />
    </div>
  );
}

export function MobileSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, i) => (
        <MobileSkeletonRow key={i} />
      ))}
    </div>
  );
}

export function MobileSkeletonHeader() {
  return (
    <div className="space-y-2 py-3">
      <Shimmer className="h-5 w-1/2" />
      <Shimmer className="h-3 w-3/4" />
    </div>
  );
}

/**
 * Full-screen branded loading state — replaces the plain spinner shown by
 * MobileLayout while auth resolves. Keeps the brand identity visible.
 */
export function MobileLayoutLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6">
      <div className="relative">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-200">
          <span className="text-white font-bold text-xl">O</span>
        </div>
        <div className="absolute -inset-2 rounded-3xl border-2 border-amber-300/40 animate-ping" />
      </div>
      <p className="mt-6 text-sm font-medium text-gray-700">Orivraa POS</p>
      <p className="mt-1 text-xs text-gray-400">Preparing your shop…</p>
    </div>
  );
}
