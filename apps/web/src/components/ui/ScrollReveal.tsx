"use client";

import React from "react";
import { motion } from "framer-motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right" | "none";
  delay?: number;
  duration?: number;
  className?: string;
  distance?: number;
}

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  className = "",
  distance = 30,
}: ScrollRevealProps) {
  const getVariants = () => {
    const hidden = {
      opacity: 0,
      x: 0,
      y: 0,
    };

    if (direction === "up") hidden.y = distance;
    if (direction === "down") hidden.y = -distance;
    if (direction === "left") hidden.x = distance;
    if (direction === "right") hidden.x = -distance;

    return {
      hidden,
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          duration,
          delay,
          ease: [0.21, 1.02, 0.43, 1.01] as any, // Highly fluid cubic-bezier curve matching premium animations
        },
      },
    };
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      variants={getVariants()}
      className={className}
    >
      {children}
    </motion.div>
  );
}
