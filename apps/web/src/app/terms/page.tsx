"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { T } from "@/components/ui/T";
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
    { id: "payments", title: "4. Payments & Quotes", icon: CreditCard },
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
              Please read these terms carefully. They outline the rules, regulations, and 
              responsibilities that govern your use of the Orivraa platform.
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
                <T>Orivraa provides an integrated B2B and B2C jewelry marketplace connecting buyers with worldwide 
                verified artisans. Furthermore, we offer a comprehensive suite of tools for jewelry businesses, 
                including shop management, inventory tracking (with offline desktop syncing capabilities), 
                Customer Relationship Management (CRM), Request for Quote (RFQ) processing, marketplace 
                intelligence, and integrated chat functionality.</T>
              </p>

              <h2 id="responsibilities">
                <UserCheck className="w-5 h-5 text-amber-500" />
                <T>3. User and Partner Responsibilities</T>
              </h2>
              <ul>
                <li><strong><T>Accuracy of Information:</T></strong> <T>You must provide accurate and complete information when creating an account, registering a shop, or listing inventory.</T></li>
                <li><strong><T>Quality and Purity Standards:</T></strong> <T>Sellers are strictly obligated to ensure that all jewelry listed meets the described purity (e.g., 22K gold), quality standards, and matches the custom manufacturing specifications requested by buyers.</T></li>
                <li><strong><T>Platform Conduct:</T></strong> <T>You agree not to misuse our chat, CRM, or RFQ systems for spam, harassment, fraudulent activities, or to bypass the Orivraa secure checkout process.</T></li>
              </ul>

              <h2 id="payments">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <T>4. Transactions, Quotes, and Payments</T>
              </h2>
              <p>
                <T>All payments, custom manufacturing quotes, and invoices generated through our platform are subject 
                to the terms of our integrated international payment gateways. While Orivraa implements strict 
                verification for artisans and offers Buyer Protection policies, users agree that final contracts 
                for custom manufacturing are executed subject to the agreed-upon digital quotes within our system.</T>
              </p>

              <h2 id="software">
                <FileText className="w-5 h-5 text-amber-500" />
                <T>5. Software License and Desktop Application</T>
              </h2>
              <p>
                <T>For jewelry partners utilizing our desktop shop management software: Orivraa grants you a limited, 
                non-exclusive, non-transferable license to use the software for managing your store. You are 
                responsible for maintaining a stable internet connection for regular syncs to ensure data 
                consistency between your local database and the Orivraa cloud platform.</T>
              </p>

              <h2 id="liability">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <T>6. Limitation of Liability</T>
              </h2>
              <p>
                <T>Orivraa provides its platform on an "as-is" basis. To the maximum extent permitted by law, 
                Orivraa shall not be liable for indirect, incidental, or consequential damages resulting from 
                the use or inability to use our services, including but not limited to lost profits, delayed 
                logistics, or data loss resulting from a failure to synchronize desktop inventory.</T>
              </p>
              
              <div className="mt-12 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-6 border border-amber-100 dark:border-amber-900/20 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white dark:bg-gray-900 p-3 rounded-full shadow-sm">
                  <HelpCircle className="w-6 h-6 text-amber-500" />
                </div>
                <div className="text-center md:text-left">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white m-0"><T>Need clarification?</T></h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0"><T>Our support team is available to help explain any part of these terms.</T></p>
                </div>
                <a 
                  href="/support" 
                  className="md:ml-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold transition-all shadow-md active:scale-95 no-underline"
                >
                  <T>Contact Support</T>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <DynamicFooter />
    </div>
  );
}

