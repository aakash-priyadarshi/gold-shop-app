"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { T } from "@/components/ui/T";
import Link from "next/link";
import {
    CreditCard,
    FileText,
    Gavel,
    HelpCircle,
    History,
    Laptop,
    ShieldAlert,
    Sparkles,
    UserCheck
} from "lucide-react";

export default function TermsPage() {
  const sections = [
    { id: "acceptance", title: "1. Acceptance of Terms", icon: Sparkles },
    { id: "service", title: "2. Description of Service", icon: Laptop },
    { id: "responsibilities", title: "3. User Responsibilities", icon: UserCheck },
    { id: "payments", title: "4. Plans, Billing & Payments", icon: CreditCard },
    { id: "software", title: "5. Software License", icon: FileText },
    { id: "liability", title: "6. Liability", icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-200/20 dark:bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-100/30 dark:bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <Badge
            variant="outline"
            className="mb-4 border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400 px-4 py-1.5"
          >
            <Gavel className="w-3.5 h-3.5 mr-1.5" />
            <T>Legal Framework</T>
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
            <T>Terms of Service</T>
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            <T>
              Please read these terms carefully. They govern your use of the
              Orivraa marketplace, SaaS platform, mobile and desktop apps,
              support services, and AI-assisted workflows.
            </T>
          </p>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
            <History className="w-4 h-4" />
            <span><T>Last updated: March 14, 2026</T></span>
          </div>
        </div>
      </section>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-1">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-3">
                <T>Contents</T>
              </p>
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 transition-all"
                >
                  <section.icon className="w-4 h-4" />
                  <T>{section.title.split(". ")[1]}</T>
                </a>
              ))}
            </div>
          </aside>

          {/* Policy Text */}
          <div className="lg:col-span-9 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 md:p-12">
            <div className="prose prose-lg dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
              prose-h2:text-2xl prose-h2:flex prose-h2:items-center prose-h2:gap-3 prose-h2:pt-8 prose-h2:mt-8 prose-h2:border-t prose-h2:border-gray-100 dark:prose-h2:border-gray-800 first:prose-h2:mt-0 first:prose-h2:pt-0 first:prose-h2:border-0
              prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
              prose-li:text-gray-600 dark:prose-li:text-gray-300
              prose-strong:text-gray-900 dark:prose-strong:text-white
              prose-a:text-amber-600 dark:prose-a:text-amber-400 prose-a:font-semibold">
              
              <h2 id="acceptance">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <T>1. Acceptance of Terms</T>
              </h2>
              <p>
                <T>By accessing and using Orivraa&apos;s website, mobile applications, or desktop software, you agree to 
                comply with and be bound by these Terms of Service. If you do not agree to these terms, 
                please do not use our platform.</T>
              </p>
              
              <h2 id="service">
                <Laptop className="w-5 h-5 text-amber-500" />
                <T>2. Description of Service</T>
              </h2>
              <p>
                <T>Orivraa is a SaaS platform providing a comprehensive suite of jewellery business management tools — including a web dashboard, mobile POS, desktop inventory management, CRM, invoicing, sales analytics, and an AI support assistant — available on Free, Pro, and Pro+ subscription plans. Orivraa also operates an integrated B2B/B2C jewellery marketplace connecting buyers with verified artisans and retailers worldwide, enabling custom manufacturing requests (RFQs), secure checkout, real-time chat, and international logistics coordination.</T>
              </p>

              <h2 id="responsibilities">
                <UserCheck className="w-5 h-5 text-amber-500" />
                <T>3. User and Partner Responsibilities</T>
              </h2>
              <ul>
                <li><strong><T>Account Security:</T></strong> <T>You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify our support team immediately of any unauthorized access or suspected compromise.</T></li>
                <li><strong><T>Acceptable Use:</T></strong> <T>You agree not to misuse Orivraa&apos;s SaaS tools to process fraudulent data, attempt to reverse-engineer our software, scrape platform data, or intentionally exceed service usage limits.</T></li>
                <li><strong><T>Accuracy of Information:</T></strong> <T>You must provide accurate and complete information when creating an account, registering a shop, or listing inventory.</T></li>
                <li><strong><T>Quality and Purity Standards:</T></strong> <T>Marketplace sellers are obligated to ensure all jewellery listed meets the described purity (e.g., 22K gold), quality standards, and matches any custom manufacturing specifications agreed with buyers.</T></li>
                <li><strong><T>Platform Conduct:</T></strong> <T>You agree not to misuse our chat, CRM, or RFQ systems for spam, harassment, fraudulent activities, or to bypass the Orivraa secure checkout process.</T></li>
              </ul>

              <h2 id="payments">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <T>4. Plans, Billing & Payments</T>
              </h2>
              <p>
                <T>Orivraa offers Free, Pro, and Pro+ SaaS subscription tiers. Paid plans are billed on a monthly recurring basis. By subscribing, you authorize us to charge your payment method automatically at each renewal. You may cancel at any time from your dashboard; access to paid features continues through the end of the current billing period. Cancellations do not entitle you to a pro-rated refund (see our Refund Policy).</T>
              </p>
              <p>
                <T>For marketplace transactions: all orders, custom manufacturing quotes (RFQs), and invoices are processed via our integrated international payment gateways. Orivraa implements strict seller verification and extends Buyer Protection policies to verified marketplace orders. Final contracts for custom manufacturing are executed subject to the agreed-upon digital quotes within the platform.</T>
              </p>

              <h2 id="software">
                <FileText className="w-5 h-5 text-amber-500" />
                <T>5. Software License and Desktop Application</T>
              </h2>
              <p>
                <T>Orivraa grants you a limited, non-exclusive, non-transferable, revocable license to access and use our web, mobile, and desktop SaaS software for managing your jewellery business, subject to your active subscription plan. You may not sublicense, resell, or redistribute the platform or any of its components.</T>
              </p>
              <ul>
                <li><strong><T>Data Portability:</T></strong> <T>You may export your shop data, inventory records, invoices, and analytics reports from your dashboard at any time. Your business data belongs to you.</T></li>
                <li><strong><T>Service Availability:</T></strong> <T>Orivraa provides its SaaS platform on a commercially reasonable best-effort basis. Planned maintenance windows and unforeseen outages may cause temporary interruptions. We do not guarantee uninterrupted or error-free service.</T></li>
                <li><strong><T>Team Access:</T></strong> <T>You are responsible for managing authorized team member access to your account so that data stays consistent between your local workflows and the Orivraa cloud platform.</T></li>
              </ul>

              <h2 id="liability">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <T>6. Limitation of Liability</T>
              </h2>
              <p>
                <T>Orivraa provides its platform on an &quot;as-is&quot; basis. To the maximum extent permitted by law, Orivraa shall not be liable for indirect, incidental, or consequential damages resulting from the use or inability to use our services, including but not limited to lost profits, delayed logistics, business interruption, data loss, or temporary service unavailability.</T>
              </p>
              
              <div className="mt-12 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-6 border border-amber-100 dark:border-amber-900/20 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white dark:bg-gray-900 p-3 rounded-full shadow-sm">
                  <HelpCircle className="w-6 h-6 text-amber-500" />
                </div>
                <div className="text-center md:text-left">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white m-0"><T>Need clarification?</T></h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0"><T>Our support team is available to help explain any part of these terms.</T></p>
                </div>
                <Link
                  href="/support"
                  className="md:ml-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold transition-all shadow-md active:scale-95 no-underline"
                >
                  <T>Open Support Center</T>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <DynamicFooter />
    </div>
  );
}

