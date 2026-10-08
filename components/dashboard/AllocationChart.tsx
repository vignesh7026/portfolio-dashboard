/**
 * CHANGED — the sector colour map moved to lib/sectorColors.ts so the new
 * Position Map (treemap) uses the identical palette instead of its own copy.
 */
'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Cell, Pie, PieChart, ResponsiveContainer, Sector as PieSector } from 'recharts';
import type { PieSectorDataItem } from 'recharts';
import { formatINR, formatPct } from '@/lib/format';
import { SECTOR_COLORS } from '@/lib/sectorColors';
import type { SectorGroup } from '@/types/holding';

interface AllocationChartProps {
  sectorGroups: SectorGroup[];
}

function renderActiveShape(props: PieSectorDataItem) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <PieSector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={(outerRadius as number) + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={6}
        style={{ filter: `drop-shadow(0 4px 10px ${fill}66)` }}
      />
    </g>
  );
}

export function AllocationChart({ sectorGroups }: AllocationChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(
    () =>
      sectorGroups.map((g) => ({
        name: g.sector,
        value: g.totalInvestment,
        gainPct: g.totalGainLossPct,
        color: SECTOR_COLORS[g.sector] ?? '#64748B',
      })),
    [sectorGroups]
  );

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const active = activeIndex !== null ? data[activeIndex] : null;
  const activeShare = active && total > 0 ? (active.value / total) * 100 : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Allocation by Sector</p>
          <p className="text-xs text-text-secondary">Share of total investment · hover a slice</p>
        </div>
      </div>

      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="56%"
              outerRadius="82%"
              paddingAngle={3}
              stroke="var(--surface)"
              strokeWidth={2}
              cornerRadius={4}
              isAnimationActive
              animationDuration={600}
              animationEasing="ease-out"
              activeShape={renderActiveShape}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={d.color}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
                  style={{ transition: 'opacity 150ms ease' }}
                  cursor="pointer"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center stat — swaps between portfolio total and the hovered sector */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={active ? active.name : 'total'}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              className="text-center"
            >
              {active ? (
                <>
                  <p className="text-[11px] text-text-secondary font-medium">{active.name}</p>
                  <p className="numeric-cell text-base font-semibold">{formatINR(active.value)}</p>
                  <p className={`text-[11px] numeric-cell ${((active.gainPct ?? 0) >= 0) ? 'text-gain' : 'text-loss'}`}>
                    {formatPct(active.gainPct)} · {activeShare?.toFixed(1)}%
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-text-secondary font-medium">Total Invested</p>
                  <p className="numeric-cell text-base font-semibold">{formatINR(total)}</p>
                  <p className="text-[11px] text-text-secondary">{data.length} sectors</p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {data.map((d, i) => {
          const share = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <li
              key={d.name}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center gap-1.5 text-xs rounded px-1 py-0.5 -mx-1 cursor-default transition-colors duration-150 ${
                activeIndex === i ? 'bg-surface-hover' : ''
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className={`truncate ${activeIndex === i ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                {d.name}
              </span>
              <span className="numeric-cell text-text-secondary ml-auto shrink-0">{share.toFixed(0)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
