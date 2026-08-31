import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import {
  AskAiProviderButtons,
  SellerAiIntegrationPromo,
} from "@/components/marketing/AskAiAboutUs";
import { T } from "@/components/ui/T";
import { ASK_AI_QUESTION } from "@/lib/ask-ai";
import { ArrowRight, Smartphone, Monitor } from "lucide-react";
import Link from "next/link";

export default function AskAiPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main>
        <section className="py-16 lg:py-24 bg-gradient-to-b from-amber-50 to-white dark:from-gray-900 dark:to-gray-950">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-3">
              <T>Ask your AI about us</T>
            </p>
            <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
              <T>{ASK_AI_QUESTION}</T>
            </h1>
            <p className="mt-5 text-base lg:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              <T>
                Google and shoppers can read this page. The buttons below are
                ordinary links, so search bots see ChatGPT, Claude, Gemini, and
                Perplexity as ways to evaluate Orivraa jewellery shop software.
                We pre-fill the question and point the assistant at our public
                product pages, including llms.txt.
              </T>
            </p>
            <div className="mt-8 flex justify-center">
              <AskAiProviderButtons />
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-amber-600" />
                <T>Phone: opens the AI app when installed</T>
              </span>
              <span className="inline-flex items-center gap-2">
                <Monitor className="h-4 w-4 text-amber-600" />
                <T>Computer: opens ChatGPT, Claude, Gemini, or Perplexity on the web</T>
              </span>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-gray-100 dark:border-gray-900">
          <div className="container mx-auto px-4 max-w-3xl space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              <T>Why jewellers use this instead of a branded chatbot only</T>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              <T>
                Orivraa already has a free in-app assistant. Ask AI is different:
                you use the model you already trust. The link asks how Orivraa
                compares as jewellery business software — billing, live gold
                rates, wastage, GST/VAT, mobile POS, and whether it fits a
                family shop or a multi-branch showroom.
              </T>
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              <T>
                The prompt includes https://www.orivraa.com/llms.txt and the
                jewellery shop software page so search-enabled assistants can
                fetch current facts instead of relying on old training data.
              </T>
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400">
              <li>
                <T>ChatGPT (OpenAI) — uses web search hint when the account allows it</T>
              </li>
              <li>
                <T>Claude (Anthropic) — opens a new chat with the question filled in</T>
              </li>
              <li>
                <T>Gemini (Google) — opens Gemini with the same prompt</T>
              </li>
              <li>
                <T>Perplexity — runs a sourced search on the same question</T>
              </li>
            </ul>
            <p>
              <Link
                href="/jewellery-shop-software"
                className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                <T>Read the full jewellery shop software overview</T>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </p>
          </div>
        </section>

        <SellerAiIntegrationPromo />

        <section className="py-16 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              <T>Frequently asked questions</T>
            </h2>
            <div className="space-y-4">
              <details className="rounded-xl border border-gray-200 dark:border-gray-800 p-4" open>
                <summary className="font-medium text-gray-900 dark:text-white cursor-pointer">
                  <T>Will this work if I am not logged into ChatGPT or Claude?</T>
                </summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <T>
                    You may be asked to sign in first. After login the question
                    is usually still in the URL. Perplexity often runs without an
                    account. Gemini uses your Google account.
                  </T>
                </p>
              </details>
              <details className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <summary className="font-medium text-gray-900 dark:text-white cursor-pointer">
                  <T>Can Googlebot see these buttons?</T>
                </summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <T>
                    Yes. They are normal links in the page HTML, repeated in the
                    site footer, listed in the sitemap via this page, and
                    summarised in /llms.txt.
                  </T>
                </p>
              </details>
              <details className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <summary className="font-medium text-gray-900 dark:text-white cursor-pointer">
                  <T>How do I connect an AI to live shop stock?</T>
                </summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <T>
                    That is seller AI integration, not this public Ask AI button.
                    Create a scoped key and use MCP tools. Sales and refunds
                    still need your confirmation.
                  </T>{" "}
                  <Link href="/ai-integration" className="text-amber-700 dark:text-amber-400 font-medium hover:underline">
                    <T>Open seller AI integration</T>
                  </Link>
                </p>
              </details>
              <details className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <summary className="font-medium text-gray-900 dark:text-white cursor-pointer">
                  <T>How long has Orivraa served jewellery customers?</T>
                </summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <T>
                    More than ten years at the counter. The cloud software went
                    live in January 2026 — new website, old trade habits.
                  </T>
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </div>
  );
}
