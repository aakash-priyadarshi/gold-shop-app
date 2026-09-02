"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  tilt?: boolean;
}

export function MotionCard({
  children,
  className = "",
  glow = false,
  tilt = false,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      whileHover={
        tilt
          ? { y: -6, scale: 1.01, transition: { duration: 0.25, ease: "easeOut" } }
          : { y: -4, transition: { duration: 0.2, ease: "easeOut" } }
      }
      whileTap={{ scale: 0.99 }}
      className={cn(
        "relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 shadow-sm transition-shadow duration-300 hover:shadow-md hover:border-gold-500/30 dark:hover:border-gold-400/30",
        glow &&
          "before:pointer-events-none before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-b before:from-gold-500/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
