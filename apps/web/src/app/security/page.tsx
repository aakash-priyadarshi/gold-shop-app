"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND } from "@/config/brand";
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

export default function SecurityTrustPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-amber-50/10 dark:from-[#0B0C10] dark:via-[#0B0C10] dark:to-[#0B0C10] text-gray-900 dark:text-gray-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#161B22]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo variant="icon" size="sm" />
            <span className="font-bold text-lg tracking-tight">{BRAND.name}</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm font-semibold hover:text-amber-500 transition-colors">
              Pricing
            </Link>
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider mx-auto">
          🔒 Bank-Grade Security &amp; Trust
        </Badge>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
          How Orivraa Establishes <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">Elite Safety</span> for Modern Jewelers
        </h1>
        <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Precious commodities demand uncompromising cybersecurity. Orivraa integrates cloud architecture, hardware scanning protocols, and real-time ledger protection to keep your shop secure.
        </p>
      </header>

      {/* Trust Pillars */}
      <section className="max-w-5xl mx-auto px-4 pb-24 grid gap-6 md:grid-cols-3">
        <Card className="border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/50 shadow-sm backdrop-blur-md">
          <CardContent className="pt-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg">Bank-Grade Encryption</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              All data in transit is protected using elite TLS 1.3 encryption. At rest, precious inventory tables, transactional ledgers, and customer profiles are shielded with AES-256 encryption.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/50 shadow-sm backdrop-blur-md">
          <CardContent className="pt-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg">Daily Automated Backups</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Never worry about system failure or data loss. Orivraa runs hourly database snapshots with redundant cloud backups, permitting point-in-time recovery for business resilience.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/50 shadow-sm backdrop-blur-md">
          <CardContent className="pt-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-500 flex items-center justify-center">
              <ServerCrash className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg">Regional Data Sovereignty</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Your data is stored in isolated, state-of-the-art datacenters located within your home country (India, UAE, UK, or EU) to comply with local financial laws.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Advanced Hardware Integration Section */}
      <section className="bg-gray-100/50 dark:bg-gray-900/20 py-20 border-t border-b border-gray-200/50 dark:border-gray-800/40">
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
            <ul className="space-y-3 text-xs">
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
            <Card className="border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl w-72 max-w-full">
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
      <section className="max-w-4xl mx-auto px-4 py-16 space-y-8 border-t dark:border-gray-800/60">
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
          <Card className="border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50">
            <CardContent className="pt-6 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Cloud Storage</span>
              <h4 className="font-bold text-sm">AWS Shield &amp; KMS</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                All client inventory databases are hosted inside highly secure, multi-zone virtual clouds. Data at rest is encrypted via hardware security modules aligned with <a href="https://aws.amazon.com/security/" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline font-semibold">AWS Cryptographic Security</a>.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50">
            <CardContent className="pt-6 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Network Shield</span>
              <h4 className="font-bold text-sm">Cloudflare DDoS Gate</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                We mitigate bots and potential network threads at the DNS boundary. Our API endpoints are protected under enterprise-grade web shield protocols, verified by <a href="https://www.cloudflare.com/web-application-security/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline font-semibold">Cloudflare Web Security</a>.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50">
            <CardContent className="pt-6 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Government Sync</span>
              <h4 className="font-bold text-sm">BIS Hallmark HUID APIs</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
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
          <div className="p-5 rounded-2xl border dark:border-gray-800 bg-white/40 text-left space-y-2">
            <FileCheck2 className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-sm">Regulatory Tax Alignment</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fully compliant with India GST (auto GSTR-1 formats), Nepal IRD VAT mandates, Dubai FTA regulations, UK Making Tax Digital (MTD), and European OSS standards.
            </p>
          </div>
          <div className="p-5 rounded-2xl border dark:border-gray-800 bg-white/40 text-left space-y-2">
            <Globe2 className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-sm">Offline Counter POS Sync</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Internet cuts will not block your counter. Our offline engine keeps billing safely in local client cache, auto-syncing to cloud datacenters immediately on reconnection.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-gray-950 text-white py-16 text-center space-y-6">
        <h2 className="text-xl md:text-2xl font-bold flex items-center justify-center gap-1.5">
          <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500 animate-pulse" />
          Precious stock deserves the most secure software.
        </h2>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Start your 60-day Premium Pro trial today with zero risk. Export your ledger values at any point for free.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link href="/auth/register">
            <Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
              Sign Up Now
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" className="border-gray-800 hover:bg-gray-900 text-white">
              View Plan Rates
            </Button>
          </Link>
        </div>
      </footer>
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
