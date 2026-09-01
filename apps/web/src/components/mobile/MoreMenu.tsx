"use client";

import { T } from "@/components/ui/T";
import { LanguageMegaMenu } from "@/components/i18n/LanguageMegaMenu";
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useHelpUIStore } from "@/store/help-ui";
import { usePreferencesStore } from "@/store/preferences";
import { ComputerDesktopIcon } from "@heroicons/react/24/outline";
import {
  BarChart2,
  Brain,
  Cake,
  ClipboardList,
  FileText,
  FlaskConical,
  Gem,
  Globe,
  HelpCircle,
  Image,
  LogOut,
  MessageCircle,
  Receipt,
  Scale,
  Send,
  Settings,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MoreMenuProps {
  /**
   * When provided the menu renders as a full-screen overlay with an X button
   * that calls this callback. When omitted the menu renders as a normal page
   * (with a back button) — used by the /m/more route so any link/bookmark to
   * /m/more resolves to a real page instead of a 404.
   */
  onClose?: () => void;
}

const sections = [
  {
    title: "Daily Operations",
    items: [
      { href: "/m/summary", icon: BarChart2, label: "Daily Summary" },
      { href: "/m/invoices", icon: Receipt, label: "Invoices" },
      { href: "/m/exchange", icon: Scale, label: "Old Gold Exchange" },
      { href: "/m/pending", icon: Wallet, label: "Pending Payments" },
      { href: "/m/repairs", icon: Wrench, label: "Repairs" },
      { href: "/m/stock", icon: ClipboardList, label: "Stock Ledger" },
    ],
  },
  {
    title: "Tools & Calculators",
    items: [
      { href: "/m/rate-card", icon: Image, label: "Rate Card" },
      {
        href: "/m/broadcast",
        icon: MessageCircle,
        label: "WhatsApp Broadcast",
      },
      { href: "/m/tax", icon: Receipt, label: "Tax Audit" },
      { href: "/m/purity", icon: FlaskConical, label: "Purity Calculator" },
      { href: "/m/ai-integration", icon: Brain, label: "AI Integrations" },
    ],
  },
  {
    title: "More",
    items: [
      { href: "/m/catalogue", icon: Send, label: "Catalogue Share" },
      { href: "/m/quotes", icon: Gem, label: "Walk-in Quotes" },
      { href: "/m/savings", icon: FileText, label: "Savings Schemes" },
      { href: "/m/occasions", icon: Cake, label: "Occasions" },
    ],
  },
];

export function MoreMenu({ onClose }: MoreMenuProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const {
    isChatDismissed,
    isTutorialDismissed,
    recallChat,
    recallTutorial,
    shakeChat,
    shakeTutorial,
  } = useHelpUIStore();
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);

  // In overlay mode we dismiss the overlay; in page mode there is nothing to
  // close, so navigation/closing falls back to going back.
  const dismiss = onClose ?? (() => router.back());
  const isOverlay = Boolean(onClose);

  return (
    <div
      className={
        isOverlay
          ? "fixed inset-0 z-40 bg-gray-50 dark:bg-gray-950 flex flex-col animate-in slide-in-from-bottom-2 duration-200"
          : "min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col"
      }
    >
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          <T>More Tools</T>
        </h2>
        <button
          onClick={dismiss}
          aria-label={isOverlay ? "Close" : "Back"}
          className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 active:bg-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {sections.map((sec) => (
          <div key={sec.title}>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
              <T>{sec.title}</T>
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {sec.items.map((item) => (
                <div
                  key={item.href}
                  onClick={() => {
                    onClose?.();
                    router.push(item.href);
                  }}
                  className="flex flex-col items-center text-center gap-2 cursor-pointer"
                >
                  <div className="h-14 w-14 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center active:scale-95 transition-transform">
                    <item.icon className="h-6 w-6 text-amber-600" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 leading-tight">
                    <T>{item.label}</T>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t dark:border-gray-800 border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
            <T>Help & Support</T>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                if (isChatDismissed) {
                  recallChat();
                } else {
                  shakeChat();
                }
                onClose?.();
              }}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:bg-gray-950 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  <T>AI Support Chat</T>
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  <T>
                    {isChatDismissed
                      ? "Touch to bring back"
                      : "Tap to shake & show"}
                  </T>
                </p>
              </div>
            </button>
            <button
              onClick={() => {
                if (isTutorialDismissed) {
                  recallTutorial();
                } else {
                  shakeTutorial();
                }
                onClose?.();
              }}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:bg-gray-950 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-600">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  <T>Tutorials</T>
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  <T>
                    {isTutorialDismissed
                      ? "Touch to bring back"
                      : "Tap to shake & show"}
                  </T>
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="pt-4 pb-8 space-y-3">
          <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
            <Globe className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <div className="flex-1">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                <T>Language</T>
              </span>
            </div>
            <LanguageMegaMenu
              value={language}
              onValueChange={setLanguage}
              variant="compact"
              align="end"
              triggerClassName="min-w-[7.5rem]"
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <AnimatedThemeToggle
                size={24}
                className="rounded-lg text-gray-600 dark:text-gray-400 -ml-1"
              />
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                <T>Theme</T>
              </span>
            </div>
          </div>

          <Link
            href="/m/settings"
            onClick={() => onClose?.()}
            className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:bg-gray-950"
          >
            <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              <T>Store Settings</T>
            </span>
          </Link>
          <Link
            href="/dashboard/shop"
            onClick={(e) => {
              e.preventDefault();
              onClose?.();
              const host = window.location.hostname.toLowerCase();
              const isOrivraaHost =
                host === "orivraa.com" || host.endsWith(".orivraa.com");
              const domain = isOrivraaHost ? "; domain=.orivraa.com" : "";
              const secure =
                window.location.protocol === "https:" ? "; Secure" : "";
              document.cookie = `orivraa_force_desktop=true; path=/${domain}; SameSite=Lax${secure}; max-age=604800`;

              let desktopUrl = `https://orivraa.com/dashboard/shop`;
              if (host.startsWith("m.")) {
                desktopUrl = `https://${host.substring(2)}/dashboard/shop`;
              } else if (host === "m") {
                desktopUrl = `https://orivraa.com/dashboard/shop`;
              } else if (host === "localhost" || host.endsWith(".localhost")) {
                desktopUrl = `http://${host.replace("m.", "")}/dashboard/shop`;
              }
              window.location.href = desktopUrl;
            }}
            className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:bg-gray-950"
          >
            <ComputerDesktopIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              <T>Desktop Dashboard</T>
            </span>
          </Link>
          <button
            onClick={async () => {
              onClose?.();
              await logout();
              router.push("/auth/login");
            }}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-red-50 text-red-600 active:bg-red-100"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-bold">
              <T>Sign out</T>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
