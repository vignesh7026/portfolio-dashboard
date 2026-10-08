/** CHANGED (brief item 6 — cohesion audit): path draw-in used a stray easing curve; now EASE_SETTLE. */
'use client';

import { useId, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  tone?: 'auto' | 'gain' | 'loss' | 'neutral';
  fill?: boolean;
  strokeWidth?: number;
  className?: string;
}

/** Tiny animated trend line — no chart library overhead for a 48×20 glance indicator. */
export function Sparkline({
  data,
  width = 56,
  height = 22,
  tone = 'auto',
  fill = false,
  strokeWidth = 1.6,
  className = '',
}: SparklineProps) {
  const gradientId = useId();
  const prefersReducedMotion = useReducedMotion();

  const { path, areaPath, isUp } = useMemo(() => {
    if (!data || data.length < 2) return { path: '', areaPath: '', isUp: true };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const pad = height * 0.12;
    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return [x, y];
    });
    const p = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const area = `${p} L${width},${height} L0,${height} Z`;
    return { path: p, areaPath: area, isUp: data[data.length - 1] >= data[0] };
  }, [data, width, height]);

  if (!path) return <div style={{ width, height }} className={className} />;

  const resolvedTone = tone === 'auto' ? (isUp ? 'gain' : 'loss') : tone;
  const stroke = resolvedTone === 'gain' ? 'var(--gain)' : resolvedTone === 'loss' ? 'var(--loss)' : 'var(--text-secondary)';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      {fill && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
      <motion.path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_SETTLE }}
      />
    </svg>
  );
}
