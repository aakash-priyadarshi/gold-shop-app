"use client";

import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type Variants,
} from "framer-motion";
import { useEffect, useMemo, useState } from "react";

// ─── SVG PATH DATA ──────────────────────────────────────────────
// Diamond wireframe (extracted from diamond SVG)
const DIAMOND_PATH =
  "M6.236 1C5.1 1 4.06 1.642 3.553 2.658L1.148 7.468C.648 8.468.746 9.663 1.402 10.569L9.57 21.85C10.768 23.503 13.232 23.503 14.43 21.85L22.599 10.569C23.254 9.663 23.352 8.468 22.852 7.468L20.447 2.658C19.939 1.642 18.9 1 17.764 1H6.236ZM5.342 3.553C5.511 3.214 5.857 3 6.236 3H8.674L7.246 8H3.118L5.342 3.553ZM9.326 8L10.754 3H13.246L14.674 8H9.326ZM14.646 10H9.354L12 18.6L14.646 10ZM13.929 19.131L16.739 10H20.541L13.929 19.131ZM16.754 8L15.326 3H17.764C18.143 3 18.489 3.214 18.658 3.553L20.882 8H16.754ZM3.459 10H7.261L10.071 19.131L3.459 10Z";

// Pendant wireframe (extracted from pendant SVG – key geometric paths)
const PENDANT_PATHS = [
  // Outer hexagonal body
  "M114.07 255.27v160.064l138.284 80.053 138.283-80.053V255.27",
  // Inner hex frame
  "M252.46 278.272l72.256 42.085v84.316L252.46 446.76l-72.256-42.086v-84.314z",
  // Top connector
  "M251.71 145.856v38.904L114.07 255.27",
  "M251.71 184.76l137.637-69.49",
  // Inner diamond lines
  "M252.46 296.602l-56.883 98.15v.724l56.566 32.977L309 368.38v-66.085z",
  // Bottom detail lines
  "M333.493 393.99l28.414 16.38-99.63 57.677v-32.574z",
  "M171.723 394.365l71.864 41.86v32.494l-100.21-58.013z",
];

// Store with diamonds (extracted from store SVG – key outlines)
const STORE_PATH =
  "M2 69c0 13.678 9.625 25.302 22 29.576V233H2v18h252v-18h-22V98.554c12.89-3.945 21.699-15.396 22-29.554v-8H2V69z M65.29 68.346c0 6.477 6.755 31.47 31.727 31.47 21.689 0 31.202-19.615 31.202-31.47 0 11.052 7.41 31.447 31.464 31.447 21.733 0 31.363-20.999 31.363-31.447 0 14.425 9.726 26.416 22.954 30.154V233H42V98.594C55.402 94.966 65.29 82.895 65.29 68.346z M222.832 22H223V2H34v20L2 54h252z";

// Store inner diamond details
const STORE_DIAMOND_PATH =
  "M102.416 148.646l-8.293-21.305h26.819z M90.278 131.592l-14.922 17.16h21.602z M109.2 148.752h37.599l-18.644-21.441h-.31z M161.968 127.447l-.118-.136h-26.821l18.624 21.418z M180.644 148.752l-14.833-17.057-6.664 17.057z M157.121 154.112l-22.96 58.768 46.616-58.768z M75.223 154.112l46.646 58.81-22.892-58.81z M127.973 214.311l23.579-60.199h-47.009z";

// ─── MARKET LABELS ──────────────────────────────────────────────
const MARKETS = [
  { label: "India Market", flag: "🇮🇳" },
  { label: "UK Market", flag: "🇬🇧" },
  { label: "UAE Market", flag: "🇦🇪" },
  { label: "Nepal Market", flag: "🇳🇵" },
] as const;

const STATUS_LABELS = [
  "Live Metal Rates",
  "Tax Verified",
  "Orivraa Escrow Secured",
] as const;

// ─── PARTICLE CONFIG ────────────────────────────────────────────
interface Particle {
  id: number;
  startX: number;
  startY: number;
  delay: number;
  duration: number;
  size: number;
}

function generateParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    // Distribute starts across all 4 corners + edges
    const corner = i % 4;
    const jitter = (Math.random() - 0.5) * 300;
    let startX = 0;
    let startY = 0;
    if (corner === 0) {
      startX = -400 + jitter;
      startY = -400 + jitter;
    } else if (corner === 1) {
      startX = 400 + jitter;
      startY = -400 + jitter;
    } else if (corner === 2) {
      startX = 400 + jitter;
      startY = 400 + jitter;
    } else {
      startX = -400 + jitter;
      startY = 400 + jitter;
    }
    particles.push({
      id: i,
      startX,
      startY,
      delay: i * 0.15 + Math.random() * 0.3,
      duration: 1.8 + Math.random() * 1.2,
      size: 1 + Math.random() * 2,
    });
  }
  return particles;
}

// ─── ANIMATION VARIANTS ─────────────────────────────────────────
const wireframeVariant: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 2.5, ease: "easeInOut", delay },
  }),
};

const shimmerVariant: Variants = {
  hidden: { x: "-100%", opacity: 0 },
  visible: {
    x: "200%",
    opacity: [0, 0.6, 0],
    transition: { duration: 1.2, ease: "easeInOut" },
  },
};

// ─── COMPONENT ──────────────────────────────────────────────────
export default function OrivraaLoader() {
  const [phase, setPhase] = useState<"constructing" | "shimmer" | "complete">(
    "constructing",
  );
  const [activeMarket, setActiveMarket] = useState(0);
  const [activeSvg, setActiveSvg] = useState<"diamond" | "pendant" | "store">(
    "diamond",
  );

  const count = useMotionValue(0);
  const displayValue = useTransform(count, (latest) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(latest),
  );

  const particles = useMemo(() => generateParticles(16), []);

  // ── Phase timeline ──
  useEffect(() => {
    const controls = animate(count, 75000, {
      duration: 3.5,
      ease: "easeInOut",
    });

    // Cycle SVGs: diamond → pendant → store
    const svgTimer1 = setTimeout(() => setActiveSvg("pendant"), 1200);
    const svgTimer2 = setTimeout(() => setActiveSvg("store"), 2400);

    // Shimmer phase after wireframe construction
    const shimmerTimer = setTimeout(() => setPhase("shimmer"), 3200);

    // Complete
    const completeTimer = setTimeout(() => setPhase("complete"), 4200);

    return () => {
      controls.stop();
      clearTimeout(svgTimer1);
      clearTimeout(svgTimer2);
      clearTimeout(shimmerTimer);
      clearTimeout(completeTimer);
    };
  }, [count]);

  // ── Cycle market labels ──
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMarket((prev) => (prev + 1) % MARKETS.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const isGlowing = phase === "shimmer" || phase === "complete";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#0B0C10] overflow-hidden">
      {/* ── Background data particles ── */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: p.startX, y: p.startY, opacity: 0, scale: 0 }}
          animate={{
            x: [p.startX, p.startX * 0.3, 0],
            y: [p.startY, p.startY * 0.3, 0],
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0.3],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeIn",
          }}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: "radial-gradient(circle, #D4AF37 0%, #D4AF3700 70%)",
            boxShadow: "0 0 6px 1px rgba(212,175,55,0.4)",
          }}
        />
      ))}

      {/* ── Ambient gold glow ── */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.15, 0.08] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-80 h-80 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)",
        }}
      />

      {/* ── SVG Wireframe Construction ── */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
        {/* Diamond */}
        <motion.svg
          viewBox="0 0 24 24"
          fill="none"
          className="absolute inset-0 w-full h-full"
          style={{
            filter: isGlowing
              ? "drop-shadow(0 0 16px rgba(212,175,55,0.5))"
              : "none",
            transition: "filter 0.8s ease",
          }}
        >
          <motion.path
            d={DIAMOND_PATH}
            stroke="url(#goldGrad)"
            strokeWidth={0.5}
            fill="none"
            fillRule="evenodd"
            clipRule="evenodd"
            variants={wireframeVariant}
            custom={0}
            initial="hidden"
            animate={activeSvg === "diamond" ? "visible" : "hidden"}
          />
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#FFD133" />
              <stop offset="100%" stopColor="#B8941F" />
            </linearGradient>
          </defs>
        </motion.svg>

        {/* Pendant */}
        <motion.svg
          viewBox="0 0 512 512"
          fill="none"
          className="absolute inset-0 w-full h-full"
          style={{
            filter: isGlowing
              ? "drop-shadow(0 0 16px rgba(212,175,55,0.5))"
              : "none",
            transition: "filter 0.8s ease",
          }}
        >
          {PENDANT_PATHS.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              stroke="url(#goldGrad2)"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={wireframeVariant}
              custom={i * 0.08}
              initial="hidden"
              animate={activeSvg === "pendant" ? "visible" : "hidden"}
            />
          ))}
          <defs>
            <linearGradient id="goldGrad2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#FFD133" />
              <stop offset="100%" stopColor="#B8941F" />
            </linearGradient>
          </defs>
        </motion.svg>

        {/* Store */}
        <motion.svg
          viewBox="0 0 256 253"
          fill="none"
          className="absolute inset-0 w-full h-full"
          style={{
            filter: isGlowing
              ? "drop-shadow(0 0 16px rgba(212,175,55,0.5))"
              : "none",
            transition: "filter 0.8s ease",
          }}
        >
          <motion.path
            d={STORE_PATH}
            stroke="url(#goldGrad3)"
            strokeWidth={1.5}
            fill="none"
            variants={wireframeVariant}
            custom={0}
            initial="hidden"
            animate={activeSvg === "store" ? "visible" : "hidden"}
          />
          <motion.path
            d={STORE_DIAMOND_PATH}
            stroke="url(#goldGrad3)"
            strokeWidth={1}
            fill="none"
            variants={wireframeVariant}
            custom={0.3}
            initial="hidden"
            animate={activeSvg === "store" ? "visible" : "hidden"}
          />
          <defs>
            <linearGradient id="goldGrad3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#FFD133" />
              <stop offset="100%" stopColor="#B8941F" />
            </linearGradient>
          </defs>
        </motion.svg>

        {/* ── Shimmer sweep overlay ── */}
        {phase === "shimmer" && (
          <motion.div
            variants={shimmerVariant}
            initial="hidden"
            animate="visible"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(105deg, transparent 30%, rgba(212,175,55,0.25) 45%, rgba(255,255,255,0.3) 50%, rgba(212,175,55,0.25) 55%, transparent 70%)",
              borderRadius: "50%",
            }}
          />
        )}

        {/* ── Center pulse ── */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.35, 0.15],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-20 h-20 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Price counter + intel text ── */}
      <div className="mt-6 text-center space-y-3">
        {/* Flickering price counter */}
        <motion.h2
          className="text-3xl sm:text-4xl font-serif tracking-tight text-gray-900 dark:text-white tabular-nums"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.span>{displayValue}</motion.span>
        </motion.h2>

        {/* AI engine label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-gold-500">
            Smart Quote Engine Active
          </span>

          {/* Cycling market indicator */}
          <div className="flex items-center gap-1.5 h-4">
            {MARKETS.map((m, i) => (
              <motion.span
                key={m.label}
                animate={{
                  opacity: activeMarket === i ? 1 : 0.2,
                  scale: activeMarket === i ? 1.05 : 0.95,
                }}
                transition={{ duration: 0.3 }}
                className="text-[9px] uppercase tracking-widest text-gold-600 dark:text-gold-400"
              >
                {m.flag} {m.label}
              </motion.span>
            ))}
          </div>

          {/* Status labels */}
          <div className="flex gap-4 text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {STATUS_LABELS.map((label, i) => (
              <motion.span
                key={label}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  delay: i * 0.4,
                  ease: "easeInOut",
                }}
              >
                {label}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom brand line ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 text-[10px] tracking-[0.2em] uppercase text-gray-400 dark:text-gray-600"
      >
        Orivraa &middot; Premium Jewellery Marketplace
      </motion.div>
    </div>
  );
}
