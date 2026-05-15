"use client";

/**
 * MobileHelpButton — `?` icon in a page header that opens a bottom sheet
 * with feature-specific help. Touch-friendly equivalent of desktop tooltips.
 *
 * Usage:
 *   <MobileHelpButton title="Quick Bill" content="Tap items to add..." />
 *
 * Or pass rich React content for tips/lists.
 */

import { T } from "@/components/ui/T";
import { HelpCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

interface MobileHelpButtonProps {
  title: string;
  /** Plain text shown above the tips list. */
  description?: string;
  /** Optional bullet tips. */
  tips?: string[];
  /** Fully custom React body (overrides description+tips when provided). */
  children?: React.ReactNode;
}

export function MobileHelpButton({
  title,
  description,
  tips,
  children,
}: MobileHelpButtonProps) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Help: ${title}`}
        className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:text-amber-600 hover:bg-amber-50 active:bg-amber-100 transition-colors"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
          >
            {/* Drag handle */}
            <div className="sticky top-0 bg-white pt-3 pb-1 z-10 rounded-t-3xl">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto" />
            </div>

            <div className="px-5 pb-8">
              <div className="flex items-start justify-between gap-3 pt-2 pb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 leading-tight">
                    <T>{title}</T>
                  </h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0"
                  aria-label="Close help"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              {children ? (
                <div className="text-sm text-gray-700 space-y-3">{children}</div>
              ) : (
                <>
                  {description && (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <T>{description}</T>
                    </p>
                  )}
                  {tips && tips.length > 0 && (
                    <ul className="mt-4 space-y-3">
                      {tips.map((tip, i) => (
                        <li key={i} className="flex gap-3 items-start">
                          <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-sm text-gray-700 leading-relaxed">
                            <T>{tip}</T>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  <T>Tap the chat bubble for live help from Orivraa AI</T>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Slim header row used at the top of every mobile page.
 * Standardises layout and includes the help button.
 */
export function MobilePageHeader({
  title,
  subtitle,
  helpTitle,
  helpDescription,
  helpTips,
  helpContent,
  right,
}: {
  title: string;
  subtitle?: string;
  helpTitle?: string;
  helpDescription?: string;
  helpTips?: string[];
  helpContent?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 bg-white border-b border-gray-100">
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-gray-900 truncate">
          <T>{title}</T>
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-500 truncate">
            <T>{subtitle}</T>
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {right}
        {(helpDescription || helpTips || helpContent) && (
          <MobileHelpButton
            title={helpTitle ?? title}
            description={helpDescription}
            tips={helpTips}
          >
            {helpContent}
          </MobileHelpButton>
        )}
      </div>
    </div>
  );
}
