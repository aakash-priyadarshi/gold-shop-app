"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { T } from "@/components/ui/T";

interface FAQItem {
  q: string;
  a: string;
}

interface FaqSectionProps {
  faqs: FAQItem[];
}

export function FaqSection({ faqs }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/40 overflow-hidden transition-all duration-300 shadow-sm"
          >
            <button
              onClick={() => toggleIndex(index)}
              className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-gray-900 dark:text-white hover:bg-gold-50/60 dark:hover:bg-gold-950/40 hover:text-gold-600 dark:hover:text-gold-400 transition-colors duration-300 focus:outline-none"
            >
              <span>
                <T>{faq.q}</T>
              </span>
              <ArrowRight
                className={`h-4 w-4 text-gray-400 transition-transform duration-300 shrink-0 ml-4 ${
                  isOpen ? "rotate-90 text-gold-500" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: {
                      height: { type: "spring", stiffness: 140, damping: 18 },
                      opacity: { duration: 0.2 },
                    },
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: {
                      height: { duration: 0.2, ease: "easeInOut" },
                      opacity: { duration: 0.15 },
                    },
                  }}
                >
                  <div className="px-6 pb-4 pt-1">
                    <p className="text-sm text-gray-655 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-800/50 pt-3 mt-1">
                      <T>{faq.a}</T>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
