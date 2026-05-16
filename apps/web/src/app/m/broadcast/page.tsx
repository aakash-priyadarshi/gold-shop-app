"use client";

/**
 * WhatsApp Rate Broadcast — one-tap morning routine.
 *
 * Every morning, gold shop owners need to send today's rates to their
 * customer broadcast list / WhatsApp Channel. This page composes a
 * branded, emoji-rich message and opens WhatsApp instantly.
 *
 * No backend needed — reads live rate from materialsApi + shop name from auth.
 */

import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useHaptics } from "@/hooks/useHaptics";
import { materialsApi } from "@/lib/api";
import {
  Check,
  Copy,
  Edit3,
  MessageCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface GoldRate {
  rate24k: number;
  rate22k: number;
  rate18k: number;
  silver: number;
  currency: string;
}

const TEMPLATES = [
  { id: "formal", label: "Professional" },
  { id: "friendly", label: "Friendly" },
  { id: "compact", label: "Quick/Short" },
] as const;

type Template = (typeof TEMPLATES)[number]["id"];

function buildMessage(
  template: Template,
  rates: GoldRate,
  shopName: string,
  extra: string,
): string {
  const date = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const cur = rates.currency;
  const r24 = rates.rate24k.toLocaleString();
  const r22 = rates.rate22k.toLocaleString();
  const r18 = rates.rate18k.toLocaleString();
  const rs = rates.silver.toLocaleString();

  if (template === "formal") {
    return [
      `📅 *Gold Rates — ${date}*`,
      ``,
      `🏪 *${shopName}*`,
      ``,
      `🥇 24K (Pure Gold) · ${cur} ${r24}/gram`,
      `🥈 22K (916 Hallmark) · ${cur} ${r22}/gram`,
      `🏅 18K · ${cur} ${r18}/gram`,
      `🪙 Silver · ${cur} ${rs}/gram`,
      ``,
      extra ? `📌 ${extra}\n` : ``,
      `✅ All rates include applicable taxes.`,
      `📞 Contact us to book today's rate.`,
      ``,
      `_— ${shopName}_`,
    ]
      .filter((l) => l !== undefined)
      .join("\n");
  }

  if (template === "friendly") {
    return [
      `Good morning! ☀️`,
      ``,
      `Here are today's gold rates at *${shopName}* 💛`,
      ``,
      `✨ 24K → ${cur} ${r24}/g`,
      `💍 22K → ${cur} ${r22}/g`,
      `💎 18K → ${cur} ${r18}/g`,
      `🥈 Silver → ${cur} ${rs}/g`,
      ``,
      extra ? `🔔 ${extra}\n` : ``,
      `DM us or walk in — we're open today! 🛍️`,
    ]
      .filter((l) => l !== undefined)
      .join("\n");
  }

  // compact
  return [
    `📊 *${shopName} — Rates ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}*`,
    `24K: ${cur} ${r24} | 22K: ${cur} ${r22} | 18K: ${cur} ${r18} | Ag: ${cur} ${rs}`,
    extra ? `📌 ${extra}` : ``,
    `_Rates per gram_`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function BroadcastPage() {
  const { user } = useAuth();
  const haptic = useHaptics();

  const shopName = user?.shop?.shopName ?? "Our Gold Shop";

  const [rates, setRates] = useState<GoldRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<Template>("friendly");
  const [extra, setExtra] = useState("");
  const [editingExtra, setEditingExtra] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await materialsApi.getCurrentRates();
      const r = res.data;
      setRates({
        rate24k: r.rate24k ?? r.goldRate24k ?? 9500,
        rate22k: r.rate22k ?? r.goldRate22k ?? 8750,
        rate18k: r.rate18k ?? r.goldRate18k ?? 7100,
        silver: r.silver ?? r.silverRate ?? 115,
        currency: r.currency ?? "NPR",
      });
    } catch {
      setRates({ rate24k: 9500, rate22k: 8750, rate18k: 7100, silver: 115, currency: "NPR" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const message = rates ? buildMessage(template, rates, shopName, extra) : "";

  const openWhatsApp = () => {
    if (!message) return;
    haptic("success");
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noreferrer");
  };

  const copyMessage = () => {
    if (!message) return;
    haptic("light");
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900"><T>Rate Broadcast</T></h1>
          <p className="text-xs text-gray-400"><T>Send today's rates on WhatsApp</T></p>
        </div>
        <div className="flex items-center gap-1">
          <MobileHelpButton
            title="WhatsApp Rate Broadcast"
            description="Compose and send today's gold rates to your WhatsApp broadcast list or channel in one tap."
            tips={[
              "Choose a message style (Friendly / Professional / Short)",
              "Add a custom note — a promotion, a market observation, a festival offer",
              "Tap 'Send on WhatsApp' — WhatsApp opens with the message pre-filled",
              "Paste into your Broadcast List or Channel and send",
              "Schedule this every morning to keep customers engaged",
            ]}
          />
          <button
            onClick={() => { haptic("light"); loadRates(); }}
            disabled={loading}
            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Template picker */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            <T>Message Style</T>
          </p>
          <div className="flex gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => { haptic("light"); setTemplate(t.id); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  template === t.id
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                <T>{t.label}</T>
              </button>
            ))}
          </div>
        </div>

        {/* Custom note */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <T>Add a Note</T> <span className="text-gray-300 normal-case">(optional)</span>
            </p>
            <button
              onClick={() => setEditingExtra((v) => !v)}
              className="flex items-center gap-1 text-xs text-amber-600"
            >
              <Edit3 className="h-3.5 w-3.5" />
              {editingExtra ? <T>Done</T> : <T>Edit</T>}
            </button>
          </div>
          {editingExtra ? (
            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="e.g. 'Festival offer: free making on chains today!'"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          ) : extra ? (
            <p
              onClick={() => setEditingExtra(true)}
              className="text-sm text-gray-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100"
            >
              {extra}
            </p>
          ) : (
            <button
              onClick={() => setEditingExtra(true)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-xs"
            >
              + <T>Tap to add a promotion or note</T>
            </button>
          )}
        </div>

        {/* Message preview */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            <T>Message Preview</T>
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            {loading ? (
              <p className="text-sm text-gray-400 animate-pulse"><T>Loading rates…</T></p>
            ) : (
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {message}
              </pre>
            )}
          </div>
        </div>

        <div className="h-4" />
      </div>

      {/* Action bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-4 space-y-3">
        <button
          onClick={openWhatsApp}
          disabled={loading || !message}
          className="w-full h-12 rounded-2xl bg-green-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <MessageCircle className="h-5 w-5" />
          <T>Send on WhatsApp</T>
          <Send className="h-4 w-4 opacity-70" />
        </button>
        <button
          onClick={copyMessage}
          disabled={loading || !message}
          className="w-full h-10 rounded-2xl bg-gray-100 text-gray-700 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied ? <T>Copied to clipboard!</T> : <T>Copy message</T>}
        </button>
      </div>
    </div>
  );
}
