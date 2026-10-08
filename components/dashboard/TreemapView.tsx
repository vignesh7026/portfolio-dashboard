/**
 * NEW — Position Map: a squarified treemap (lib/treemap.ts) of the same
 * holdings the table shows, nested two levels deep (sector boxes, then
 * holdings inside each). Box size is each holding's *investment* — not its
 * live present value — deliberately, so the layout stays stable tick to
 * tick; only each cell's colour (gain/loss intensity) and label update as
 * quotes refresh. Sizing by present value instead would reflow every 15s,
 * which reads as the whole map jittering rather than prices moving.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { squarifyItems } from '@/lib/treemap';
import { formatINR, formatPct } from '@/lib/format';
import { SECTOR_COLORS } from '@/lib/sectorColors';
import type { SectorGroup } from '@/types/holding';

interface TreemapViewProps {
  sectorGroups: SectorGroup[];
  onSelectHolding: (id: string) => void;
}

const SECTOR_GAP = 4;
const CELL_GAP = 2;
const HEADER_HEIGHT = 20;

function useContainerSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, ...size };
}

export function TreemapView({ sectorGroups, onSelectHolding }: TreemapViewProps) {
  const { ref: containerRef, width, height } = useContainerSize();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const sectorLayout = useMemo(() => {
    if (width === 0 || height === 0) return [];
    return squarifyItems(sectorGroups, (g) => g.totalInvestment, 0, 0, width, height);
  }, [sectorGroups, width, height]);

  return (
    <div>
      <div ref={containerRef} className="relative w-full h-80">
        {sectorLayout.map(({ item: group, rect }) => {
          const innerX = rect.x + SECTOR_GAP / 2;
          const innerY = rect.y + HEADER_HEIGHT + SECTOR_GAP / 2;
          const innerW = Math.max(0, rect.w - SECTOR_GAP);
          const innerH = Math.max(0, rect.h - HEADER_HEIGHT - SECTOR_GAP);
          const holdingLayout = squarifyItems(group.holdings, (h) => h.investment, innerX, innerY, innerW, innerH);
          const sectorColor = SECTOR_COLORS[group.sector] ?? '#8A8D93';
          const sectorIsGain = (group.totalGainLossPct ?? 0) >= 0;

          return (
            <div
              key={group.sector}
              className="absolute"
              style={{
                left: `${(rect.x / width) * 100}%`,
                top: `${(rect.y / height) * 100}%`,
                width: `${(rect.w / width) * 100}%`,
                height: `${(rect.h / height) * 100}%`,
              }}
            >
              <div
                className="absolute left-0 top-0 right-0 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary"
                style={{ height: HEADER_HEIGHT }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sectorColor }} aria-hidden="true" />
                <span className="truncate">{group.sector}</span>
                <span className={`numeric-cell ml-auto shrink-0 ${sectorIsGain ? 'text-gain' : 'text-loss'}`}>
                  {formatPct(group.totalGainLossPct, 1)}
                </span>
              </div>

              {holdingLayout.map(({ item: h, rect: hRect }) => {
                const gainPct = h.gainLossPct ?? 0;
                const isGain = gainPct >= 0;
                const intensity = Math.min(1, Math.abs(gainPct) / 10);
                const alpha = Math.round(18 + intensity * 62);
                const isHovered = hoverId === h.id;
                const cellW = (hRect.w / rect.w) * 100;
                const cellH = (hRect.h / rect.h) * 100;
                const showLabel = hRect.w > 54 && hRect.h > 28;

                return (
                  <motion.button
                    key={h.id}
                    type="button"
                    onClick={() => onSelectHolding(h.id)}
                    onMouseEnter={() => setHoverId(h.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onFocus={() => setHoverId(h.id)}
                    onBlur={() => setHoverId(null)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    title={`${h.particulars} · ${formatINR(h.presentValue)} · ${formatPct(h.gainLossPct)}`}
                    aria-label={`${h.particulars}: present value ${formatINR(h.presentValue)}, ${formatPct(h.gainLossPct)}. Open details.`}
                    className="absolute flex flex-col items-start justify-between overflow-hidden rounded-[4px] border text-left outline-none focus-visible:ring-2 focus-visible:ring-accent transition-[border-color,box-shadow] duration-150"
                    style={{
                      left: `calc(${((hRect.x - rect.x) / rect.w) * 100}% + ${CELL_GAP / 2}px)`,
                      top: `calc(${((hRect.y - rect.y) / rect.h) * 100}% + ${CELL_GAP / 2}px)`,
                      width: `calc(${cellW}% - ${CELL_GAP}px)`,
                      height: `calc(${cellH}% - ${CELL_GAP}px)`,
                      padding: showLabel ? '5px 7px' : '2px',
                      backgroundColor: `color-mix(in srgb, ${isGain ? 'var(--gain)' : 'var(--loss)'} ${alpha}%, var(--surface))`,
                      borderColor: isHovered ? 'var(--accent)' : 'var(--border)',
                      zIndex: isHovered ? 5 : 1,
                      boxShadow: isHovered ? 'var(--shadow-2)' : 'none',
                    }}
                  >
                    {showLabel && (
                      <>
                        <span className="text-[11px] font-medium text-text-primary truncate w-full">{h.particulars}</span>
                        <span className={`numeric-cell text-[11px] font-semibold ${isGain ? 'text-gain' : 'text-loss'}`}>
                          {formatPct(h.gainLossPct)}
                        </span>
                      </>
                    )}
                  </motion.button>
                );
              })}
            </div>
          );
        })}

        {sectorLayout.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-text-secondary">
            No holdings match
          </div>
        )}
      </div>
    </div>
  );
}
