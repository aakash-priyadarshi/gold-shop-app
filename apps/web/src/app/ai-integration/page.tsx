import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { AskAiProviderButtons } from "@/components/marketing/AskAiAboutUs";
import { T } from "@/components/ui/T";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  ScrollText,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

const STEPS = [
  {
    title: "Create the key",
    body: "In the shop dashboard the seller names the key (for example Claude workshop or ChatGPT stock) and copies the secret once. Orivraa stores only a hash.",
  },
  {
    title: "Choose scopes",
    body: "inventory:read, inventory:write, orders:read, and orders:write are the core jewellery scopes. Catalogue, customer, and analytics read scopes can be added without opening the till.",
  },
  {
    title: "Connect MCP",
    body: "Point Claude, ChatGPT, Gemini, Cursor, or another MCP client at Orivraa with that key. The server lists only tools those scopes allow.",
  },
  {
    title: "Rotate or revoke",
    body: "If a staff member leaves or a prompt looks wrong, rotate the secret or revoke the key. Connected assistants lose access immediately.",
  },
];

const GUARDS = [
  {
    icon: Lock,
    title: "Scoped tools only",
    body: "The MCP server does not dump the whole API. A read-only inventory key cannot change orders. A catalogue key cannot see bank payouts.",
  },
  {
    icon: ShieldAlert,
    title: "Money needs confirmation",
    body: "Sales, payments, and refunds are not an unrestricted write tool. The assistant proposes the action; a person in the shop confirms before cash, UPI, card, or refund posts.",
  },
  {
    icon: ScrollText,
    title: "Every AI write is logged",
    body: "Creates, updates, and confirmed financial steps are audit-logged under the seller and the key prefix so you can see which assistant changed stock.",
  },
];

export default function AiIntegrationPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main>
        <section className="py-16 lg:py-24 bg-gradient-to-b from-gray-950 to-gray-900 text-white">
          <div className="container mx-auto px-4 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-400 mb-3">
              <T>Seller AI integration</T>
            </p>
            <h1 className="text-3xl lg:text-5xl font-bold leading-tight">
              <T>Jewellery shop MCP: scoped keys, audit logs, confirm-to-pay</T>
            </h1>
            <p className="mt-5 text-base lg:text-lg text-gray-300 leading-relaxed">
              <T>
                Let Claude, ChatGPT, Gemini, or Perplexity help with stock
                questions and catalogue drafts without giving them the till.
                You create the seller AI integration key, pick scopes, rotate or
                revoke it, and review every AI write. Financial actions require
                an extra confirmation step.
              </T>
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 text-navy-950 font-semibold hover:bg-gold-400"
              >
                <T>Start free and add a key</T>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 font-semibold hover:bg-white/5"
              >
                <T>API access is on paid plans</T>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
              <T>How a jeweller connects an assistant</T>
            </h2>
            <ol className="grid md:grid-cols-2 gap-6">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
                >
                  <p className="text-xs font-bold text-amber-600 mb-2">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    <T>{step.title}</T>
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{step.body}</T>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-16 bg-gray-50 dark:bg-gray-900/40">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              <T>Scopes you can grant</T>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl">
              <T>
                Start read-only. Add write scopes only for catalogue cleanup or
                order notes. Keep payments off the key until you are ready to
                confirm each ticket.
              </T>
            </p>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      <T>Scope</T>
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      <T>What the assistant may do</T>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr>
                    <td className="px-4 py-3 font-mono">inventory:read</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <T>Look up SKUs, weights, purity, vault location, and set components</T>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono">inventory:write</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <T>Create or edit pieces the key is allowed to touch — logged</T>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono">orders:read</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <T>Read order status and line items without changing them</T>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono">orders:write</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <T>Draft order updates. Capturing a sale, taking payment, or issuing a refund still requires confirmation</T>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              <T>
                Enterprise shops already manage keys under Shop → Enterprise →
                API keys. Treat a seller AI key the same way you treat a staff
                login: least privilege, named, revocable.
              </T>
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
              <T>MCP guardrails for a jewellery till</T>
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {GUARDS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
                >
                  <item.icon className="h-6 w-6 text-amber-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    <T>{item.title}</T>
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{item.body}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-amber-50 dark:bg-amber-950/20 border-y border-amber-100 dark:border-amber-900/40">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <KeyRound className="h-8 w-8 text-amber-600 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              <T>Not sure if Orivraa is the right jewellery software?</T>
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              <T>
                Ask ChatGPT, Claude, Gemini, or Perplexity the same question we
                publish on every frontpage: how is Orivraa for jewellery
                business software?
              </T>
            </p>
            <div className="mt-6 flex justify-center">
              <AskAiProviderButtons />
            </div>
            <p className="mt-4 text-sm">
              <Link href="/ask-ai" className="text-amber-800 dark:text-amber-400 font-medium hover:underline">
                <T>How Ask AI links work on phone vs computer</T>
              </Link>
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <T>What this is not</T>
            </h2>
            <ul className="space-y-3 text-gray-600 dark:text-gray-400">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <T>
                  Not a public unauthenticated MCP. Only the seller who created
                  the key can authorise an assistant.
                </T>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <T>
                  Not a replacement for manager PIN on POS discounts or stock
                  audit close-out.
                </T>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <T>
                  Not training your customer list into a third-party model by
                  default — you choose which tools and which chat product to
                  connect.
                </T>
              </li>
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/jewellery-shop-software"
                className="inline-flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                <T>Jewellery shop software</T>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/security"
                className="inline-flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 hover:underline"
              >
                <T>Security &amp; trust</T>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </div>
  );
}
