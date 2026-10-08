/**
 * CHANGED — added an opt-in `countUpOnMount` prop so the hero number can
 * genuinely animate from 0 (brief item 1); every other call site is
 * unchanged. While verifying it, found a real bug: the "from" value was a
 * ref mutated synchronously inside the effect body (`prevValue.current =
 * value`), written before the animation had actually run. React's Strict
 * Mode double-invokes mount effects in dev — the first (discarded)
 * invocation wrote `prevValue.current = value` before being cleaned up, so
 * the second (real) invocation read it back and animated `value → value`:
 * a silent no-op. Confirmed empirically (sampled the rendered number 8
 * times over 480ms after mount — identical every time, no motion at all).
 * Fixed by tracking "from" with a ref that only advances via actual
 * animation frames (`onUpdate`), which survives a discarded first
 * invocation correctly instead of jumping ahead of it.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

interface AnimatedNumberProps {
  value: number | null;
  format: (value: number) => string;
  className?: string;
  fallback?: string;
  /** Animate from 0 the first time a real value arrives, instead of appearing instantly. */
  countUpOnMount?: boolean;
}

/**
 * Spring-based count-up (Section 9: stiffness 300, damping 30). A value
 * "settling" reads as a spring, not a cubic-bezier UI-panel move.
 */
export function AnimatedNumber({ value, format, className, fallback = '—', countUpOnMount = false }: AnimatedNumberProps) {
  const initial = countUpOnMount ? 0 : value ?? 0;
  const [display, setDisplay] = useState(initial);
  const displayRef = useRef(initial);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (value === null) return;

    if (prefersReducedMotion) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }

    const from = displayRef.current;
    const controls = animate(from, value, {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      onUpdate: (latest: number) => {
        displayRef.current = latest;
        setDisplay(latest);
      },
    });
    return () => controls.stop();
  }, [value, prefersReducedMotion]);

  if (value === null) {
    return <span className={className}>{fallback}</span>;
  }

  return <span className={className}>{format(display)}</span>;
}
