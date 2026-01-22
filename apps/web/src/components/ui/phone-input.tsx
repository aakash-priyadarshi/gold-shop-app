"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { forwardRef, useCallback, useMemo } from "react";

// Supported countries with phone codes and flags
export const SUPPORTED_PHONE_COUNTRIES = [
  {
    code: "NP",
    name: "Nepal",
    flag: "🇳🇵",
    dialCode: "+977",
    minLength: 10,
    maxLength: 10,
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    dialCode: "+91",
    minLength: 10,
    maxLength: 10,
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    dialCode: "+1",
    minLength: 10,
    maxLength: 10,
  },
  {
    code: "AE",
    name: "UAE",
    flag: "🇦🇪",
    dialCode: "+971",
    minLength: 9,
    maxLength: 9,
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    dialCode: "+44",
    minLength: 10,
    maxLength: 10,
  },
] as const;

// EU country dial codes (excluding UK) - these will show EU flag 🇪🇺
const EU_DIAL_CODES = [
  "+43", // Austria
  "+32", // Belgium
  "+359", // Bulgaria
  "+385", // Croatia
  "+357", // Cyprus
  "+420", // Czech Republic
  "+45", // Denmark
  "+372", // Estonia
  "+358", // Finland
  "+33", // France
  "+49", // Germany
  "+30", // Greece
  "+36", // Hungary
  "+353", // Ireland
  "+39", // Italy
  "+371", // Latvia
  "+370", // Lithuania
  "+352", // Luxembourg
  "+356", // Malta
  "+31", // Netherlands
  "+48", // Poland
  "+351", // Portugal
  "+40", // Romania
  "+421", // Slovakia
  "+386", // Slovenia
  "+34", // Spain
  "+46", // Sweden
];

export type SupportedCountryCode =
  (typeof SUPPORTED_PHONE_COUNTRIES)[number]["code"];

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  showValidationHint?: boolean;
}

/**
 * Detect flag based on phone number input
 * Returns: { flag: emoji, isSupported: boolean, needsCountryCode: boolean }
 */
function detectPhoneFlag(phone: string): {
  flag: string | null;
  isSupported: boolean;
  needsCountryCode: boolean;
  countryCode: SupportedCountryCode | "EU" | null;
} {
  if (!phone || phone.trim() === "") {
    return {
      flag: null,
      isSupported: false,
      needsCountryCode: false,
      countryCode: null,
    };
  }

  const cleaned = phone.replace(/\s/g, "");

  // Check if starts with + (has country code)
  if (!cleaned.startsWith("+")) {
    return {
      flag: null,
      isSupported: false,
      needsCountryCode: true,
      countryCode: null,
    };
  }

  // Check supported countries first (order by dial code length descending to match longer codes first)
  const sortedCountries = [...SUPPORTED_PHONE_COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  for (const country of sortedCountries) {
    if (cleaned.startsWith(country.dialCode)) {
      return {
        flag: country.flag,
        isSupported: true,
        needsCountryCode: false,
        countryCode: country.code,
      };
    }
  }

  // Check EU countries (sort by length descending)
  const sortedEU = [...EU_DIAL_CODES].sort((a, b) => b.length - a.length);
  for (const dialCode of sortedEU) {
    if (cleaned.startsWith(dialCode)) {
      return {
        flag: "🇪🇺",
        isSupported: false,
        needsCountryCode: false,
        countryCode: "EU",
      };
    }
  }

  // Has + but unrecognized country code
  return {
    flag: null,
    isSupported: false,
    needsCountryCode: false,
    countryCode: null,
  };
}

/**
 * Phone input component with automatic flag detection
 * - Single unified input field
 * - Shows flag emoji based on country code typed
 * - Shows EU flag 🇪🇺 for EU countries (except UK)
 * - Prompts for country code if not entered
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value = "",
      onChange,
      onBlur,
      placeholder = "+977 9812345678",
      disabled = false,
      error = false,
      className,
      id,
      name,
      required,
      showValidationHint = true,
    },
    ref
  ) => {
    // Detect flag and validation state
    const phoneState = useMemo(() => detectPhoneFlag(value), [value]);

    // Handle input change - allow + at start, then only digits and spaces
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value;

        // Filter: allow + at start, then digits and spaces only
        let result = "";
        for (let i = 0; i < input.length; i++) {
          const char = input[i];
          if (i === 0 && char === "+") {
            result += char;
          } else if (/[\d\s]/.test(char)) {
            result += char;
          }
        }

        onChange?.(result);
      },
      [onChange]
    );

    return (
      <div className={cn("relative", className)}>
        {/* Flag display on the left inside input */}
        {phoneState.flag && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl pointer-events-none z-10">
            {phoneState.flag}
          </span>
        )}

        <Input
          ref={ref}
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            "h-11 rounded-xl pr-10",
            phoneState.flag ? "pl-12" : "pl-4",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
        />

        {/* Validation hint below input */}
        {showValidationHint && phoneState.needsCountryCode && value.length > 0 && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <span>⚠️</span>
            Please enter country code (e.g., +977, +91, +1)
          </p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

/**
 * Validate a phone number
 * @param phone Full phone number with country code (e.g., "+977 9812345678")
 * @returns { valid: boolean, needsCountryCode: boolean, isSupported: boolean }
 */
export function validatePhoneNumber(phone: string): {
  valid: boolean;
  needsCountryCode: boolean;
  isSupported: boolean;
  message?: string;
} {
  if (!phone || phone.trim() === "") {
    return { valid: false, needsCountryCode: false, isSupported: false };
  }

  const cleaned = phone.replace(/\s/g, "");

  // Must start with +
  if (!cleaned.startsWith("+")) {
    return {
      valid: false,
      needsCountryCode: true,
      isSupported: false,
      message: "Please enter country code (e.g., +977)",
    };
  }

  // Check supported countries
  for (const country of SUPPORTED_PHONE_COUNTRIES) {
    if (cleaned.startsWith(country.dialCode)) {
      const localPart = cleaned.slice(country.dialCode.length);
      const isValidLength =
        localPart.length >= country.minLength &&
        localPart.length <= country.maxLength;
      const isDigits = /^\d+$/.test(localPart);

      if (isValidLength && isDigits) {
        return { valid: true, needsCountryCode: false, isSupported: true };
      } else {
        return {
          valid: false,
          needsCountryCode: false,
          isSupported: true,
          message: `Phone number should be ${country.minLength} digits after ${country.dialCode}`,
        };
      }
    }
  }

  // Check EU countries - they're valid but not "supported" for our business
  for (const dialCode of EU_DIAL_CODES) {
    if (cleaned.startsWith(dialCode)) {
      const localPart = cleaned.slice(dialCode.length);
      if (localPart.length >= 6 && /^\d+$/.test(localPart)) {
        return { valid: true, needsCountryCode: false, isSupported: false };
      }
    }
  }

  // Has country code but might be incomplete or unsupported
  if (cleaned.length < 4) {
    return {
      valid: false,
      needsCountryCode: false,
      isSupported: false,
      message: "Please enter complete phone number",
    };
  }

  // Unknown country code - still allow it
  const localPart = cleaned.slice(1); // Remove +
  if (localPart.length >= 7 && /^\d+$/.test(localPart)) {
    return { valid: true, needsCountryCode: false, isSupported: false };
  }

  return {
    valid: false,
    needsCountryCode: false,
    isSupported: false,
    message: "Please enter a valid phone number",
  };
}

/**
 * Check if phone number needs country code
 */
export function needsCountryCode(phone: string): boolean {
  if (!phone || phone.trim() === "") return false;
  return !phone.trim().startsWith("+");
}

/**
 * Get country info from phone number
 */
export function getCountryFromPhone(phone: string): {
  code: SupportedCountryCode | "EU" | null;
  flag: string | null;
  name: string | null;
} {
  const state = detectPhoneFlag(phone);

  if (state.countryCode === "EU") {
    return { code: "EU", flag: "🇪🇺", name: "European Union" };
  }

  if (state.countryCode) {
    const country = SUPPORTED_PHONE_COUNTRIES.find(
      (c) => c.code === state.countryCode
    );
    if (country) {
      return { code: country.code, flag: country.flag, name: country.name };
    }
  }

  return { code: null, flag: null, name: null };
}

/**
 * Format phone number for display with flag
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return "";

  const { flag } = getCountryFromPhone(phone);
  if (flag) {
    return `${flag} ${phone}`;
  }

  return phone;
}

export default PhoneInput;
