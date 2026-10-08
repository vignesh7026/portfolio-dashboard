'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { animate, useReducedMotion } from 'motion/react';

interface FlashHighlightProps {
  value: number | null;
  tone: 'gain' | 'loss' | 'neutral';
  children: ReactNode;
  className?: string;
}

/**
 * Section 9: a 600ms background flash on value change, fast-in/slow-out
 * (times: [0, 0.15, 1]) so it reads as "something changed, now settling."
 * Driven imperatively via `animate()` on the DOM node — no re-render needed
 * on ticks where the value didn't move, which is the whole point of
 * Section 11's re-render discipline.
 */
export function FlashHighlight({ value, tone, children, className = '' }: FlashHighlightProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const changed = prev.current !== null && value !== null && prev.current !== value;
    prev.current = value;
    if (!changed || !ref.current || prefersReducedMotion || tone === 'neutral') return;

    const color = tone === 'gain' ? 'var(--gain-flash)' : 'var(--loss-flash)';
    animate(
      ref.current,
      { backgroundColor: ['transparent', color, 'transparent'] },
      { duration: 0.6, times: [0, 0.15, 1], ease: 'easeOut' }
    );
  }, [value, tone, prefersReducedMotion]);

  return (
    <span ref={ref} className={`rounded-md -mx-1 px-1 ${className}`}>
      {children}
    </span>
  );
}
