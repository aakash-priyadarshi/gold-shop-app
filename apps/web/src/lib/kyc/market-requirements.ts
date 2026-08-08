export interface KycIdentifierValues {
  panNumber: string;
  vatNumber: string;
  bisLicenseNumber: string;
}

export interface KycIdentifierConfig {
  panLabel: string;
  panPlaceholder: string;
  vatLabel: string;
  vatPlaceholder: string;
  businessLabel: string;
  businessPlaceholder: string;
  vatRequired: boolean;
  businessRequired: boolean;
}

const GENERIC_CONFIG: KycIdentifierConfig = {
  panLabel: "Tax ID / PAN Number",
  panPlaceholder: "Enter official Tax ID",
  vatLabel: "VAT / GST Number (Optional)",
  vatPlaceholder: "Enter VAT or GSTIN number",
  businessLabel: "Business / Registration License (Optional)",
  businessPlaceholder: "Enter registration authority number",
  vatRequired: false,
  businessRequired: false,
};

const SRI_LANKA_CONFIG: KycIdentifierConfig = {
  panLabel: "IRD TIN (9 digits)",
  panPlaceholder: "123456789",
  vatLabel: "VAT Registration TIN (9 digits)",
  vatPlaceholder: "123456789",
  businessLabel: "Business Registration Number",
  businessPlaceholder: "Enter Sri Lankan business registration number",
  vatRequired: true,
  businessRequired: true,
};

export function getKycIdentifierConfig(country?: string): KycIdentifierConfig {
  return country?.trim().toUpperCase() === "LK"
    ? SRI_LANKA_CONFIG
    : GENERIC_CONFIG;
}

export function validateKycIdentifiers(
  country: string | undefined,
  values: KycIdentifierValues,
): string[] {
  if (country?.trim().toUpperCase() !== "LK") return [];

  const errors: string[] = [];
  if (!/^\d{9}$/.test(values.panNumber.trim())) {
    errors.push("IRD TIN must be exactly 9 digits.");
  }
  if (!/^\d{9}$/.test(values.vatNumber.trim())) {
    errors.push("VAT registration TIN must be exactly 9 digits.");
  }
  if (!values.bisLicenseNumber.trim()) {
    errors.push("Business registration number is required.");
  }
  return errors;
}
