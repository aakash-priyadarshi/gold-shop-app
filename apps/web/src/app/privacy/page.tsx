"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { T } from "@/components/ui/T";
import {
    Eye,
    History,
    Lock,
    Mail,
    Scale,
    Shield,
    Sparkles,
    UserCheck
} from "lucide-react";

export default function PrivacyPage() {
  const sections = [
    { id: "introduction", title: "1. Introduction", icon: Sparkles },
    { id: "collection", title: "2. Information We Collect", icon: Eye },
    { id: "usage", title: "3. How We Use Information", icon: UserCheck },
    { id: "security", title: "4. Data Sharing and Security", icon: Lock },
    { id: "rights", title: "5. Your Rights and Choices", icon: Scale },
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
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            <T>Transparency & Security</T>
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
            <T>Privacy Policy</T>
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            <T>
              Your trust is our most valuable asset. Learn how we handle your data with the 
              same care and precision we apply to the jewelry on our platform.
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
              
              <h2 id="introduction">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <T>1. Introduction</T>
              </h2>
              <p>
                <T>Welcome to Orivraa. This Privacy Policy explains how we collect, use, process, and protect your 
                information when you use our website, mobile applications, and desktop software (including our 
                offline-capable shop management applications). We are committed to safeguarding the privacy of 
                our buyers, artisans, and jewelry business partners across the globe.</T>
              </p>
              
              <h2 id="collection">
                <Eye className="w-5 h-5 text-amber-500" />
                <T>2. Information We Collect</T>
              </h2>
              <p>
                <T>We collect various types of information to provide a seamless and secure experience on our 
                B2B/B2C jewelry marketplace and shop management platform:</T>
              </p>
              <ul>
                <li><strong><T>Account & Profile Data:</T></strong> <T>Name, email address, phone number, physical address, and business verification details when you register as a buyer or seller.</T></li>
                <li><strong><T>CRM & Communications:</T></strong> <T>Data from customer relationship management processes, including built-in chat logs, RFQ (Request for Quote) discussions, and customer support interactions.</T></li>
                <li><strong><T>Transaction & Financial Data:</T></strong> <T>Information related to orders, custom manufacturing requests, invoices, payment history, and payment gateway processing details.</T></li>
                <li><strong><T>Inventory & Shop Data:</T></strong> <T>For sellers using our desktop application, we process and securely synchronize local inventory, catalogue data, and sales analytics with our cloud services.</T></li>
                <li><strong><T>Marketplace Intelligence:</T></strong> <T>Browsing behavior, search history, device information, and platform interactions to provide sales analytics, personalized recommendations, and market intelligence insights.</T></li>
              </ul>

              <h2 id="usage">
                <UserCheck className="w-5 h-5 text-amber-500" />
                <T>3. How We Use Your Information</T>
              </h2>
              <p><T>Your data is essential for us to deliver our comprehensive suite of services. We use your data to:</T></p>
              <ul>
                <li><T>Facilitate secure transactions, custom order routing, and order fulfillment between global buyers and verified sellers.</T></li>
                <li><T>Synchronize your offline shop inventory with your online global storefront using our desktop client.</T></li>
                <li><T>Operate our built-in real-time chat, negotiation tools, and CRM systems for seamless communication.</T></li>
                <li><T>Process payments securely via our integrated international payment gateways.</T></li>
                <li><T>Analyze marketplace trends to generate actionable intelligence reports and sales analytics for our partners.</T></li>
                <li><T>Maintain platform security, prevent fraud, and verify the quality and purity standards of our artisans.</T></li>
              </ul>

              <h2 id="security">
                <Lock className="w-5 h-5 text-amber-500" />
                <T>4. Data Sharing and Security</T>
              </h2>
              <p>
                <T>We absolutely do not sell your personal data. We share data only with trusted third-party service 
                providers (such as payment processors, shipping logistics partners, and security verification 
                services) strictly necessary to operate our platform. We employ robust, industry-standard 
                cryptographic and security measures to protect your sensitive business inventory and personal 
                information from unauthorized access.</T>
              </p>

              <h2 id="rights">
                <Scale className="w-5 h-5 text-amber-500" />
                <T>5. Your Rights and Choices</T>
              </h2>
              <p>
                <T>You have the right to access, correct, update, or request the deletion of your personal data. 
                Sellers may also manage their synced inventory data via their dedicated dashboard. For any 
                privacy-related inquiries, data requests, or to exercise your rights, please contact our 
                dedicated Data Protection team.</T>
              </p>
              
              <div className="mt-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white dark:bg-gray-900 p-3 rounded-full shadow-sm">
                  <Mail className="w-6 h-6 text-amber-500" />
                </div>
                <div className="text-center md:text-left">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white m-0 truncate"><T>Contact Support</T></h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0"><T>Our team is here to help with any privacy questions.</T></p>
                </div>
                <a 
                  href="mailto:support@orivraa.com" 
                  className="md:ml-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-md active:scale-95 no-underline"
                >
                  support@orivraa.com
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

