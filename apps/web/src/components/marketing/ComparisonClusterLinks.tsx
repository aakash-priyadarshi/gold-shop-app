"use client";

import { T } from "@/components/ui/T";
import { ArrowRight, Receipt, Users } from "lucide-react";
import Link from "next/link";

type ComparisonClusterLinksProps = {
  title?: string;
  description?: string;
};

export function ComparisonClusterLinks({
  title = "Compare Orivraa Against CRM and Billing Tools",
  description = "Use these pages to evaluate Orivraa against the software Indian jewellery businesses usually shortlist first, without adding more links to the main navigation.",
}: ComparisonClusterLinksProps) {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="p-8 lg:p-10 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
              <T>{title}</T>
            </h2>
            <p className="mt-3 text-center text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              <T>{description}</T>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-0">
            <Link
              href="/compare/jewellery-crm-software-india"
              className="group p-8 lg:p-10 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 hover:bg-amber-50/60 dark:hover:bg-amber-900/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-5">
                <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                <T>Best Jewellery CRM Software in India</T>
              </h3>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                <T>
                  Compare Orivraa with Zoho, Kylas, and LeadSquared for
                  customer follow-up, repeat sales, catalogue sharing, RFQs,
                  and jewellery-specific workflows.
                </T>
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                <T>Read CRM comparison</T>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>

            <Link
              href="/compare/billing-software-india-jewellery-shops"
              className="group p-8 lg:p-10 hover:bg-amber-50/60 dark:hover:bg-amber-900/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-5">
                <Receipt className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                <T>Best Billing Software in India for Jewellery Shops</T>
              </h3>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                <T>
                  Compare Orivraa with Vyapar, TallyPrime, Busy, and Marg ERP
                  for GST billing, stock sync, customer retention, and modern
                  jewellery retail operations.
                </T>
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                <T>Read billing comparison</T>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>

          <div className="px-8 lg:px-10 py-5 bg-gray-50 dark:bg-gray-950/50 text-sm text-gray-600 dark:text-gray-400">
            <T>Need brand-by-brand breakdowns too?</T>{" "}
            <Link
              href="/compare/orivraa-vs-tally"
              className="font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              Orivraa vs Tally
            </Link>
            {" "}
            <T>and</T>{" "}
            <Link
              href="/compare/orivraa-vs-marg-erp"
              className="font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              Orivraa vs Marg ERP
            </Link>
            .
          </div>
        </div>
      </div>
    </section>
  );
}