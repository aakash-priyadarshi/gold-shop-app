"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { BRAND } from "@/config/brand";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Mail,
  MessageSquare,
  Phone,
  Shield,
  XCircle,
} from "lucide-react";
import Link from "next/link";

export default function PlatformGuidelinesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gold-50/20 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo variant="icon" size="sm" />
            <span className="font-bold text-lg">{BRAND.name}</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Platform Guidelines
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Rules and policies to ensure a safe, fair, and trusted marketplace
            for all users.
          </p>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-2">
            प्लेटफ़ॉर्म गाइडलाइन्स — सभी यूज़र्स के लिए एक सुरक्षित और भरोसेमंद
            बाज़ार सुनिश्चित करने के नियम
          </p>
        </div>

        {/* ── Section: Contact Sharing Policy ── */}
        <section className="mb-10">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-bold text-red-900">
                🚫 Contact Sharing Policy / संपर्क जानकारी शेयर करने की नीति
              </h2>
            </div>

            <p className="text-gray-800 dark:text-gray-100 mb-4">
              To protect both buyers and sellers, all communication and
              transactions must happen through our platform. Sharing personal
              contact information is <strong>strictly prohibited</strong> and
              will result in account suspension.
            </p>
            <p className="text-gray-700 dark:text-gray-200 mb-6">
              खरीदारों और विक्रेताओं दोनों की सुरक्षा के लिए, सभी बातचीत और
              लेन-देन हमारे प्लेटफ़ॉर्म के ज़रिये ही होने चाहिए। व्यक्तिगत
              संपर्क जानकारी शेयर करना <strong>सख्त मना है</strong> और इससे
              अकाउंट सस्पेंड हो सकता है।
            </p>

            <h3 className="font-semibold text-red-800 mb-3">
              What is NOT allowed / क्या अनुमति नहीं है:
            </h3>
            <div className="grid gap-3 md:grid-cols-2 mb-6">
              {[
                {
                  icon: Phone,
                  en: "Sharing phone numbers",
                  hi: "फोन नंबर शेयर करना",
                },
                {
                  icon: Mail,
                  en: "Sharing email addresses",
                  hi: "ईमेल एड्रेस शेयर करना",
                },
                {
                  icon: MessageSquare,
                  en: "Sharing WhatsApp, Telegram, Signal contacts",
                  hi: "WhatsApp, Telegram, Signal कॉन्टैक्ट शेयर करना",
                },
                {
                  icon: XCircle,
                  en: "Sharing Instagram, Facebook handles",
                  hi: "Instagram, Facebook हैंडल शेयर करना",
                },
                {
                  icon: XCircle,
                  en: "Using coded language to share numbers (e.g., 'nine eight seven...')",
                  hi: "कोडेड भाषा में नंबर शेयर करना (जैसे 'नौ आठ सात...')",
                },
                {
                  icon: XCircle,
                  en: "Sharing contact info in images",
                  hi: "इमेज में कॉन्टैक्ट जानकारी शेयर करना",
                },
                {
                  icon: XCircle,
                  en: "Asking to 'call me' or 'text me' outside the platform",
                  hi: "प्लेटफ़ॉर्म के बाहर 'कॉल करो' या 'मैसेज करो' कहना",
                },
                {
                  icon: XCircle,
                  en: "Sharing Viber, IMO or any external messaging link",
                  hi: "Viber, IMO या कोई बाहरी मैसेजिंग लिंक शेयर करना",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 bg-white/60 dark:bg-gray-800/60 rounded-xl p-3"
                >
                  <item.icon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-100">{item.en}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.hi}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Warning system */}
            <div className="bg-white rounded-xl border border-red-100 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                ⚡ Warning System / चेतावनी प्रणाली
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold flex-shrink-0">
                    1
                  </span>
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">
                      1st Warning — Message blocked
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      पहली चेतावनी — मैसेज ब्लॉक किया गया
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex-shrink-0">
                    2
                  </span>
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">
                      2nd Warning — Final warning, admin notified
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      दूसरी चेतावनी — अंतिम चेतावनी, एडमिन को सूचित किया गया
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 text-xs font-bold flex-shrink-0">
                    3
                  </span>
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">
                      3rd Violation — Account suspended permanently
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      तीसरा उल्लंघन — अकाउंट स्थायी रूप से सस्पेंड
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: What IS allowed ── */}
        <section className="mb-10">
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-bold text-green-900">
                ✅ What IS Allowed / क्या अनुमति है
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  en: "Chat with sellers through our in-app messaging",
                  hi: "हमारे इन-ऐप मैसेजिंग से बात करें",
                },
                {
                  en: "Place orders and make payments through the platform",
                  hi: "प्लेटफ़ॉर्म के ज़रिये ऑर्डर और पेमेंट करें",
                },
                {
                  en: "Share product details, measurements, and preferences",
                  hi: "प्रॉडक्ट डिटेल्स, माप और पसंद शेयर करें",
                },
                {
                  en: "Upload reference images for custom orders",
                  hi: "कस्टम ऑर्डर के लिए रेफरेंस इमेज अपलोड करें",
                },
                {
                  en: "Negotiate pricing through RFQ system",
                  hi: "RFQ सिस्टम से कीमत पर बात करें",
                },
                {
                  en: "Contact support for any issues or disputes",
                  hi: "किसी भी समस्या के लिए सपोर्ट से संपर्क करें",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 bg-white/60 dark:bg-gray-800/60 rounded-xl p-3"
                >
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-100">{item.en}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.hi}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section: Why these rules exist ── */}
        <section className="mb-10">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-blue-900">
                🛡️ Why These Rules Exist / ये नियम क्यों हैं
              </h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  en: "Protection from fraud — All transactions on platform are tracked and refundable.",
                  hi: "धोखाधड़ी से सुरक्षा — प्लेटफ़ॉर्म पर सभी लेन-देन ट्रैक और रिफंडेबल हैं।",
                },
                {
                  en: "Dispute resolution — If something goes wrong, we can help only if everything happened on our platform.",
                  hi: "विवाद समाधान — अगर कुछ गलत हो जाए, तो हम तभी मदद कर सकते हैं जब सब कुछ हमारे प्लेटफ़ॉर्म पर हुआ हो।",
                },
                {
                  en: "Quality assurance — We verify sellers and products to maintain quality standards.",
                  hi: "क्वालिटी गारंटी — हम सेलर्स और प्रॉडक्ट्स को वेरिफाई करते हैं।",
                },
                {
                  en: "Fair pricing — Our marketplace ensures competitive pricing for both parties.",
                  hi: "उचित कीमत — हमारा बाज़ार दोनों पक्षों के लिए प्रतिस्पर्धी कीमत सुनिश्चित करता है।",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 bg-white/60 dark:bg-gray-800/60 rounded-xl p-3"
                >
                  <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-100">{item.en}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.hi}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section: General Marketplace Rules ── */}
        <section className="mb-10">
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              📋 General Marketplace Rules / सामान्य बाज़ार नियम
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  For Buyers / खरीदारों के लिए
                </h3>
                <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-200">
                  <li>
                    • Be respectful in all communications / सभी बातचीत में
                    सम्मानजनक रहें
                  </li>
                  <li>
                    • Provide accurate information for orders / ऑर्डर के लिए सही
                    जानकारी दें
                  </li>
                  <li>
                    • Complete payments through platform only / पेमेंट सिर्फ
                    प्लेटफ़ॉर्म से करें
                  </li>
                  <li>
                    • Report any issues through our support system / किसी भी
                    समस्या की रिपोर्ट सपोर्ट से करें
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  For Sellers / विक्रेताओं के लिए
                </h3>
                <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-200">
                  <li>
                    • List products with accurate descriptions and images / सही
                    विवरण और तस्वीरों के साथ प्रॉडक्ट लिस्ट करें
                  </li>
                  <li>
                    • Fulfill orders within promised timelines / वादे किए गए समय
                    में ऑर्डर पूरे करें
                  </li>
                  <li>
                    • Maintain hallmark and quality certifications / हॉलमार्क और
                    क्वालिटी प्रमाणपत्र बनाए रखें
                  </li>
                  <li>
                    • Respond to customer queries within 24 hours / 24 घंटे के
                    भीतर ग्राहक के सवालों का जवाब दें
                  </li>
                  <li>
                    • Never ask customers to pay outside the platform / ग्राहकों
                    से प्लेटफ़ॉर्म के बाहर पेमेंट न करवाएं
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Need Help? ── */}
        <section className="text-center mb-8">
          <p className="text-gray-600 dark:text-gray-300 mb-3">
            Have questions or need help? / सवाल हैं या मदद चाहिए?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/help"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-gold-500/30 transition"
            >
              <MessageSquare className="h-4 w-4" />
              Contact Support
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 bg-white text-gray-700 dark:text-gray-200 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </section>
      </main>

      <DynamicFooter />
    </div>
  );
}
