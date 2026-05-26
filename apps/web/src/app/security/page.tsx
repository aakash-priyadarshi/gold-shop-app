"use client";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  Scan, 
  Fingerprint, 
  Cpu, 
  FileCheck2, 
  ServerCrash, 
  Globe2, 
  Sparkles 
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const DynamicFooter = dynamic(
  () =>
    import("@/components/layout/DynamicFooter").then((m) => ({
      default: m.DynamicFooter,
    })),
  { ssr: false }
);

export default function SecurityTrustPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0C10] text-gray-900 dark:text-gray-100 flex flex-col overflow-x-hidden">
      {/* Consistent Global Navigation Header */}
      <Header />

      {/* World-Class Molten Gold River Animated Hero Section */}
      <header className="relative overflow-hidden py-24 md:py-32 border-b border-gray-100 dark:border-gray-900/60 gold-river-light dark:gold-river-dark transition-all duration-500">
        {/* Soft decorative background gold blurs */}
        <div className="absolute top-1/4 left-1/10 w-72 h-72 rounded-full bg-champagne-300/10 dark:bg-champagne-300/5 blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/10 w-96 h-96 rounded-full bg-gold-500/10 dark:bg-gold-500/5 blur-3xl -z-10 animate-pulse" />

        <div className="max-w-4xl mx-auto px-4">
          {/* Frosted Glassmorphic Hero Container */}
          <ScrollReveal direction="up" delay={0.05} duration={0.8}>
            <div className="backdrop-blur-xl bg-white/40 dark:bg-black/45 border border-white/20 dark:border-white/5 rounded-3xl p-8 md:p-12 shadow-xl text-center space-y-6">
              <Badge className="bg-champagne-300/10 text-champagne-300 border border-champagne-300/20 px-3 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider mx-auto backdrop-blur-sm">
                <T>🔒 Bank-Grade Security &amp; Trust</T>
              </Badge>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-gray-900 dark:text-white">
                <T>How Orivraa Establishes</T>{" "}
                <span className="bg-gradient-to-r from-champagne-300 via-gold-500 to-champagne-400 bg-clip-text text-transparent">
                  <T>Elite Safety</T>
                </span>{" "}
                <T>for Modern Jewelers</T>
              </h1>
              <p className="text-base md:text-xl text-gray-700 dark:text-gray-250 max-w-2xl mx-auto leading-relaxed font-medium">
                <T>Precious commodities demand uncompromising cybersecurity. Orivraa integrates cloud architecture, hardware scanning protocols, and real-time ledger protection to keep your shop secure.</T>
              </p>
            </div>
          </ScrollReveal>
        </div>
      </header>

      {/* Trust Pillars */}
      <section className="max-w-6xl mx-auto px-4 py-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <ScrollReveal direction="up" delay={0.05} className="h-full">
          <Card className="border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/50 shadow-md backdrop-blur-md hover:-translate-y-1 transition-all duration-300 h-full gold-glow-hover">
            <CardContent className="pt-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-champagne-300/10 text-champagne-300 flex items-center justify-center shadow-sm border border-champagne-300/20">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg"><T>Bank-Grade Encryption</T></h3>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                <T>All data in transit is protected using elite TLS 1.3 encryption. At rest, precious inventory tables, transactional ledgers, and customer profiles are shielded with AES-256 encryption.</T>
              </p>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.12} className="h-full">
          <Card className="border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/50 shadow-md backdrop-blur-md hover:-translate-y-1 transition-all duration-300 h-full gold-glow-hover">
            <CardContent className="pt-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shadow-sm border border-blue-500/20">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg"><T>Daily Automated Backups</T></h3>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                <T>Never worry about system failure or data loss. Orivraa runs hourly database snapshots with redundant cloud backups, permitting point-in-time recovery for business resilience.</T>
              </p>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2} className="h-full">
          <Card className="border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/50 shadow-md backdrop-blur-md hover:-translate-y-1 transition-all duration-300 h-full gold-glow-hover">
            <CardContent className="pt-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center shadow-sm border border-purple-500/20">
                <ServerCrash className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg"><T>Regional Data Sovereignty</T></h3>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                <T>Your data is stored in isolated, state-of-the-art datacenters located within your home country (Nepal, India, UAE, UK, or EU) to comply with local financial laws.</T>
              </p>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.25} className="h-full">
          <Card className="border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/50 shadow-md backdrop-blur-md hover:-translate-y-1 transition-all duration-300 h-full gold-glow-hover">
            <CardContent className="pt-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-sm border border-amber-500/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg"><T>Self-Defending AI &amp; Edge Guards</T></h3>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                <T>Active Edge validation blocks open redirect phishing attacks at the routing boundary. Hardened LLM jailbreak defense layers prevent support chat prompt injections, keeping store insights fully isolated.</T>
              </p>
            </CardContent>
          </Card>
        </ScrollReveal>
      </section>

      {/* Advanced Hardware Integration Section */}
      <section className="bg-gray-50/50 dark:bg-gray-900/20 py-24 border-t border-b border-gray-200/50 dark:border-gray-800/40">
        <div className="max-w-5xl mx-auto px-4 grid gap-12 md:grid-cols-2 items-center">
          <ScrollReveal direction="left" delay={0.05} className="space-y-6">
            <Badge className="bg-champagne-300/10 text-champagne-300 border border-champagne-300/20 px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider">
              <T>📟 POS Hardware Safety</T>
            </Badge>
            <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              <T>Biometrics, Barcodes &amp; RFID Stock Security</T>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <T>Safeguarding high-value assets requires more than virtual firewalls. Orivraa integrates seamlessly with hardware security layers right at the checkout counter:</T>
            </p>
            <ul className="space-y-3 text-xs md:text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2.5 font-medium">
                <Fingerprint className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong><T>Biometric Staff Scan:</T></strong>{" "}
                  <T>Restricts high-clearance actions like inventory adjustments, discount approvals, or daily registers to verified fingerprint scans.</T>
                </span>
              </li>
              <li className="flex items-start gap-2.5 font-medium">
                <Scan className="h-5 w-5 text-champagne-300 shrink-0 mt-0.5" />
                <span>
                  <strong><T>RFID Tag Integration:</T></strong>{" "}
                  <T>Fast-tracks morning showcases stock audit, counting hundreds of gold ornaments simultaneously to detect shrinkage in minutes.</T>
                </span>
              </li>
              <li className="flex items-start gap-2.5 font-medium">
                <Cpu className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong><T>BIS Hallmark &amp; HUID Tracking:</T></strong>{" "}
                  <T>Every piece is bound to its unique Government Hallmark ID, protecting you against counterfeit stock.</T>
                </span>
              </li>
            </ul>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={0.12} className="relative flex justify-center">
            <div className="w-80 h-80 rounded-full bg-champagne-300/5 border border-champagne-300/10 absolute -z-10 animate-pulse" />
            <Card className="border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl w-72 max-w-full gold-glow-hover">
              <CardContent className="pt-6 space-y-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-inner border border-emerald-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white"><T>Security Proof Checklist</T></h3>
                <div className="text-left space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs border-b dark:border-gray-850 pb-1.5">
                    <span className="text-gray-500 dark:text-gray-400"><T>TLS 1.3 In-Transit</T></span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0 font-bold"><T>Elite</T></Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b dark:border-gray-850 pb-1.5">
                    <span className="text-gray-500 dark:text-gray-400"><T>AI Jailbreak Defense</T></span>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[9px] px-1.5 py-0 font-bold"><T>Hardened</T></Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b dark:border-gray-850 pb-1.5">
                    <span className="text-gray-500 dark:text-gray-400"><T>Edge Redirect Allowlist</T></span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0 font-bold"><T>Active</T></Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b dark:border-gray-850 pb-1.5">
                    <span className="text-gray-500 dark:text-gray-400"><T>ISO 27001 Ready</T></span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0 font-bold"><T>Certified</T></Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b dark:border-gray-850 pb-1.5">
                    <span className="text-gray-500 dark:text-gray-400"><T>Biometric Staff Auth</T></span>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[9px] px-1.5 py-0 font-bold"><T>Supported</T></Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="text-gray-500 dark:text-gray-400"><T>Automated Daily Seed</T></span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0 font-bold"><T>Active</T></Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Infrastructure Verification Section */}
      <section className="max-w-5xl mx-auto px-4 py-24 space-y-10 border-t dark:border-gray-800/60">
        <ScrollReveal direction="up" delay={0.05} className="text-center space-y-3">
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider">
            <T>🛡️ Verified Infrastructure &amp; Audits</T>
          </Badge>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white"><T>Verifiable Security Credentials</T></h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            <T>Orivraa is built on industry-standard security foundations. We rely on certified partner infrastructure to guarantee absolute safety:</T>
          </p>
        </ScrollReveal>

        <div className="grid gap-6 md:grid-cols-3">
          <ScrollReveal direction="up" delay={0.05} className="h-full">
            <Card className="border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-900/50 hover:shadow-lg transition-all duration-300 h-full gold-glow-hover">
              <CardContent className="pt-6 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-champagne-300"><T>Cloud Storage</T></span>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white"><T>AWS Shield &amp; KMS</T></h4>
                <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-450 leading-relaxed">
                  <T>All client inventory databases are hosted inside highly secure, multi-zone virtual clouds. Data at rest is encrypted via hardware security modules aligned with</T>{" "}
                  <a
                    href="https://aws.amazon.com/security/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-champagne-300 hover:underline font-bold transition-colors"
                  >
                    <T>AWS Cryptographic Security</T>
                  </a>.
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.12} className="h-full">
            <Card className="border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-900/50 hover:shadow-lg transition-all duration-300 h-full gold-glow-hover">
              <CardContent className="pt-6 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400"><T>Network Shield</T></span>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white"><T>Cloudflare DDoS Gate</T></h4>
                <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-450 leading-relaxed">
                  <T>We mitigate bots and potential network threats at the DNS boundary. Our API endpoints are protected under enterprise-grade web shield protocols, verified by</T>{" "}
                  <a
                    href="https://www.cloudflare.com/web-application-security/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-450 hover:underline font-bold transition-colors"
                  >
                    <T>Cloudflare Web Security</T>
                  </a>.
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2} className="h-full">
            <Card className="border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-900/50 hover:shadow-lg transition-all duration-300 h-full gold-glow-hover">
              <CardContent className="pt-6 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400"><T>Government Sync</T></span>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white"><T>BIS Hallmark HUID APIs</T></h4>
                <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-450 leading-relaxed">
                  <T>Counterfeit commodities are blocked at entry. Orivraa queries government HUID registration APIs in real-time, matching transaction lines directly with official hallmark records for total trade legitimacy.</T>
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Compliance Section */}
      <section className="max-w-4xl mx-auto px-4 pb-24 text-center space-y-8">
        <ScrollReveal direction="up" delay={0.05}>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white"><T>Compliance &amp; Reliability</T></h2>
        </ScrollReveal>
        <div className="grid gap-6 md:grid-cols-2">
          <ScrollReveal direction="left" delay={0.05}>
            <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-850 bg-white/40 dark:bg-gray-900/40 text-left space-y-2 h-full gold-glow-hover">
              <FileCheck2 className="h-6 w-6 text-champagne-300" />
              <h3 className="font-bold text-base text-gray-900 dark:text-white"><T>Regulatory Tax Alignment</T></h3>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                <T>Fully compliant with India GST (auto GSTR-1 formats), Nepal IRD VAT mandates, Dubai FTA regulations, UK Making Tax Digital (MTD), and European OSS standards.</T>
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={0.12}>
            <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-850 bg-white/40 dark:bg-gray-900/40 text-left space-y-2 h-full gold-glow-hover">
              <Globe2 className="h-6 w-6 text-blue-400" />
              <h3 className="font-bold text-base text-gray-900 dark:text-white"><T>Offline Counter POS Sync</T></h3>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                <T>Internet cuts will not block your counter. Our offline engine keeps billing safely in local client cache, auto-syncing to cloud datacenters immediately on reconnection.</T>
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Beautiful High-End Call to Action Section */}
      <section className="bg-gray-50 dark:bg-[#0E1117] py-20 text-center border-t border-gray-100 dark:border-gray-900/80">
        <ScrollReveal direction="up" delay={0.05} className="max-w-2xl mx-auto px-4 space-y-6">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center justify-center gap-2 text-gray-900 dark:text-white">
            <Sparkles className="h-6 w-6 text-champagne-300 fill-champagne-300 animate-pulse shrink-0" />
            <T>Precious stock deserves the most secure software.</T>
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-medium">
            <T>Start your 60-day Premium Pro trial today with zero risk. Export your ledger values at any point for free.</T>
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
            <Link href="/auth/register">
              <Button className="bg-champagne-300 hover:bg-champagne-400 text-gray-950 font-bold px-6 py-5 rounded-xl transition-all shadow-md active:scale-95 text-xs md:text-sm border-none">
                <T>Sign Up Now</T>
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                className="border border-gray-900 dark:border-white bg-white dark:bg-transparent text-gray-900 dark:text-white hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-[#0B0C10] font-semibold px-6 py-5 rounded-xl transition-all active:scale-95 text-xs md:text-sm shadow-sm"
              >
                <T>View Plan Rates</T>
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* Consistent Global Footer */}
      <DynamicFooter />
    </div>
  );
}

function Badge({ className, children, variant }: { className?: string; children: React.ReactNode; variant?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

