import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";

export type TaxPeriod = {
  from: Date;
  to: Date;
  label: string; // e.g. "2026-02" or "2026-Q1"
};

export interface InvoiceLineItem {
  label: string;
  category: string;
  amount: number;
  details?: string;
}

@Injectable()
export class TaxReportsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService,
  ) {}

  // ── Period helpers ────────────────────────────────────────────────
  parsePeriod(period: string): TaxPeriod {
    // YYYY-MM, YYYY-Qn, YYYY
    const m = period.match(/^(\d{4})-(\d{2})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      const from = new Date(Date.UTC(y, mo - 1, 1));
      const to = new Date(Date.UTC(y, mo, 1));
      return { from, to, label: period };
    }
    const q = period.match(/^(\d{4})-Q([1-4])$/i);
    if (q) {
      const y = parseInt(q[1], 10);
      const qn = parseInt(q[2], 10);
      const from = new Date(Date.UTC(y, (qn - 1) * 3, 1));
      const to = new Date(Date.UTC(y, qn * 3, 1));
      return { from, to, label: period.toUpperCase() };
    }
    const yr = period.match(/^(\d{4})$/);
    if (yr) {
      const y = parseInt(yr[1], 10);
      return {
        from: new Date(Date.UTC(y, 0, 1)),
        to: new Date(Date.UTC(y + 1, 0, 1)),
        label: period,
      };
    }
    // Default: current month
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { from, to, label: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}` };
  }

  private async fetchInvoices(shopId: string, p: TaxPeriod) {
    return this.prisma.invoice.findMany({
      where: {
        shopId,
        issuedAt: { gte: p.from, lt: p.to },
        status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID", "OVERDUE"] },
      },
      orderBy: { issuedAt: "asc" },
    });
  }

  // ── Universal summary ─────────────────────────────────────────────
  async getSummary(shopId: string, country: string, period: string) {
    const p = this.parsePeriod(period);
    const invoices = await this.fetchInvoices(shopId, p);

    const filtered = country
      ? invoices.filter((i) => (i.invoiceCountry || country) === country)
      : invoices;

    const totalSales = filtered.reduce((s, i) => s + i.totalAmount, 0);
    const taxableSales = filtered
      .filter((i) => !i.isTaxExempt)
      .reduce((s, i) => s + i.subtotal, 0);
    const exemptSales = filtered
      .filter((i) => i.isTaxExempt)
      .reduce((s, i) => s + i.subtotal, 0);
    const taxCollected = filtered.reduce((s, i) => s + i.taxAmount, 0);
    const b2bCount = filtered.filter((i) => i.customerType === "B2B").length;
    const b2cCount = filtered.filter((i) => i.customerType === "B2C").length;

    return {
      country,
      period: p.label,
      from: p.from,
      to: p.to,
      invoiceCount: filtered.length,
      totalSales,
      taxableSales,
      exemptSales,
      taxCollected,
      b2bCount,
      b2cCount,
      currency: filtered[0]?.currency || "NPR",
    };
  }

  // ── INDIA: GSTR-1 line-level rows ─────────────────────────────────
  async getIndiaGstr1(shopId: string, period: string) {
    const p = this.parsePeriod(period);
    const invoices = await this.fetchInvoices(shopId, p);
    const indiaInvoices = invoices.filter((i) => (i.invoiceCountry || "IN") === "IN");

    const homeStateCode = await this.getShopStateCode(shopId);

    const rows = indiaInvoices.map((i) => {
      const supplyState = i.placeOfSupply || homeStateCode || "";
      const isInterState = !!homeStateCode && !!supplyState && supplyState !== homeStateCode;
      const totalRate = i.taxRate || 0;
      const igst = isInterState ? i.taxAmount : 0;
      const cgst = isInterState ? 0 : i.taxAmount / 2;
      const sgst = isInterState ? 0 : i.taxAmount / 2;
      return {
        invoiceNumber: i.invoiceNumber,
        invoiceDate: i.issuedAt?.toISOString().slice(0, 10) || "",
        customerName: i.customerName,
        customerGstin: i.customerTaxId || "",
        customerType: i.customerType,
        placeOfSupply: supplyState,
        invoiceValue: i.totalAmount,
        taxableValue: i.subtotal,
        ratePercent: +(totalRate * 100).toFixed(2),
        igst: +igst.toFixed(2),
        cgst: +cgst.toFixed(2),
        sgst: +sgst.toFixed(2),
        hsn: i.hsnCode || "7113",
        isExempt: i.isTaxExempt,
        exemptReason: i.taxExemptReason || "",
      };
    });

    return { period: p.label, rows, count: rows.length };
  }

  // ── INDIA: GSTR-3B summary ─────────────────────────────────────────
  async getIndiaGstr3b(shopId: string, period: string) {
    const { rows } = await this.getIndiaGstr1(shopId, period);

    const outwardTaxable = rows.filter((r) => !r.isExempt).reduce((s, r) => s + r.taxableValue, 0);
    const outwardExempt = rows.filter((r) => r.isExempt).reduce((s, r) => s + r.taxableValue, 0);
    const igstSum = rows.reduce((s, r) => s + r.igst, 0);
    const cgstSum = rows.reduce((s, r) => s + r.cgst, 0);
    const sgstSum = rows.reduce((s, r) => s + r.sgst, 0);

    return {
      period,
      "3.1(a) Outward taxable supplies": +outwardTaxable.toFixed(2),
      "3.1(c) Other outward (nil/exempt)": +outwardExempt.toFixed(2),
      "Tax IGST": +igstSum.toFixed(2),
      "Tax CGST": +cgstSum.toFixed(2),
      "Tax SGST": +sgstSum.toFixed(2),
      "Total tax payable": +(igstSum + cgstSum + sgstSum).toFixed(2),
    };
  }

  // ── INDIA: HSN-wise summary (jewellery default 7113 = 3% GST) ─────
  async getIndiaHsnSummary(shopId: string, period: string) {
    const { rows } = await this.getIndiaGstr1(shopId, period);
    const map = new Map<string, { hsn: string; description: string; quantity: number; taxableValue: number; igst: number; cgst: number; sgst: number; total: number }>();
    for (const r of rows) {
      const key = r.hsn || "7113";
      const cur = map.get(key) || {
        hsn: key,
        description: key === "7113" ? "Articles of jewellery (precious metal)" : "Goods/Services",
        quantity: 0,
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        total: 0,
      };
      cur.quantity += 1;
      cur.taxableValue += r.taxableValue;
      cur.igst += r.igst;
      cur.cgst += r.cgst;
      cur.sgst += r.sgst;
      cur.total += r.invoiceValue;
      map.set(key, cur);
    }
    return Array.from(map.values()).map((r) => ({
      ...r,
      taxableValue: +r.taxableValue.toFixed(2),
      igst: +r.igst.toFixed(2),
      cgst: +r.cgst.toFixed(2),
      sgst: +r.sgst.toFixed(2),
      total: +r.total.toFixed(2),
    }));
  }

  // ── NEPAL: VAT return summary ──────────────────────────────────────
  async getNepalVat(shopId: string, period: string) {
    const p = this.parsePeriod(period);
    const invoices = await this.fetchInvoices(shopId, p);
    const np = invoices.filter((i) => (i.invoiceCountry || "NP") === "NP");

    let metalLuxuryBase = 0; // 2% luxury on gold metal+making
    let vatBase = 0; // 13% on gemstones/services
    let exempt = 0;
    let totalTax = 0;

    for (const i of np) {
      if (i.isTaxExempt) {
        exempt += i.subtotal;
        continue;
      }
      const lines = (i.lineItems as unknown as InvoiceLineItem[]) || [];
      for (const l of lines) {
        if (["METAL", "MAKING"].includes(l.category)) metalLuxuryBase += l.amount;
        else if (["GEMSTONE", "FINISH"].includes(l.category)) vatBase += l.amount;
      }
      totalTax += i.taxAmount;
    }

    return {
      period: p.label,
      invoiceCount: np.length,
      "Gold metal + making (2% luxury)": +metalLuxuryBase.toFixed(2),
      "Luxury tax payable": +(metalLuxuryBase * 0.02).toFixed(2),
      "Gemstones / services (13% VAT)": +vatBase.toFixed(2),
      "VAT payable": +(vatBase * 0.13).toFixed(2),
      "Exempt sales": +exempt.toFixed(2),
      "Total tax collected": +totalTax.toFixed(2),
    };
  }

  // ── UAE: VAT 201 buckets ───────────────────────────────────────────
  async getUaeVat201(shopId: string, period: string) {
    const p = this.parsePeriod(period);
    const invoices = await this.fetchInvoices(shopId, p);
    const ae = invoices.filter((i) => (i.invoiceCountry || "AE") === "AE");

    const standard = ae.filter((i) => !i.isTaxExempt && i.taxRate > 0);
    const zeroRated = ae.filter((i) => !i.isTaxExempt && i.taxRate === 0 && i.taxExemptReason === "EXPORT");
    const exempt = ae.filter((i) => i.isTaxExempt && i.taxExemptReason !== "EXPORT");

    return {
      period: p.label,
      "Box 1a Standard rated supplies (Dubai)": +standard.reduce((s, i) => s + i.subtotal, 0).toFixed(2),
      "Box 1a Output VAT (5%)": +standard.reduce((s, i) => s + i.taxAmount, 0).toFixed(2),
      "Box 4 Zero-rated supplies": +zeroRated.reduce((s, i) => s + i.subtotal, 0).toFixed(2),
      "Box 5 Exempt supplies": +exempt.reduce((s, i) => s + i.subtotal, 0).toFixed(2),
      "Box 6 Reverse charge": 0,
      "Total sales": +ae.reduce((s, i) => s + i.totalAmount, 0).toFixed(2),
      invoiceCount: ae.length,
    };
  }

  // ── UK: MTD 9-box VAT return ───────────────────────────────────────
  async getUkMtdNineBox(shopId: string, period: string) {
    const p = this.parsePeriod(period);
    const invoices = await this.fetchInvoices(shopId, p);
    const uk = invoices.filter((i) => (i.invoiceCountry || "GB") === "GB");

    const box1 = uk.reduce((s, i) => s + (i.isTaxExempt ? 0 : i.taxAmount), 0); // VAT on sales
    const box6 = uk.reduce((s, i) => s + i.subtotal, 0); // Total sales ex-VAT
    const box8 = 0; // EU goods (post-Brexit usually 0)

    return {
      period: p.label,
      "Box 1 VAT due on sales": +box1.toFixed(2),
      "Box 2 VAT due on EU acquisitions": 0,
      "Box 3 Total VAT due": +box1.toFixed(2),
      "Box 4 VAT reclaimed on purchases": 0,
      "Box 5 Net VAT to pay": +box1.toFixed(2),
      "Box 6 Total sales ex-VAT": +box6.toFixed(2),
      "Box 7 Total purchases ex-VAT": 0,
      "Box 8 EU goods supplies": +box8.toFixed(2),
      "Box 9 EU goods acquisitions": 0,
      invoiceCount: uk.length,
      _note: "Investment gold (995+ purity) is VAT exempt under UK Notice 701/21A. Mark such invoices as tax-exempt with reason INVESTMENT_GOLD.",
    };
  }

  // ── EU: OSS distance-sales by destination country ─────────────────
  async getEuOss(shopId: string, period: string) {
    const p = this.parsePeriod(period);
    const invoices = await this.fetchInvoices(shopId, p);
    const EU_CODES = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"];
    const eu = invoices.filter((i) => i.invoiceCountry && EU_CODES.includes(i.invoiceCountry));

    const map = new Map<string, { country: string; netSales: number; vatRate: number; vatAmount: number; invoiceCount: number }>();
    for (const i of eu) {
      const c = i.invoiceCountry!;
      const cur = map.get(c) || { country: c, netSales: 0, vatRate: i.taxRate, vatAmount: 0, invoiceCount: 0 };
      cur.netSales += i.subtotal;
      cur.vatAmount += i.taxAmount;
      cur.invoiceCount += 1;
      map.set(c, cur);
    }
    return {
      period: p.label,
      rows: Array.from(map.values()).map((r) => ({
        ...r,
        netSales: +r.netSales.toFixed(2),
        vatRate: +(r.vatRate * 100).toFixed(2),
        vatAmount: +r.vatAmount.toFixed(2),
      })),
    };
  }

  // ── US: state-by-state nexus summary ──────────────────────────────
  async getUsStateSummary(shopId: string, period: string) {
    const p = this.parsePeriod(period);
    const invoices = await this.fetchInvoices(shopId, p);
    const us = invoices.filter((i) => (i.invoiceCountry || "US") === "US");

    const map = new Map<string, { state: string; invoiceCount: number; netSales: number; salesTax: number }>();
    for (const i of us) {
      const s = i.placeOfSupply || "UNKNOWN";
      const cur = map.get(s) || { state: s, invoiceCount: 0, netSales: 0, salesTax: 0 };
      cur.invoiceCount += 1;
      cur.netSales += i.subtotal;
      cur.salesTax += i.taxAmount;
      map.set(s, cur);
    }
    return {
      period: p.label,
      rows: Array.from(map.values()).map((r) => ({
        ...r,
        netSales: +r.netSales.toFixed(2),
        salesTax: +r.salesTax.toFixed(2),
      })),
      _note: "Economic nexus thresholds vary by state ($100k or 200 transactions in most). Cross-check before filing.",
    };
  }

  // ── CSV writer (streamed-style, in-memory for typical SMB volume) ─
  toCsv(rows: Record<string, any>[]): string {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(","));
    return lines.join("\n");
  }

  // ── Tally XML envelope (basic vouchers export) ─────────────────────
  async getTallyXml(shopId: string, period: string): Promise<string> {
    const p = this.parsePeriod(period);
    const invoices = await this.fetchInvoices(shopId, p);

    const vouchers = invoices
      .map((i) => {
        const date = (i.issuedAt || i.createdAt).toISOString().slice(0, 10).replace(/-/g, "");
        const xmlEscape = (s: string) =>
          s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `
    <VOUCHER VCHTYPE="Sales" ACTION="Create">
      <DATE>${date}</DATE>
      <VOUCHERNUMBER>${xmlEscape(i.invoiceNumber)}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${xmlEscape(i.customerName)}</PARTYLEDGERNAME>
      <REFERENCE>${xmlEscape(i.invoiceNumber)}</REFERENCE>
      <NARRATION>Sale invoice ${xmlEscape(i.invoiceNumber)} via Orivraa</NARRATION>
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${xmlEscape(i.customerName)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${i.totalAmount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Sales Account</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${i.subtotal.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      ${
        i.taxAmount > 0
          ? `<ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Output Tax</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${i.taxAmount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`
          : ""
      }
    </VOUCHER>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        ${vouchers}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }

  // ── Audit log + IP hashing (GDPR safe) ────────────────────────────
  async logExport(opts: {
    shopId: string;
    exportType: string;
    country: string;
    period: string;
    format: string;
    requestedBy?: string;
    ip?: string;
    rowCount?: number;
    shareToken?: string;
    shareExpiresAt?: Date;
  }) {
    const ipHash = opts.ip ? createHash("sha256").update(opts.ip).digest("hex").slice(0, 32) : null;
    return this.prisma.taxExportLog.create({
      data: {
        shopId: opts.shopId,
        exportType: opts.exportType,
        country: opts.country,
        period: opts.period,
        format: opts.format,
        requestedBy: opts.requestedBy || null,
        ipHash,
        rowCount: opts.rowCount || 0,
        shareToken: opts.shareToken || null,
        shareExpiresAt: opts.shareExpiresAt || null,
      },
    });
  }

  // ── CA share link: signed JWT, 7-day expiry ───────────────────────
  generateShareToken(shopId: string, country: string, period: string, ttlDays = 7) {
    const secret = this.config.get<string>("JWT_SECRET") || "dev-secret-do-not-use";
    const expiresIn = ttlDays * 24 * 60 * 60;
    const token = this.jwt.sign(
      { shopId, country, period, scope: "tax-share" },
      { secret, expiresIn },
    );
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return { token, expiresAt };
  }

  verifyShareToken(token: string): { shopId: string; country: string; period: string } {
    const secret = this.config.get<string>("JWT_SECRET") || "dev-secret-do-not-use";
    try {
      const payload = this.jwt.verify(token, { secret }) as any;
      if (payload.scope !== "tax-share") throw new ForbiddenException("Invalid share token");
      return { shopId: payload.shopId, country: payload.country, period: payload.period };
    } catch {
      throw new NotFoundException("Share link invalid or expired");
    }
  }

  // ── Helper: shop home state for IGST detection ────────────────────
  private async getShopStateCode(shopId: string): Promise<string | null> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { state: true },
    });
    return shop?.state || null;
  }

  // ── Admin: tax filing usage stats ────────────────────────────────
  async getAdminTaxStats() {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOf7d = new Date(Date.now() - 7 * 86400000);

    const [total, thisMonth, last7d, byType, byCountry, topShops, caShares] =
      await Promise.all([
        this.prisma.taxExportLog.count(),
        this.prisma.taxExportLog.count({ where: { createdAt: { gte: startOfMonth } } }),
        this.prisma.taxExportLog.count({ where: { createdAt: { gte: startOf7d } } }),
        this.prisma.taxExportLog.groupBy({
          by: ["exportType"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
        this.prisma.taxExportLog.groupBy({
          by: ["country"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
        this.prisma.taxExportLog.groupBy({
          by: ["shopId"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
        this.prisma.taxExportLog.count({ where: { exportType: "CA_SHARE" } }),
      ]);

    const uniqueShops = (
      await this.prisma.taxExportLog.findMany({
        select: { shopId: true },
        distinct: ["shopId"],
      })
    ).length;

    return {
      total,
      thisMonth,
      last7d,
      uniqueShops,
      caShares,
      byType: byType.map((g) => ({ type: g.exportType, count: g._count.id })),
      byCountry: byCountry.map((g) => ({ country: g.country, count: g._count.id })),
      topShops: topShops.map((g) => ({ shopId: g.shopId, exports: g._count.id })),
    };
  }
}
