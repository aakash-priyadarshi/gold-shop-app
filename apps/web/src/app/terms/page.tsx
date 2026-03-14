import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Orivraa",
  description: "Terms of Service for Orivraa jewelry marketplace and shop management platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12 lg:py-20">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Terms of Service
        </h1>
        <div className="prose prose-lg dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white
          prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl
          prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
          prose-li:text-gray-600 dark:prose-li:text-gray-300
          prose-a:text-amber-600 dark:prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-900 dark:prose-strong:text-white">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">Last updated: March 14, 2026</p>
          
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using Orivraa's website, mobile applications, or desktop software, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
          
          <h2>2. Description of Service</h2>
          <p>Orivraa provides an integrated B2B and B2C jewelry marketplace connecting buyers with worldwide verified artisans. Furthermore, we offer a comprehensive suite of tools for jewelry businesses, including shop management, inventory tracking (with offline desktop syncing capabilities), Customer Relationship Management (CRM), Request for Quote (RFQ) processing, marketplace intelligence, and integrated chat functionality.</p>

          <h2>3. User and Partner Responsibilities</h2>
          <ul>
            <li><strong>Accuracy of Information:</strong> You must provide accurate and complete information when creating an account, registering a shop, or listing inventory.</li>
            <li><strong>Quality and Purity Standards:</strong> Sellers are strictly obligated to ensure that all jewelry listed meets the described purity (e.g., 22K gold), quality standards, and matches the custom manufacturing specifications requested by buyers.</li>
            <li><strong>Platform Conduct:</strong> You agree not to misuse our chat, CRM, or RFQ systems for spam, harassment, fraudulent activities, or to bypass the Orivraa secure checkout process.</li>
          </ul>

          <h2>4. Transactions, Quotes, and Payments</h2>
          <p>All payments, custom manufacturing quotes, and invoices generated through our platform are subject to the terms of our integrated international payment gateways. While Orivraa implements strict verification for artisans and offers Buyer Protection policies, users agree that final contracts for custom manufacturing are executed subject to the agreed-upon digital quotes within our system.</p>

          <h2>5. Software License and Desktop Application</h2>
          <p>For jewelry partners utilizing our desktop shop management software: Orivraa grants you a limited, non-exclusive, non-transferable license to use the software for managing your store. You are responsible for maintaining a stable internet connection for regular syncs to ensure data consistency between your local database and the Orivraa cloud platform.</p>

          <h2>6. Platform Integration and API Usage</h2>
          <p>Any use of the Orivraa API, Marketplace Intelligence metrics, or AI-driven sales tools must comply with our acceptable use policies. Reverse engineering, aggressive scraping, or unauthorized distribution of marketplace intelligence data is strictly prohibited.</p>

          <h2>7. Limitation of Liability</h2>
          <p>Orivraa provides its platform on an "as-is" basis. To the maximum extent permitted by law, Orivraa shall not be liable for indirect, incidental, or consequential damages resulting from the use or inability to use our services, including but not limited to lost profits, delayed logistics, or data loss resulting from a failure to synchronize desktop inventory.</p>

          <h2>8. Modifications to Terms</h2>
          <p>We reserve the right to update these Terms at any time. Continued use of the platform after changes constitutes acceptance of the new Terms.</p>

          <h2>9. Contact Information</h2>
          <p>If you have any questions or concerns regarding these Terms of Service, please contact our support team at <strong>support@orivraa.com</strong>.</p>
        </div>
      </main>
      <DynamicFooter />
    </div>
  );
}
