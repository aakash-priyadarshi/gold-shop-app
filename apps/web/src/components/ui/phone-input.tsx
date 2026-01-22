"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";

// Supported countries with phone codes and flags
export const SUPPORTED_PHONE_COUNTRIES = [
  {
    code: "NP",
    name: "Nepal",
    flag: "🇳🇵",
    dialCode: "+977",
    format: "XX-XXXXXXX",
    maxLength: 10,
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    dialCode: "+91",
    format: "XXXXX-XXXXX",
    maxLength: 10,
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    dialCode: "+1",
    format: "(XXX) XXX-XXXX",
    maxLength: 10,
  },
  {
    code: "AE",
    name: "UAE",
    flag: "🇦🇪",
    dialCode: "+971",
    format: "XX-XXX-XXXX",
    maxLength: 9,
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    dialCode: "+44",
    format: "XXXX XXXXXX",
    maxLength: 10,
  },
] as const;

export type SupportedCountryCode =
  (typeof SUPPORTED_PHONE_COUNTRIES)[number]["code"];

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  defaultCountry?: SupportedCountryCode;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

/**
 * Phone input component with country code selection and validation
 * - Displays country flag based on selected country
 * - Validates phone number format
 * - Always stores full phone number with country code (e.g., +977 9812345678)
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value = "",
      onChange,
      onBlur,
      defaultCountry = "NP",
      placeholder,
      disabled = false,
      error = false,
      className,
      id,
      name,
      required,
    },
    ref,
  ) => {
    // Parse initial value to extract country code
    const parseInitialValue = useCallback(
      (val: string) => {
        if (!val) return { countryCode: defaultCountry, localNumber: "" };

        // Try to match country code from the value
        for (const country of SUPPORTED_PHONE_COUNTRIES) {
          if (val.startsWith(country.dialCode)) {
            return {
              countryCode: country.code,
              localNumber: val
                .slice(country.dialCode.length)
                .replace(/\s/g, ""),
            };
          }
        }

        // If no country code found, assume it's just a local number
        return {
          countryCode: defaultCountry,
          localNumber: val.replace(/[^\d]/g, ""),
        };
      },
      [defaultCountry],
    );

    const [selectedCountry, setSelectedCountry] =
      useState<SupportedCountryCode>(() => {
        const { countryCode } = parseInitialValue(value);
        return countryCode;
      });

    const [localNumber, setLocalNumber] = useState(() => {
      const { localNumber } = parseInitialValue(value);
      return localNumber;
    });

    // Get current country info
    const countryInfo = useMemo(
      () =>
        SUPPORTED_PHONE_COUNTRIES.find((c) => c.code === selectedCountry) ||
        SUPPORTED_PHONE_COUNTRIES[0],
      [selectedCountry],
    );

    // Update parent with full phone number
    const updateFullNumber = useCallback(
      (country: SupportedCountryCode, local: string) => {
        const info = SUPPORTED_PHONE_COUNTRIES.find((c) => c.code === country);
        if (!info) return;

        // Only include dial code if there's a local number
        const fullNumber = local ? `${info.dialCode} ${local}` : "";
        onChange?.(fullNumber);
      },
      [onChange],
    );

    // Handle country change
    const handleCountryChange = (newCountry: SupportedCountryCode) => {
      setSelectedCountry(newCountry);
      setLocalNumber(""); // Clear local number when country changes
      updateFullNumber(newCountry, "");
    };

    // Handle local number change
    const handleLocalNumberChange = (
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const input = e.target.value;
      // Only allow digits
      const digitsOnly = input.replace(/[^\d]/g, "");
      // Limit to max length for the country
      const trimmed = digitsOnly.slice(0, countryInfo.maxLength);
      setLocalNumber(trimmed);
      updateFullNumber(selectedCountry, trimmed);
    };

    // Sync from external value changes
    useEffect(() => {
      const { countryCode, localNumber: parsed } = parseInitialValue(value);
      if (countryCode !== selectedCountry || parsed !== localNumber) {
        setSelectedCountry(countryCode);
        setLocalNumber(parsed);
      }
    }, [value, parseInitialValue, selectedCountry, localNumber]);

    // Format placeholder based on country
    const getPlaceholder = () => {
      if (placeholder) return placeholder;
      return countryInfo.format.replace(/X/g, "0");
    };

    return (
      <div className={cn("flex gap-1", className)}>
        {/* Country selector with flag */}
        <Select
          value={selectedCountry}
          onValueChange={(val) =>
            handleCountryChange(val as SupportedCountryCode)
          }
          disabled={disabled}
        >
          <SelectTrigger
            className={cn(
              "w-[100px] flex-shrink-0 rounded-xl",
              error &&
                "border-red-300 focus:border-red-400 focus:ring-red-400/20",
            )}
          >
            <SelectValue>
              <span className="flex items-center gap-1.5">
                <span className="text-lg">{countryInfo.flag}</span>
                <span className="text-sm text-muted-foreground">
                  {countryInfo.dialCode}
                </span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_PHONE_COUNTRIES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <span className="flex items-center gap-2">
                  <span className="text-lg">{country.flag}</span>
                  <span className="text-sm">{country.dialCode}</span>
                  <span className="text-xs text-muted-foreground">
                    {country.name}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Phone number input */}
        <Input
          ref={ref}
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          value={localNumber}
          onChange={handleLocalNumberChange}
          onBlur={onBlur}
          placeholder={getPlaceholder()}
          disabled={disabled}
          required={required}
          className={cn(
            "flex-1 rounded-xl",
            error &&
              "border-red-300 focus:border-red-400 focus:ring-red-400/20",
          )}
          maxLength={countryInfo.maxLength}
        />
      </div>
    );
  },
);

PhoneInput.displayName = "PhoneInput";

/**
 * Validate a phone number
 * @param phone Full phone number with country code (e.g., "+977 9812345678")
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;

  // Must start with + and country code
  if (!phone.startsWith("+")) return false;

  // Find matching country
  for (const country of SUPPORTED_PHONE_COUNTRIES) {
    if (phone.startsWith(country.dialCode)) {
      const localPart = phone.slice(country.dialCode.length).replace(/\s/g, "");
      // Check if local part has correct length and is all digits
      return localPart.length === country.maxLength && /^\d+$/.test(localPart);
    }
  }

  return false;
}

/**
 * Get country from phone number
 * @param phone Full phone number with country code
 * @returns Country code or null if not found
 */
export function getCountryFromPhone(
  phone: string,
): SupportedCountryCode | null {
  if (!phone) return null;

  for (const country of SUPPORTED_PHONE_COUNTRIES) {
    if (phone.startsWith(country.dialCode)) {
      return country.code;
    }
  }

  return null;
}

/**
 * Format phone number for display
 * @param phone Full phone number with country code
 * @returns Formatted phone number
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return "";

  for (const country of SUPPORTED_PHONE_COUNTRIES) {
    if (phone.startsWith(country.dialCode)) {
      const local = phone.slice(country.dialCode.length).replace(/\s/g, "");
      return `${country.flag} ${country.dialCode} ${local}`;
    }
  }

  return phone;
}

export default PhoneInput;
