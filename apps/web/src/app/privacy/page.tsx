import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Orivraa",
  description: "Privacy Policy for Orivraa jewelry marketplace and shop management platform.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12 lg:py-20">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Privacy Policy
        </h1>
        <div className="prose prose-lg dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white
          prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl
          prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
          prose-li:text-gray-600 dark:prose-li:text-gray-300
          prose-a:text-amber-600 dark:prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-900 dark:prose-strong:text-white">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">Last updated: March 14, 2026</p>
          
          <h2>1. Introduction</h2>
          <p>Welcome to Orivraa. This Privacy Policy explains how we collect, use, process, and protect your information when you use our website, mobile applications, and desktop software (including our offline-capable shop management applications). We are committed to safeguarding the privacy of our buyers, artisans, and jewelry business partners across the globe.</p>
          
          <h2>2. Information We Collect</h2>
          <p>We collect various types of information to provide a seamless and secure experience on our B2B/B2C jewelry marketplace and shop management platform:</p>
          <ul>
            <li><strong>Account & Profile Data:</strong> Name, email address, phone number, physical address, and business verification details when you register as a buyer or seller.</li>
            <li><strong>CRM & Communications:</strong> Data from customer relationship management processes, including built-in chat logs, RFQ (Request for Quote) discussions, and customer support interactions.</li>
            <li><strong>Transaction & Financial Data:</strong> Information related to orders, custom manufacturing requests, invoices, payment history, and payment gateway processing details.</li>
            <li><strong>Inventory & Shop Data:</strong> For sellers using our desktop application, we process and securely synchronize local inventory, catalogue data, and sales analytics with our cloud services.</li>
            <li><strong>Marketplace Intelligence:</strong> Browsing behavior, search history, device information, and platform interactions to provide sales analytics, personalized recommendations, and market intelligence insights.</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>Your data is essential for us to deliver our comprehensive suite of services. We use your data to:</p>
          <ul>
            <li>Facilitate secure transactions, custom order routing, and order fulfillment between global buyers and verified sellers.</li>
            <li>Synchronize your offline shop inventory with your online global storefront using our desktop client.</li>
            <li>Operate our built-in real-time chat, negotiation tools, and CRM systems for seamless communication.</li>
            <li>Process payments securely via our integrated international payment gateways.</li>
            <li>Analyze marketplace trends to generate actionable intelligence reports and sales analytics for our partners.</li>
            <li>Maintain platform security, prevent fraud, and verify the quality and purity standards of our artisans.</li>
          </ul>

          <h2>4. Data Sharing and Security</h2>
          <p>We absolutely do not sell your personal data. We share data only with trusted third-party service providers (such as payment processors, shipping logistics partners, and security verification services) strictly necessary to operate our platform. We employ robust, industry-standard cryptographic and security measures to protect your sensitive business inventory and personal information from unauthorized access.</p>

          <h2>5. Your Rights and Choices</h2>
          <p>You have the right to access, correct, update, or request the deletion of your personal data. Sellers may also manage their synced inventory data via their dedicated dashboard. For any privacy-related inquiries, data requests, or to exercise your rights, please contact our dedicated Data Protection team at <strong>support@orivraa.com</strong>.</p>
        </div>
      </main>
      <DynamicFooter />
    </div>
  );
}
