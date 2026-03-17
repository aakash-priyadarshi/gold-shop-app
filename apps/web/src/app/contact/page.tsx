"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import { contactApi } from "@/lib/api";
import {
    ArrowRight,
    Building2,
    CheckCircle2,
    Clock,
    Loader2,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Send,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";


const INTEREST_OPTIONS = [
  "Jewellery Shop Software",
  "AI Sales Team",
  "Enterprise / Multi-branch",
  "POS & Billing",
  "Custom Integration",
  "Partnership",
  "Other",
];

export default function ContactPage() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    interest: "",
    message: "",
  });

  // Pre-fill interest from URL query param
  useEffect(() => {
    const interest = searchParams.get("interest");
    if (interest) {
      setForm((f) => ({ ...f, interest: decodeURIComponent(interest) }));
    }
  }, [searchParams]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;

    setSending(true);
    setError("");
    try {
      const res = await contactApi.submit({
        ...form,
        source: "Contact Page",
      });
      if (res.data?.success) {
        setSent(true);
      } else {
        setError(
          res.data?.message ||
            "Failed to send. Please email us at sales@orivraa.com",
        );
      }
    } catch {
      setError("Something went wrong. Please email sales@orivraa.com");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-transparent dark:from-amber-900/10" />
          <div className="relative max-w-5xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold mb-6">
              <MessageSquare className="h-3.5 w-3.5" />
              <T>We respond within 24 hours</T>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
              <T>Get in Touch</T>
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              <T>
                Whether you want a demo, have questions about pricing, or need a
                custom solution for your jewellery business — we&apos;re here to
                help.
              </T>
            </p>
          </div>
        </section>

        {/* Quick contact info */}
        <section className="bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800 py-8">
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Email
                </p>
                <a
                  href="mailto:sales@orivraa.com"
                  className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
                >
                  sales@orivraa.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  <T>Response Time</T>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <T>Within 24 hours</T>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  <T>Location</T>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  India · Nepal · UAE · Global
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Form + sidebar */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              {sent ? (
                <div className="text-center py-20">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    <T>Message Sent!</T>
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-8">
                    <T>
                      Thank you for reaching out. Our team will get back to you
                      within 24 hours.
                    </T>
                  </p>
                  <button
                    onClick={() => {
                      setSent(false);
                      setForm({
                        name: "",
                        email: "",
                        phone: "",
                        company: "",
                        interest: "",
                        message: "",
                      });
                    }}
                    className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                  >
                    <T>Send another message</T>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        <T>Full Name</T> *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        <T>Email Address</T> *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all"
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        <T>Phone Number</T>
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        <T>Company / Shop Name</T>
                      </label>
                      <input
                        type="text"
                        value={form.company}
                        onChange={(e) =>
                          setForm({ ...form, company: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all"
                        placeholder="Sharma Jewellers"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      <T>What are you interested in?</T>
                    </label>
                    <select
                      value={form.interest}
                      onChange={(e) =>
                        setForm({ ...form, interest: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all"
                    >
                      <option value="">Select an option…</option>
                      {INTEREST_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      <T>Message</T> *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all resize-none"
                      placeholder="Tell us about your business and what you're looking for…"
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold px-8 py-3 rounded-full transition-colors shadow-lg shadow-amber-500/25"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <T>Sending…</T>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <T>Send Message</T>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6">
                <Sparkles className="w-8 h-8 text-amber-500 mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <T>AI Sales Team Demo</T>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <T>
                    Want to see our AI voice agents in action? Book a live
                    20-minute demo with your own product catalogue.
                  </T>
                </p>
                <Link
                  href="/ai-sales-team"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <T>Learn about AI Sales Team</T>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
                <Building2 className="w-8 h-8 text-gray-400 mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <T>Enterprise Solutions</T>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <T>
                    Multi-branch chains, white-label, dedicated AI agents,
                    custom integrations — let&apos;s discuss your needs.
                  </T>
                </p>
                <a
                  href="mailto:sales@orivraa.com?subject=Enterprise%20Inquiry"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <T>Email Enterprise Sales</T>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
                <Phone className="w-8 h-8 text-gray-400 mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <T>Prefer Email?</T>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <T>Reach us directly at</T>{" "}
                  <a
                    href="mailto:sales@orivraa.com"
                    className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                  >
                    sales@orivraa.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <DynamicFooter />
    </div>
  );
}
