/**
 * NEW — ⌘K / Ctrl+K command palette. Jump to any holding, change the
 * table's filter/sort, rewind to the start of the session, or scroll to a
 * section — all from one keyboard-driven surface, the single clearest
 * "this is a serious product" signal a dashboard can carry (Linear,
 * Raycast, Vercel, Stripe all have one). It reads and writes the exact
 * same state the table's own toolbar does (lifted into Dashboard.tsx),
 * not a parallel copy of it.
 */
'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { SortDirection } from '@/lib/calculations';
import type { EnrichedHolding } from '@/types/holding';
import { formatINR, formatPct } from '@/lib/format';
import { ArrowDownIcon, ArrowUpIcon } from '@/components/ui/icons';
import { FILTER_TABS, SORTABLE_COLUMNS, type FilterMode, type SortKey } from './gridTemplate';

interface CommandPaletteProps {
  holdings: EnrichedHolding[];
  onSelectHolding: (id: string) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  sortKey: SortKey | null;
  sortDir: SortDirection;
  onSort: (key: SortKey) => void;
  canRewind: boolean;
  isScrubbing: boolean;
  onRewindToStart: () => void;
  onReturnToLive: () => void;
  sectionRefs: {
    table: RefObject<HTMLDivElement | null>;
    charts: RefObject<HTMLDivElement | null>;
    realized: RefObject<HTMLDivElement | null>;
  };
}

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  onRun: () => void;
}

const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;

export function CommandPalette({
  holdings,
  onSelectHolding,
  filterMode,
  onFilterModeChange,
  sortKey,
  sortDir,
  onSort,
  canRewind,
  isScrubbing,
  onRewindToStart,
  onReturnToLive,
  sectionRefs,
}: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
  };

  const scrollTo = (ref: RefObject<HTMLDivElement | null>) => () => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];

    for (const h of holdings) {
      const isGain = (h.gainLoss ?? 0) >= 0;
      list.push({
        id: `holding-${h.id}`,
        group: 'Holdings',
        label: h.particulars,
        hint: `${h.quote.cmp !== null ? formatINR(h.quote.cmp) : '—'} · ${isGain ? '+' : ''}${formatPct(h.gainLossPct)}`,
        keywords: `${h.particulars} ${h.exchangeCodeRaw} ${h.sector}`,
        onRun: () => onSelectHolding(h.id),
      });
    }

    for (const tab of FILTER_TABS) {
      list.push({
        id: `filter-${tab.key}`,
        group: 'View',
        label: `Show: ${tab.label}`,
        hint: filterMode === tab.key ? 'current' : undefined,
        onRun: () => onFilterModeChange(tab.key),
      });
    }

    for (const col of SORTABLE_COLUMNS) {
      const isActive = sortKey === col.key;
      list.push({
        id: `sort-${col.key}`,
        group: 'Sort',
        label: `Sort by ${col.label}`,
        hint: isActive ? (sortDir === 'asc' ? 'ascending → click to flip' : 'descending → click to flip') : undefined,
        onRun: () => onSort(col.key),
      });
    }

    list.push(
      { id: 'nav-table', group: 'Navigate', label: 'Go to Holdings Table', onRun: scrollTo(sectionRefs.table) },
      { id: 'nav-charts', group: 'Navigate', label: 'Go to Charts', onRun: scrollTo(sectionRefs.charts) },
      { id: 'nav-realized', group: 'Navigate', label: 'Go to Realized Positions', onRun: scrollTo(sectionRefs.realized) }
    );

    if (canRewind) {
      list.push({
        id: 'time-rewind',
        group: 'Time Travel',
        label: 'Rewind to start of session',
        onRun: onRewindToStart,
      });
    }
    if (isScrubbing) {
      list.push({
        id: 'time-live',
        group: 'Time Travel',
        label: 'Return to live',
        onRun: onReturnToLive,
      });
    }

    return list;
  }, [holdings, filterMode, sortKey, sortDir, canRewind, isScrubbing, onSelectHolding, onFilterModeChange, onSort, onRewindToStart, onReturnToLive, sectionRefs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.filter((c) => c.group !== 'Holdings');
    return commands.filter((c) => (c.keywords ?? c.label).toLowerCase().includes(q));
  }, [commands, query]);

  // Global shortcut: ⌘K / Ctrl+K opens, Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      } else if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const run = (cmd: Command) => {
    cmd.onRun();
    close();
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) run(filtered[activeIndex]);
    }
  };

  // Group while preserving the filtered/ranked order.
  const groups: { name: string; items: { cmd: Command; index: number }[] }[] = [];
  filtered.forEach((cmd, index) => {
    let g = groups.find((g) => g.name === cmd.group);
    if (!g) {
      g = { name: cmd.group, items: [] };
      groups.push(g);
    }
    g.items.push({ cmd, index });
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary hover:border-accent/40 hover:text-text-primary active:scale-95 transition-all"
        aria-label="Open command palette"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Search or jump to…
        <kbd className="numeric-cell text-[10px] rounded border border-border px-1.5 py-0.5 text-text-tertiary">⌘K</kbd>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="cmdk-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              aria-hidden="true"
            />
            <motion.div
              key="cmdk-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -6 }}
              transition={{ duration: 0.2, ease: EASE_SETTLE }}
              className="fixed top-[14vh] left-1/2 -translate-x-1/2 z-[61] w-[92vw] max-w-lg rounded-xl border border-border bg-surface-raised shadow-[var(--shadow-2)] overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
                <svg viewBox="0 0 16 16" className="w-4 h-4 text-text-secondary shrink-0" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleListKeyDown}
                  placeholder="Search holdings, or type a command…"
                  aria-label="Command search"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-text-tertiary"
                />
                <kbd className="numeric-cell text-[10px] rounded border border-border px-1.5 py-0.5 text-text-tertiary shrink-0">Esc</kbd>
              </div>

              <div ref={listRef} className="max-h-[50vh] overflow-y-auto themed-scroll py-2">
                {filtered.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-text-secondary text-center">No matches.</p>
                ) : (
                  groups.map((g) => (
                    <div key={g.name} className="mb-1 last:mb-0">
                      <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{g.name}</p>
                      {g.items.map(({ cmd, index }) => (
                        <button
                          key={cmd.id}
                          type="button"
                          data-index={index}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => run(cmd)}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors ${
                            index === activeIndex ? 'bg-surface-hover text-text-primary' : 'text-text-secondary'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {index === activeIndex && <span className="w-1 h-1 rounded-full bg-accent shrink-0" aria-hidden="true" />}
                            <span className="truncate">{cmd.label}</span>
                          </span>
                          {cmd.hint && (
                            <span className="numeric-cell text-xs text-text-tertiary shrink-0 flex items-center gap-1">
                              {cmd.hint.startsWith('+') && <ArrowUpIcon className="w-2.5 h-2.5 text-gain" />}
                              {cmd.hint.startsWith('-') && <ArrowDownIcon className="w-2.5 h-2.5 text-loss" />}
                              {cmd.hint}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
