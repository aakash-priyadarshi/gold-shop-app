"use client";

import { useEffect, useState } from "react";
import { X, MapPin, ArrowRight } from "lucide-react";
import {
  usePreferencesStore,
  COUNTRIES,
  type CountryCode,
} from "@/store/preferences";

/**
 * GeoMismatchBanner
 *
 * Shows a dismissible banner when the user's detected location (from Cloudflare/geo API)
 * differs from their saved country preference.
 *
 * - Runs on every visit (geo-detection repopulates detectedCountry each time)
 * - Does NOT override user settings automatically
 * - User can click "Switch" to accept the detected country, or "Keep" to dismiss
 * - Once dismissed or accepted, the banner stays hidden for the session
 */
export function GeoMismatchBanner() {
  const country = usePreferencesStore((s) => s.country);
  const detectedCountry = usePreferencesStore((s) => s.detectedCountry);
  const dismissed = usePreferencesStore((s) => s.geoMismatchDismissed);
  const dismissGeoMismatch = usePreferencesStore((s) => s.dismissGeoMismatch);
  const acceptDetectedCountry = usePreferencesStore(
    (s) => s.acceptDetectedCountry,
  );

  // Small delay so the banner doesn't flash on initial render
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Don't show if:
  // - geo hasn't been detected yet
  // - countries match
  // - user already dismissed/accepted this session
  // - still waiting for initial delay
  if (!ready || !detectedCountry || detectedCountry === country || dismissed) {
    return null;
  }

  const detectedInfo = COUNTRIES[detectedCountry as CountryCode];
  const currentInfo = COUNTRIES[country as CountryCode];

  if (!detectedInfo || !currentInfo) return null;

  return (
    <div className="relative z-[60] bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-amber-900">
            It seems you&apos;re in{" "}
            <strong>{detectedInfo.name}</strong>, but your settings are set to{" "}
            <strong>{currentInfo.name}</strong>.
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={acceptDetectedCountry}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Switch to {detectedInfo.name}
            <ArrowRight className="h-3 w-3" />
          </button>
          <button
            onClick={dismissGeoMismatch}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-white text-amber-800 border border-amber-300 hover:bg-amber-50 transition-colors"
          >
            Keep {currentInfo.name}
          </button>
          <button
            onClick={dismissGeoMismatch}
            className="p-1 text-amber-400 hover:text-amber-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
