"use client";

/**
 * Today's Occasions — Birthday & Anniversary Reminders
 *
 * Jewelry shops are relationship businesses. This page surfaces:
 *   - Customers with birthdays today / this week
 *   - Customers with anniversaries today / this week
 *   - One-tap WhatsApp greeting with the customer's name pre-filled
 *
 * Data comes from customerCrmApi. The backend profile contains
 * `dateOfBirth` and `anniversaryDate` fields.
 */

import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { MobileSkeletonList } from "@/components/mobile/MobileSkeleton";
import { T } from "@/components/ui/T";
import { useHaptics } from "@/hooks/useHaptics";
import { customerCrmApi } from "@/lib/api";
import {
  Cake,
  Gift,
  Heart,
  MessageCircle,
  Phone,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  anniversaryDate?: string;
}

interface OccasionEntry {
  customer: Customer;
  type: "birthday" | "anniversary";
  daysAway: number; // 0 = today, 1 = tomorrow, …
}

function dayOfYear(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  // Compare month-day only (ignore year)
  const candidate = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = candidate.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function todayDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr: string): number {
  const today = todayDayOfYear();
  let target = dayOfYear(dateStr);
  if (target < today) target += 365; // next year
  return target - today;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
}

function customerName(c: Customer): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Customer";
}

function WhatsAppGreeting({
  entry,
  shopName,
}: {
  entry: OccasionEntry;
  shopName?: string;
}) {
  const name = customerName(entry.customer);
  const isToday = entry.daysAway === 0;

  const msgBirthday = isToday
    ? `🎂 Happy Birthday ${name}! 🎉\n\nWishing you a wonderful day! As a valued customer of ${shopName ?? "our shop"}, we have a special gift idea for you. Come visit us today! 💛`
    : `🎂 ${name}'s birthday is in ${entry.daysAway} days — great time to send a special offer!`;

  const msgAnniversary = isToday
    ? `💍 Happy Anniversary ${name}! 🎉\n\nCelebrate your special day with something timeless. Visit ${shopName ?? "us"} for exclusive anniversary jewellery. 💛`
    : `💍 ${name}'s anniversary is in ${entry.daysAway} days — perfect time to suggest a gift!`;

  const msg = entry.type === "birthday" ? msgBirthday : msgAnniversary;
  const url = entry.customer.phone
    ? `https://wa.me/${entry.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      <T>WhatsApp</T>
    </a>
  );
}

function OccasionCard({ entry, shopName }: { entry: OccasionEntry; shopName?: string }) {
  const name = customerName(entry.customer);
  const isToday = entry.daysAway === 0;
  const isTomorrow = entry.daysAway === 1;

  return (
    <div
      className={`bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 ${
        isToday ? "border-amber-300 shadow-sm" : "border-gray-100"
      }`}
    >
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          entry.type === "birthday" ? "bg-pink-50 text-pink-500" : "bg-rose-50 text-rose-500"
        }`}
      >
        {entry.type === "birthday" ? <Cake className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
          {isToday && (
            <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 font-bold uppercase tracking-wide">Today</span>
          )}
          {isTomorrow && (
            <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-bold uppercase tracking-wide">Tomorrow</span>
          )}
        </div>
        <p className="text-xs text-gray-400">
          {entry.type === "birthday" ? "Birthday" : "Anniversary"} ·{" "}
          {isToday
            ? "Today!"
            : isTomorrow
            ? "Tomorrow"
            : `in ${entry.daysAway} days`}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <WhatsAppGreeting entry={entry} shopName={shopName} />
        {entry.customer.phone && (
          <a
            href={`tel:${entry.customer.phone}`}
            className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function OccasionsPage() {
  const haptic = useHaptics();

  const [occasions, setOccasions] = useState<OccasionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const shopName = "Orivraa"; // replaced by auth below if needed

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all customers (paginated — first 200 is enough for a shop)
      const res = await customerCrmApi.search({ limit: 200 });
      const customers: Customer[] = res.data?.customers ?? res.data?.data ?? res.data ?? [];

      const entries: OccasionEntry[] = [];

      for (const c of customers) {
        if (c.dateOfBirth) {
          const days = daysUntil(c.dateOfBirth);
          if (days <= 7) entries.push({ customer: c, type: "birthday", daysAway: days });
        }
        if (c.anniversaryDate) {
          const days = daysUntil(c.anniversaryDate);
          if (days <= 7) entries.push({ customer: c, type: "anniversary", daysAway: days });
        }
      }

      // Sort: today first, then soonest
      entries.sort((a, b) => a.daysAway - b.daysAway);
      setOccasions(entries);
    } catch {
      setOccasions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = occasions.filter((o) => o.daysAway === 0);
  const upcoming = occasions.filter((o) => o.daysAway > 0);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900"><T>Occasions</T></h1>
          <p className="text-xs text-gray-400">
            {loading ? <T>Loading…</T> : `${today.length} today · ${upcoming.length} this week`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <MobileHelpButton
            title="Birthday & Anniversary Reminders"
            description="Know which customers are celebrating today or this week — greet them and drive footfall."
            tips={[
              "Tap 'WhatsApp' to send a pre-written personalised greeting",
              "Tap the phone icon to call the customer directly",
              "Add dates to customer profiles in the Customers section",
              "Reach out 2-3 days before with a special offer to win the sale",
            ]}
          />
          <button
            onClick={() => { haptic("light"); load(); }}
            disabled={loading}
            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <MobileSkeletonList count={5} />
        ) : (
          <>
            {today.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-500" />
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wide"><T>Today</T></p>
                </div>
                {today.map((o, i) => (
                  <OccasionCard key={i} entry={o} shopName={shopName} />
                ))}
              </div>
            )}

            {upcoming.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide"><T>This Week</T></p>
                {upcoming.map((o, i) => (
                  <OccasionCard key={i} entry={o} shopName={shopName} />
                ))}
              </div>
            )}

            {occasions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <Cake className="h-10 w-10" />
                <p className="text-sm text-center">
                  <T>No upcoming birthdays or anniversaries this week.</T>
                </p>
                <p className="text-xs text-center text-gray-300">
                  <T>Add birthday/anniversary dates to customer profiles to see reminders here.</T>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
