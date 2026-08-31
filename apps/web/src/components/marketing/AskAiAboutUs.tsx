"use client";

import { T } from "@/components/ui/T";
import { SITE_URL } from "@/config/site";
import {
  ASK_AI_PROVIDERS,
  getAskAiLinks,
  type AskAiProviderId,
} from "@/lib/ask-ai";
import { ArrowRight, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HeritageTrust } from "@/components/marketing/HeritageTrust";

type AskAiButtonsProps = {
  className?: string;
  size?: "sm" | "md";
};

function usePreferAppWindow() {
  const [preferApp, setPreferApp] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setPreferApp(mobileUa || coarse);
  }, []);

  return preferApp;
}

/**
 * Real <a href> buttons so Googlebot sees the destinations in HTML.
 * On phones, same-tab navigation lets ChatGPT/Claude/Gemini/Perplexity
 * Universal Links open the installed app; on desktop they open the website.
 */
export function AskAiProviderButtons({
  className = "",
  size = "md",
}: AskAiButtonsProps) {
  const preferApp = usePreferAppWindow();
  const links = useMemo(() => getAskAiLinks(SITE_URL), []);
  const padding = size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm";

  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
      data-tour="ask-ai-providers"
    >
      {links.map((provider) => (
        <a
          key={provider.id}
          href={provider.href}
          target={preferApp ? "_self" : "_blank"}
          rel="noopener noreferrer"
          aria-label={`${provider.shortLabel} about Orivraa jewellery business software`}
          className={`inline-flex items-center justify-center rounded-full font-semibold border shadow-sm active:scale-95 transition-all ${padding} ${provider.className}`}
        >
          <T>{provider.shortLabel}</T>
        </a>
      ))}
    </div>
  );
}

export function AskAiAboutUs({
  variant = "section",
}: {
  variant?: "section" | "footer";
}) {
  if (variant === "footer") {
    return (
      <div className="border-b border-gray-800 pb-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-400 mb-1">
              <T>Ask your AI about us</T>
            </p>
            <h2 className="text-lg font-bold text-white">
              <T>How is Orivraa for jewellery business software?</T>
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              <T>
                Opens ChatGPT, Claude, Gemini, or Perplexity with that question.
                On a phone this uses the app if it is installed; on a computer
                it opens the website.
              </T>
            </p>
          </div>
          <AskAiProviderButtons size="sm" />
        </div>
        <p className="mt-4 text-sm text-gray-400">
          <Link
            href="/ai-integration"
            className="text-gold-400 hover:text-gold-300 font-medium"
          >
            <T>Connect Claude or ChatGPT to your shop with a scoped seller key</T>
          </Link>
          {" · "}
          <Link href="/ask-ai" className="hover:text-gold-400">
            <T>Ask AI page</T>
          </Link>
        </p>
        <p className="mt-3 text-xs text-gray-500">
          <T>More than 10 years serving jewellery customers. Cloud software since</T>{" "}
          <time dateTime="2026-01">January 2026</time>.
        </p>
      </div>
    );
  }

  return (
    <section
      className="py-12 lg:py-16 bg-white dark:bg-gray-950 border-y border-gray-100 dark:border-gray-900"
      aria-labelledby="ask-ai-heading"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-50 dark:bg-gold-950/40 text-gold-800 dark:text-gold-300 text-xs font-semibold mb-3 border border-gold-200/60 dark:border-gold-800/50">
            <Sparkles className="h-3.5 w-3.5" />
            <T>Ask your AI about us</T>
          </div>
          <h2
            id="ask-ai-heading"
            className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white"
          >
            <T>How is Orivraa for jewellery business software?</T>
          </h2>
          <p className="mt-3 text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            <T>
              Pick ChatGPT, Claude, Gemini, or Perplexity. We send them that
              question plus links to our public product pages so you get an
              independent answer. On a phone the installed AI app opens; on a
              laptop or PC the website opens.
            </T>
          </p>
        </div>
        <div className="flex justify-center">
          <AskAiProviderButtons />
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link
            href="/ask-ai"
            className="text-amber-700 dark:text-amber-400 font-medium hover:underline"
          >
            <T>See how Ask AI works</T>
          </Link>
        </p>
      </div>
    </section>
  );
}

const SCOPES = [
  { key: "inventory:read", label: "Read stock, vault locations, and piece weights" },
  { key: "inventory:write", label: "Create or update catalogue items the key is allowed to touch" },
  { key: "orders:read", label: "Read orders and fulfilment status" },
  { key: "orders:write", label: "Draft order updates — money movement still needs confirmation" },
];

export function SellerAiIntegrationPromo({
  variant = "section",
}: {
  variant?: "section" | "card";
}) {
  if (variant === "card") {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              <T>Seller AI integration keys</T>
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <T>
                Create a key, choose inventory and order scopes, rotate or revoke
                it, and audit every AI write. MCP tools cannot take payment or
                issue a refund without your confirmation.
              </T>
            </p>
          </div>
        </div>
        <Link
          href="/ai-integration"
          className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-400 hover:underline"
        >
          <T>Read the seller AI spec</T>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <section
      className="py-12 lg:py-16 bg-gray-50 dark:bg-gray-900/40"
      aria-labelledby="seller-ai-heading"
    >
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-gray-950 text-gold-800 dark:text-gold-300 text-xs font-semibold mb-3 border border-gold-200/60 dark:border-gold-800/50">
              <KeyRound className="h-3.5 w-3.5" />
              <T>Shop MCP &amp; seller keys</T>
            </div>
            <h2
              id="seller-ai-heading"
              className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white"
            >
              <T>Let Claude or ChatGPT work in your shop — without handing over the till</T>
            </h2>
            <p className="mt-3 text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              <T>
                You create the seller AI key. You pick scopes such as
                inventory:read, inventory:write, orders:read, or orders:write.
                You can rotate or revoke it any time. Every AI write is
                audit-logged under your shop. The MCP server only exposes tools
                those scopes allow. Sales, payments, and refunds need an extra
                confirmation step — not an unrestricted write tool.
              </T>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/ai-integration"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-gold-500 text-white dark:text-navy-950 font-semibold text-sm hover:opacity-90"
              >
                <T>Seller AI integration</T>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                <T>Start free and create a key</T>
              </Link>
            </div>
          </div>
          <ul className="space-y-3">
            {SCOPES.map((scope) => (
              <li
                key={scope.key}
                className="flex gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4"
              >
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                    {scope.key}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    <T>{scope.label}</T>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Combined band for software landing pages — Ask AI + seller MCP. */
export function AiDiscoverySection() {
  return (
    <>
      <HeritageTrust variant="section" />
      <section
        className="py-14 lg:py-20 bg-gradient-to-br from-navy-950 via-gray-950 to-gray-900 text-white"
        aria-labelledby="ai-discovery-heading"
      >
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-400 mb-2">
              <T>Ask your AI about us</T>
            </p>
            <h2
              id="ai-discovery-heading"
              className="text-2xl lg:text-3xl font-bold"
            >
              <T>How is Orivraa for jewellery business software?</T>
            </h2>
            <p className="mt-3 text-sm lg:text-base text-gray-300 leading-relaxed">
              <T>
                Choose OpenAI ChatGPT, Anthropic Claude, Google Gemini, or
                Perplexity. The link carries that question plus our public
                product URLs. Phones open the AI app when it is installed;
                computers open the web app.
              </T>
            </p>
            <AskAiProviderButtons className="mt-6" />
            <p className="mt-4 text-sm text-gray-400">
              <Link href="/ask-ai" className="text-gold-400 hover:text-gold-300 font-medium">
                <T>Why these links help Google and shoppers</T>
              </Link>
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-400 mb-2">
              <T>New: seller AI keys &amp; MCP</T>
            </p>
            <h3 className="text-2xl lg:text-3xl font-bold">
              <T>Connect your shop to Claude, ChatGPT, or Gemini — scoped, logged, confirm-to-pay</T>
            </h3>
            <p className="mt-3 text-sm lg:text-base text-gray-300 leading-relaxed">
              <T>
                Create a seller AI integration key, choose inventory and order
                scopes, rotate or revoke it, and review an audit log of every AI
                write. MCP tools never run a sale, payment, or refund until you
                confirm.
              </T>
            </p>
            <ul className="mt-5 grid sm:grid-cols-2 gap-2 text-sm">
              {ASK_AI_PROVIDERS.map((provider) => (
                <li
                  key={provider.id as AskAiProviderId}
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-gray-200"
                >
                  {provider.name}
                </li>
              ))}
            </ul>
            <Link
              href="/ai-integration"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300"
            >
              <T>Seller AI integration details</T>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
