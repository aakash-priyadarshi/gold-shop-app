"use client";

import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const BEFORE_SRC = "/marketing/ai-photo-before.png";
const AFTER_SRC = "/marketing/ai-photo-after.png";

function CursorIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <path
        d="M4 3.2 22.4 14.1l-7.2 1.6 3.4 8.1-3.6 1.5-3.4-8.1-6.6 5.3Z"
        fill="#0d1830"
        stroke="#f6e7c3"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AiPhotoStudioDemo({
  className = "",
}: {
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.35),
      { threshold: [0, 0.35, 0.7] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const playing = inView && !reduceMotion;

  return (
    <div
      ref={rootRef}
      className={`relative overflow-hidden rounded-[28px] border border-amber-200/80 bg-[#0d1830] shadow-[0_24px_60px_-28px_rgba(13,24,48,0.8)] dark:border-amber-900/50 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200/80">
          <T>Product catalog</T>
        </p>
        <span className="text-[11px] text-white/40">22K · 18.4 g</span>
      </div>

      <div className="relative aspect-square bg-[#15233f] sm:aspect-[5/4]">
        {reduceMotion ? (
          <div className="grid h-full grid-cols-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BEFORE_SRC} alt="" className="h-full w-full object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AFTER_SRC} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BEFORE_SRC}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <motion.img
              src={AFTER_SRC}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={
                playing
                  ? {
                      opacity: [0, 0, 0, 1, 1, 0],
                      filter: [
                        "blur(8px)",
                        "blur(8px)",
                        "blur(6px)",
                        "blur(0px)",
                        "blur(0px)",
                        "blur(8px)",
                      ],
                    }
                  : { opacity: 0, filter: "blur(8px)" }
              }
              transition={
                playing
                  ? {
                      duration: 7.2,
                      times: [0, 0.28, 0.38, 0.5, 0.86, 1],
                      repeat: Infinity,
                    }
                  : { duration: 0 }
              }
            />
            {playing && (
              <motion.div
                className="pointer-events-none absolute left-[18%] top-[72%] z-20"
                animate={{
                  x: ["0%", "132%", "132%", "132%", "0%"],
                  y: ["0%", "-8%", "-8%", "-8%", "0%"],
                  scale: [1, 1, 0.86, 1, 1],
                }}
                transition={{
                  duration: 7.2,
                  times: [0, 0.22, 0.26, 0.32, 1],
                  repeat: Infinity,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <CursorIcon />
              </motion.div>
            )}
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[#0d1830] via-[#0d1830]/70 to-transparent p-4">
          <div>
            <p className="text-sm font-semibold text-white">
              <T>Temple necklace · 22K</T>
            </p>
            <p className="text-xs text-white/60">
              {reduceMotion ? (
                <T>Shop photo left · studio result right</T>
              ) : (
                <T>Same piece. Lighting and background only.</T>
              )}
            </p>
          </div>
          <motion.span
            className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-[#0d1830] shadow-lg"
            animate={
              playing
                ? { scale: [1, 1, 0.94, 1.06, 1, 1] }
                : { scale: 1 }
            }
            transition={
              playing
                ? { duration: 7.2, times: [0, 0.22, 0.26, 0.3, 0.36, 1], repeat: Infinity }
                : { duration: 0 }
            }
          >
            <T>Enhance</T>
          </motion.span>
        </div>
      </div>
    </div>
  );
}

export function AiPhotoStudioSpotlight({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <section
      id="ai-photo-studio"
      data-tour="ai-photo-studio"
      className="relative overflow-hidden border-b border-gray-150 bg-gradient-to-b from-amber-50/90 to-white py-12 dark:border-gray-900/60 dark:from-gray-950 dark:to-gray-950 lg:py-20"
    >
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-6">
            <ScrollReveal direction="assemble" delay={0.05} spring>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/20 bg-gold-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold-700 dark:text-gold-300">
                <Sparkles className="h-3.5 w-3.5" />
                <T>AI product photo studio</T>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="assemble" delay={0.1} spring>
              <h2 className="text-2xl font-black leading-tight tracking-tight text-gray-900 dark:text-white lg:text-4xl">
                {compact ? (
                  <T>Catalog photos that look like a studio shoot</T>
                ) : (
                  <T>
                    Click Enhance — keep the jewellery, change only the light
                  </T>
                )}
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.16} spring>
              <p className="max-w-lg text-sm leading-relaxed text-gray-600 dark:text-gray-300 lg:text-base">
                <T>
                  Phone photos from the shop floor often look dull on WhatsApp
                  and the catalog. Orivraa turns them into clean studio images
                  without redrawing the piece: metal colour, stones, hallmark,
                  and proportions stay exact. Watch the cursor tap Enhance, then
                  try it on a real SKU in Product Catalog.
                </T>
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.22} spring>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-gold-600 hover:bg-gold-700">
                  <Link href="/dashboard/shop/products">
                    <T>Open Product Catalog</T>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/pricing">
                    <T>Pro+ includes photo enhancement</T>
                  </Link>
                </Button>
              </div>
            </ScrollReveal>
          </div>
          <ScrollReveal direction="left" delay={0.12} spring>
            <AiPhotoStudioDemo />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
