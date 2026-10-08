/**
 * NEW — composite "Portfolio Health" ring. Score + the diversification/
 * concentration/stability breakdown it's made of come from lib/health.ts;
 * this component is purely presentational. The breakdown is a hover/focus/
 * tap reveal (absolute-positioned, doesn't push layout) rather than always
 * visible, so the card stays as compact as its two siblings at rest.
 */
'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { PortfolioHealth } from '@/lib/health';
import { TiltCard } from './TiltCard';
import { AnimatedNumber } from './AnimatedNumber';

interface PortfolioHealthGaugeProps {
  health: PortfolioHealth;
}

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;

function bandColor(score: number): string {
  if (score >= 70) return 'var(--gain)';
  if (score >= 45) return 'var(--accent)';
  return 'var(--loss)';
}

function bandLabel(score: number): string {
  if (score >= 70) return 'Healthy';
  if (score >= 45) return 'Fair';
  return 'Needs attention';
}

export function PortfolioHealthGauge({ health }: PortfolioHealthGaugeProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { score } = health;
  const color = score !== null ? bandColor(score) : 'var(--text-tertiary)';
  const offset = score !== null ? CIRCUMFERENCE * (1 - score / 100) : CIRCUMFERENCE;

  return (
    <TiltCard glow={color} className="relative rounded-xl border border-border bg-surface h-full active:scale-[0.98] transition-transform duration-100">
      <button
        type="button"
        onClick={() => setShowBreakdown((v) => !v)}
        onMouseEnter={() => setShowBreakdown(true)}
        onMouseLeave={() => setShowBreakdown(false)}
        onFocus={() => setShowBreakdown(true)}
        onBlur={() => setShowBreakdown(false)}
        aria-expanded={showBreakdown}
        aria-label={score !== null ? `Portfolio health score ${Math.round(score)} of 100, ${bandLabel(score)}. Press for breakdown.` : 'Portfolio health, collecting data'}
        className="w-full h-full text-left outline-none p-5 rounded-xl focus-visible:ring-2 focus-visible:ring-accent"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Portfolio Health</p>

        <div className="mt-2.5 flex items-center gap-3">
          <div className="relative w-[64px] h-[64px] shrink-0">
            <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="5" />
              {score !== null && (
                <motion.circle
                  cx="32"
                  cy="32"
                  r={RADIUS}
                  fill="none"
                  stroke={color}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  initial={{ strokeDashoffset: CIRCUMFERENCE }}
                  animate={{ strokeDashoffset: offset }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.9, ease: EASE_SETTLE }}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="numeric-cell text-base font-semibold text-text-primary">
                {score !== null ? <AnimatedNumber value={score} format={(v) => Math.round(v).toString()} /> : '—'}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color }}>
              {score !== null ? bandLabel(score) : 'Collecting data…'}
            </p>
            <p className="mt-1 text-xs text-text-secondary truncate">
              {health.topHolding ? `${health.topHolding.name} is ${health.topHolding.pct.toFixed(0)}% of book` : `${health.sectorCount} sectors`}
            </p>
          </div>
        </div>
      </button>

      <motion.div
        initial={false}
        animate={
          showBreakdown ? { opacity: 1, y: 0, pointerEvents: 'auto' } : { opacity: 0, y: -4, pointerEvents: 'none' }
        }
        transition={{ duration: 0.16 }}
        className="absolute left-0 right-0 top-full mt-2 z-20 rounded-lg border border-border bg-surface-raised p-3 shadow-[var(--shadow-2)] space-y-2"
      >
        <BreakdownRow label="Diversification" value={health.diversification} />
        <BreakdownRow label="Concentration" value={health.concentration} />
        <BreakdownRow label="Stability" value={health.volatility} />
      </motion.div>
    </TiltCard>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="numeric-cell text-text-primary">{Math.round(value)}</span>
      </div>
      <div className="h-1 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
