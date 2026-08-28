"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right" | "none" | "scale" | "assemble" | "fade";
  delay?: number;
  duration?: number;
  className?: string;
  distance?: number;
  /** Use spring physics for a more organic, bouncy feel. Default is true. */
  spring?: boolean;
  /** When true, each direct child is staggered automatically. */
  staggerChildren?: number;
  /** Whether the animation should trigger only once. Default is false (bidirectional). */
  once?: boolean;
  /** Viewport margin to trigger the animation, e.g. "-10% 0px -10% 0px" */
  margin?: string;
  /** Amount of element that needs to be inside the viewport to trigger. Default is 0.1 */
  amount?: number | "some" | "all";
}

/**
 * World-class scroll-triggered reveal wrapper using Framer Motion.
 *
 * Supports bidirectional transitions:
 * - Dynamic spring entrance animations (e.g. stiffness 120, damping 20) when scrolling into view.
 * - Fast, smooth, lag-free exit transitions (tween, 0.25s) when scrolling out of view.
 *
 * Variants:
 * - `up` / `down` / `left` / `right` — Standard directional reveals.
 * - `scale` — Scales from 0.85 to 1.0 with a soft fade-in.
 * - `assemble` — Helix-style kinetic transition (rotation, scale shift, and larger slide).
 * - `fade` — Clean opacity-only fade-in.
 */
export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  className = "",
  distance = 30,
  spring = true,
  staggerChildren,
  once = false,
  margin = "-12% 0px -12% 0px",
  amount = 0.1,
}: ScrollRevealProps) {

  // ── Container Variant (for stagger orchestration) ──
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerChildren ?? 0,
        delayChildren: delay,
      },
    },
  };

  // ── Item Variant (for individual element animation) ──
  const getItemVariants = (): Variants => {
    const hidden: Record<string, any> = { opacity: 0, x: 0, y: 0 };
    const visible: Record<string, any> = { opacity: 1, x: 0, y: 0 };

    switch (direction) {
      case "up":
        hidden.y = distance;
        break;
      case "down":
        hidden.y = -distance;
        break;
      case "left":
        hidden.x = distance;
        break;
      case "right":
        hidden.x = -distance;
        break;
      case "scale":
        hidden.y = 15;
        hidden.scale = 0.85;
        visible.scale = 1;
        break;
      case "assemble":
        hidden.y = 65;
        hidden.scale = 0.92;
        hidden.rotate = -2.5;
        visible.scale = 1;
        visible.rotate = 0;
        break;
      case "fade":
      case "none":
      default:
        break;
    }

    // High-fidelity bouncy spring physics for entry
    const enterTransition = spring
      ? { type: "spring" as const, damping: 20, stiffness: 120, delay: staggerChildren ? 0 : delay }
      : { duration, delay: staggerChildren ? 0 : delay, ease: [0.21, 1.02, 0.43, 1.01] as any };

    // Fast, clean, lag-free tween transition for scroll-away resets
    const exitTransition = {
      type: "tween" as const,
      duration: 0.25,
      ease: "easeOut",
    };

    hidden.transition = exitTransition;
    visible.transition = enterTransition;

    return {
      hidden,
      visible,
    };
  };

  // Viewport configuration
  const viewportConfig = { once, margin, amount };

  // ── Stagger mode: wrap children individually ──
  if (staggerChildren && staggerChildren > 0) {
    const itemVariants = getItemVariants();
    return (
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={containerVariants}
        className={className}
      >
        {React.Children.map(children, (child) => (
          <motion.div variants={itemVariants}>{child as any}</motion.div>
        ))}
      </motion.div>
    );
  }

  // ── Single element mode ──
  const variants = getItemVariants();
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={variants}
      className={className}
    >
      {children as any}
    </motion.div>
  );
}
