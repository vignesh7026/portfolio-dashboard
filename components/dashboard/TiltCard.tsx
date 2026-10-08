'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useMotionTemplate, useReducedMotion, useSpring } from 'motion/react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  glow?: string;
}

/** Subtle 3D tilt + a cursor-following glow — premium-feeling hover without any library bloat. */
export function TiltCard({ children, className = '', glow = 'var(--accent)' }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const rotateX = useSpring(0, { stiffness: 300, damping: 24 });
  const rotateY = useSpring(0, { stiffness: 300, damping: 24 });
  const glowX = useSpring(50, { stiffness: 200, damping: 26 });
  const glowY = useSpring(50, { stiffness: 200, damping: 26 });

  const background = useMotionTemplate`radial-gradient(180px circle at ${glowX}% ${glowY}%, ${glow}14, transparent 70%)`;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // Capped at ±6deg per the brief — enough to feel alive, never gimmicky.
    rotateY.set((px - 0.5) * 12);
    rotateX.set((0.5 - py) * 12);
    glowX.set(px * 100);
    glowY.set(py * 100);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className={`relative ${className}`}
    >
      <motion.div aria-hidden="true" className="absolute inset-0 rounded-[inherit] pointer-events-none" style={{ background }} />
      {children}
    </motion.div>
  );
}
