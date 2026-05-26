"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right" | "none" | "scale" | "assemble";
  delay?: number;
  duration?: number;
  className?: string;
  distance?: number;
  /** Use spring physics for a more organic, bouncy feel. */
  spring?: boolean;
  /** When true, each direct child is staggered automatically. */
  staggerChildren?: number;
}

/**
 * High-performance scroll-triggered reveal wrapper using Framer Motion.
 *
 * Supports:
 * - Standard directions: up / down / left / right / none
 * - `scale` — element grows from 0.85→1.0 with fade
 * - `assemble` — elements translate from a larger offset (50px) with scale + spring
 * - `staggerChildren` — auto-stagger direct children
 * - `spring` — organic spring physics instead of tween easing
 */
export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  className = "",
  distance = 30,
  spring = false,
  staggerChildren,
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
    const hidden: Record<string, number> = { opacity: 0, x: 0, y: 0 };
    const visible: Record<string, number> = { opacity: 1, x: 0, y: 0 };

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
        (hidden as any).scale = 0.85;
        (visible as any).scale = 1;
        break;
      case "assemble":
        hidden.y = 50;
        (hidden as any).scale = 0.9;
        (hidden as any).rotate = -1;
        (visible as any).scale = 1;
        (visible as any).rotate = 0;
        break;
      case "none":
      default:
        break;
    }

    const transition = spring
      ? { type: "spring" as const, damping: 25, stiffness: 200, delay: staggerChildren ? 0 : delay }
      : { duration, delay: staggerChildren ? 0 : delay, ease: [0.21, 1.02, 0.43, 1.01] as any };

    return {
      hidden,
      visible: { ...visible, transition },
    };
  };

  // ── Stagger mode: wrap children individually ──
  if (staggerChildren && staggerChildren > 0) {
    const itemVariants = getItemVariants();
    return (
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-8% 0px -8% 0px" }}
        variants={containerVariants}
        className={className}
      >
        {React.Children.map(children, (child) => (
          <motion.div variants={itemVariants}>{child}</motion.div>
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
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
