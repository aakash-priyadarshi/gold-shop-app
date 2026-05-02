/**
 * Tax registration ID validators (sync, regex-based).
 * Mirrored shapes for backend usage as needed.
 */

export type TaxIdKind =
  | "GSTIN"      // India
  | "PAN_IN"     // India PAN
  | "TRN_AE"     // UAE TRN
  | "VAT_GB"     // UK VAT
  | "VAT_EU"     // EU VAT (DE, FR, IT, ES, NL, ...)
  | "PAN_NP"     // Nepal PAN/VAT (9-digit)
  | "EIN_US"     // US EIN
  | "GENERIC";

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const PAN_IN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const TRN_AE_RE = /^[0-9]{15}$/;
const VAT_GB_RE = /^GB[0-9]{9}$|^GB[0-9]{12}$|^GBGD[0-9]{3}$|^GBHA[0-9]{3}$/;
const VAT_EU_RE = /^(AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK)[0-9A-Z]{2,12}$/;
const PAN_NP_RE = /^[0-9]{9}$/;
const EIN_US_RE = /^[0-9]{2}-[0-9]{7}$/;

export interface TaxIdValidationResult {
  valid: boolean;
  kind: TaxIdKind;
  message?: string;
  // Extracted info
  stateCode?: string; // GSTIN first 2 digits
  countryCode?: string; // EU/UK
}

export function detectTaxIdKind(country: string): TaxIdKind {
  const c = country.toUpperCase();
  if (c === "IN") return "GSTIN";
  if (c === "AE") return "TRN_AE";
  if (c === "GB" || c === "UK") return "VAT_GB";
  if (c === "NP") return "PAN_NP";
  if (c === "US") return "EIN_US";
  if (["AT","BE","BG","CY","CZ","DE","DK","EE","EL","ES","FI","FR","HR","HU","IE","IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK","GR"].includes(c)) return "VAT_EU";
  return "GENERIC";
}

export function validateTaxId(
  value: string | null | undefined,
  kindOrCountry: TaxIdKind | string,
): TaxIdValidationResult {
  const v = (value || "").trim().toUpperCase();
  const kind: TaxIdKind = (Object.values({ GSTIN: 1, PAN_IN: 1, TRN_AE: 1, VAT_GB: 1, VAT_EU: 1, PAN_NP: 1, EIN_US: 1, GENERIC: 1 }).length && (kindOrCountry as TaxIdKind))
    || detectTaxIdKind(kindOrCountry);
  // Resolve when caller passes a country code instead of kind
  const resolvedKind = (["GSTIN","PAN_IN","TRN_AE","VAT_GB","VAT_EU","PAN_NP","EIN_US","GENERIC"] as TaxIdKind[]).includes(kindOrCountry as TaxIdKind)
    ? (kindOrCountry as TaxIdKind)
    : detectTaxIdKind(kindOrCountry);

  if (!v) return { valid: false, kind: resolvedKind, message: "Tax ID is required" };

  switch (resolvedKind) {
    case "GSTIN":
      if (!GSTIN_RE.test(v)) return { valid: false, kind, message: "GSTIN must be 15 chars: 22AAAAA0000A1Z5" };
      return { valid: true, kind: "GSTIN", stateCode: v.slice(0, 2) };
    case "PAN_IN":
      if (!PAN_IN_RE.test(v)) return { valid: false, kind, message: "PAN must be 10 chars: ABCDE1234F" };
      return { valid: true, kind: "PAN_IN" };
    case "TRN_AE":
      if (!TRN_AE_RE.test(v)) return { valid: false, kind, message: "UAE TRN must be 15 digits" };
      return { valid: true, kind: "TRN_AE", countryCode: "AE" };
    case "VAT_GB":
      if (!VAT_GB_RE.test(v)) return { valid: false, kind, message: "UK VAT must be GB followed by 9 or 12 digits" };
      return { valid: true, kind: "VAT_GB", countryCode: "GB" };
    case "VAT_EU":
      if (!VAT_EU_RE.test(v)) return { valid: false, kind, message: "EU VAT must start with country code (e.g. DE123456789)" };
      return { valid: true, kind: "VAT_EU", countryCode: v.slice(0, 2) };
    case "PAN_NP":
      if (!PAN_NP_RE.test(v)) return { valid: false, kind, message: "Nepal PAN/VAT must be 9 digits" };
      return { valid: true, kind: "PAN_NP", countryCode: "NP" };
    case "EIN_US":
      if (!EIN_US_RE.test(v)) return { valid: false, kind, message: "US EIN must be XX-XXXXXXX" };
      return { valid: true, kind: "EIN_US", countryCode: "US" };
    default:
      // Generic: at least 5 alphanumeric chars
      if (!/^[A-Z0-9-]{5,}$/.test(v)) return { valid: false, kind: "GENERIC", message: "Tax ID looks invalid" };
      return { valid: true, kind: "GENERIC" };
  }
}

// India state code → name (first 2 digits of GSTIN map to state)
export const INDIA_STATE_BY_GSTIN_PREFIX: Record<string, string> = {
  "01": "Jammu and Kashmir","02": "Himachal Pradesh","03": "Punjab","04": "Chandigarh",
  "05": "Uttarakhand","06": "Haryana","07": "Delhi","08": "Rajasthan","09": "Uttar Pradesh",
  "10": "Bihar","11": "Sikkim","12": "Arunachal Pradesh","13": "Nagaland","14": "Manipur",
  "15": "Mizoram","16": "Tripura","17": "Meghalaya","18": "Assam","19": "West Bengal",
  "20": "Jharkhand","21": "Odisha","22": "Chhattisgarh","23": "Madhya Pradesh","24": "Gujarat",
  "27": "Maharashtra","29": "Karnataka","30": "Goa","32": "Kerala","33": "Tamil Nadu",
  "34": "Puducherry","36": "Telangana","37": "Andhra Pradesh","38": "Ladakh",
};

export const TAX_EXEMPT_REASONS = [
  { value: "EXPORT", label: "Export sale (zero-rated)" },
  { value: "COMPOSITE", label: "Composite dealer scheme" },
  { value: "REVERSE_CHARGE", label: "Reverse charge mechanism" },
  { value: "THRESHOLD", label: "Below registration threshold" },
  { value: "INVESTMENT_GOLD", label: "Investment gold (995+ purity)" },
  { value: "OTHER", label: "Other (specify in notes)" },
];

export const COUNTRIES = [
  { code: "NP", name: "Nepal", currency: "NPR" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "AE", name: "UAE", currency: "AED" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "NL", name: "Netherlands", currency: "EUR" },
  { code: "US", name: "United States", currency: "USD" },
];
