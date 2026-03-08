"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslation } from "@/providers/translation-provider";

/**
 * <T> — AI-powered translation component
 *
 * Wrap any English text to have it automatically translated
 * to the user's preferred language via Gemini Flash.
 *
 * Translations are cached permanently (Redis + localStorage),
 * so the AI is only called once per unique string per language.
 *
 * Usage:
 *   <T>Welcome to Orivraa</T>
 *   <T>Browse our collection of gold jewellery</T>
 *   <h1><T>Premium Jewellery Marketplace</T></h1>
 *
 * Notes:
 * - Only pass plain text or simple strings, not JSX children.
 * - Brand names like "Orivraa" are kept unchanged.
 * - For dynamic text, use the useT() hook instead.
 */
export function T({ children }: { children: string }) {
  const { locale, t, register } = useTranslation();

  useEffect(() => {
    if (locale !== "en") {
      register(children);
    }
  }, [children, locale, register]);

  if (locale === "en") return children as unknown as ReactNode;

  return t(children) as unknown as ReactNode;
}
