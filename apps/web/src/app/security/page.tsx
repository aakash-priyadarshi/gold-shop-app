"use client";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-h-screen bg-white dark:bg-[#0B0C10] text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Dynamic Gemini Fluid Background Animation Styles */}
      <style jsx global>{`
        @keyframes gemini-flow-light {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes gemini-flow-dark {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .gemini-bg-light {
          background: linear-gradient(-45deg, #eef2ff, #e0e7ff, #f3e8ff, #fae8ff, #e0f2fe);
          background-size: 400% 400%;
          animation: gemini-flow-light 12s ease infinite;
        }
        .gemini-bg-dark {
          background: linear-gradient(-45deg, #070913, #0b1129, #14112e, #1a0b36, #091322);
          background-size: 400% 400%;
          animation: gemini-flow-dark 15s ease infinite;
        }
      `}</style>

      {/* Consistent Global Navigation Header */}
      <Header />

      {/* World-Class Animated Hero Section */}
      <header className="relative overflow-hidden py-24 md:py-32 border-b border-gray-100 dark:border-gray-900/60 gemini-bg-light dark:gemini-bg-dark transition-all duration-500">
        {/* Soft decorative background blurs */}
        <div className="absolute top-1/4 left-1/10 w-72 h-72 rounded-full bg-blue-400/10 dark:bg-blue-500/5 blur-3xl -z-10" />
        <div className="absolute bottom-1/4 right-1/10 w-96 h-96 rounded-full bg-purple-400/10 dark:bg-purple-500/5 blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-3 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider mx-auto backdrop-blur-sm">
            🔒 Bank-Grade Security &amp; Trust
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-gray-900 dark:text-white">
            How Orivraa Establishes <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Elite Safety</span> for Modern Jewelers
          </h1>
          <p className="text-base md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed font-medium">
            Precious commodities demand uncompromising cybersecurity. Orivraa integrates cloud architecture, hardware scanning protocols, and real-time ledger protection to keep your shop secure.
          </p>
        </div>
      </header>

      {/* Trust Pillars */}
      <section className="max-w-6xl mx-auto px-4 py-20 grid gap-8 md:grid-cols-3">
        <Card className="border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/50 shadow-md backdrop-blur-md hover:-translate-y-1 transition-all duration-300">
          <CardContent className="pt-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center shadow-sm">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg">Bank-Grade Encryption</h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-450 leading-relaxed">
              All data in transit is protected using elite TLS 1.3 encryption. At rest, precious inventory tables, transactional ledgers, and customer profiles are shielded with AES-256 encryption.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/50 shadow-md backdrop-blur-md hover:-translate-y-1 transition-all duration-300">
          <CardContent className="pt-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center shadow-sm">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg">Daily Automated Backups</h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-450 leading-relaxed">
              Never worry about system failure or data loss. Orivraa runs hourly database snapshots with redundant cloud backups, permitting point-in-time recovery for business resilience.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/50 shadow-md backdrop-blur-md hover:-translate-y-1 transition-all duration-300">
          <CardContent className="pt-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-500 flex items-center justify-center shadow-sm">
              <ServerCrash className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg">Regional Data Sovereignty</h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-450 leading-relaxed">
              Your data is stored in isolated, state-of-the-art datacenters located within your home country (India, UAE, UK, or EU) to comply with local financial laws.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Advanced Hardware Integration Section */}
      <section className="bg-gray-50/50 dark:bg-gray-900/20 py-24 border-t border-b border-gray-200/50 dark:border-gray-800/40">
        <div className="max-w-5xl mx-auto px-4 grid gap-12 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider">
              📟 POS Hardware Safety
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Biometrics, Barcodes &amp; RFID Stock Security
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Safeguarding high-value assets requires more than virtual firewalls. Orivraa integrates seamlessly with hardware security layers right at the checkout counter:
            </p>
            <ul className="space-y-3 text-xs md:text-sm">
              <li className="flex items-center gap-2 font-medium">
                <Fingerprint className="h-4 w-4 text-emerald-500" />
                <span><strong>Biometric Staff Scan:</strong> Restricts high-clearance actions like inventory adjustments, discount approvals, or daily registers to verified fingerprint scans.</span>
              </li>
              <li className="flex items-center gap-2 font-medium">
                <Scan className="h-4 w-4 text-amber-500" />
                <span><strong>RFID Tag Integration:</strong> Fast-tracks morning showcases stock audit, counting hundreds of gold ornaments simultaneously to detect shrinkage in minutes.</span>
              </li>
              <li className="flex items-center gap-2 font-medium">
                <Cpu className="h-4 w-4 text-blue-500" />
                <span><strong>BIS Hallmark &amp; HUID Tracking:</strong> Every piece is bound to its unique Government Hallmark ID, protecting you against counterfeit stock.</span>
              </li>
            </ul>
          </div>
          <div className="relative flex justify-center">
            <div className="w-80 h-80 rounded-full bg-amber-500/5 border border-amber-500/20 absolute -z-10 animate-pulse" />
            <Card className="border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl w-72 max-w-full">
              <CardContent className="pt-6 space-y-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center shadow-inner">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-sm">Security Proof Checklist</h3>
                <div className="text-left space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs border-b dark:border-gray-800 pb-1.5">
                    <span className="text-muted-foreground">TLS 1.3 In-Transit</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] px-1 py-0">Elite</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b dark:border-gray-800 pb-1.5">
                    <span className="text-muted-foreground">ISO 27001 Ready</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] px-1 py-0">Certified</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b dark:border-gray-800 pb-1.5">
                    <span className="text-muted-foreground">Biometric Staff Auth</span>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px] px-1 py-0">Supported</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="text-muted-foreground">Automated Daily Seed</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] px-1 py-0">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Infrastructure Verification Section */}
      <section className="max-w-5xl mx-auto px-4 py-24 space-y-10 border-t dark:border-gray-800/60">
        <div className="text-center space-y-3">
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider">
            🛡️ Verified Infrastructure &amp; Audits
          </Badge>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Verifiable Security Credentials</h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Orivraa is built on industry-standard security foundations. We rely on certified partner infrastructure to guarantee absolute safety:
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Cloud Storage</span>
              <h4 className="font-bold text-sm">AWS Shield &amp; KMS</h4>
              <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                All client inventory databases are hosted inside highly secure, multi-zone virtual clouds. Data at rest is encrypted via hardware security modules aligned with <a href="https://aws.amazon.com/security/" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-600 underline font-semibold transition-colors">AWS Cryptographic Security</a>.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Network Shield</span>
              <h4 className="font-bold text-sm">Cloudflare DDoS Gate</h4>
              <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                We mitigate bots and potential network threats at the DNS boundary. Our API endpoints are protected under enterprise-grade web shield protocols, verified by <a href="https://www.cloudflare.com/web-application-security/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline font-semibold transition-colors">Cloudflare Web Security</a>.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Government Sync</span>
              <h4 className="font-bold text-sm">BIS Hallmark HUID APIs</h4>
              <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Counterfeit commodities are blocked at entry. Orivraa queries government HUID registration APIs in real-time, matching transaction lines directly with official hallmark records for total trade legitimacy.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Compliance Section */}
      <section className="max-w-4xl mx-auto px-4 pb-24 text-center space-y-8">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Compliance &amp; Reliability</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 text-left space-y-2">
            <FileCheck2 className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-sm">Regulatory Tax Alignment</h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Fully compliant with India GST (auto GSTR-1 formats), Nepal IRD VAT mandates, Dubai FTA regulations, UK Making Tax Digital (MTD), and European OSS standards.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 text-left space-y-2">
            <Globe2 className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-sm">Offline Counter POS Sync</h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Internet cuts will not block your counter. Our offline engine keeps billing safely in local client cache, auto-syncing to cloud datacenters immediately on reconnection.
            </p>
          </div>
        </div>
      </section>

      {/* Beautiful High-End Call to Action Section */}
      <section className="bg-gray-50 dark:bg-[#0E1117] py-20 text-center border-t border-gray-100 dark:border-gray-900/80">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center justify-center gap-1.5 text-gray-900 dark:text-white">
            <Sparkles className="h-6 w-6 text-amber-500 fill-amber-500 animate-pulse" />
            Precious stock deserves the most secure software.
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Start your 60-day Premium Pro trial today with zero risk. Export your ledger values at any point for free.
          </p>
          <div className="flex justify-center items-center gap-4 pt-2">
            <Link href="/auth/register">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-5 rounded-xl transition-all shadow-md active:scale-95 text-xs md:text-sm">
                Sign Up Now
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold px-6 py-5 rounded-xl transition-all active:scale-95 text-xs md:text-sm"
              >
                View Plan Rates
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Consistent Global Footer */}
      <DynamicFooter />
    </div>
  );
}

function Badge({ className, children, variant }: { className?: string; children: React.ReactNode; variant?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}
