/**
 * CHANGED — search/filter/sort are now controlled props instead of local
 * state, lifted up into Dashboard.tsx. This is what lets the new command
 * palette (⌘K) drive "Show: Gainers" / "Sort by Gain-Loss" etc. from
 * anywhere on the page and have this table reflect it immediately, instead
 * of the two having no way to talk to each other. Sector open/close state
 * stays local — nothing outside this component needs it.
 * Filter tabs and sortable column headers keep `active:scale-95` — an
 * instant, CSS-only press state that fires in under a frame, before React
 * even re-renders with the new filter/sort result.
 *
 * CHANGED again — added a Table/Map segmented control next to the filter
 * tabs. "Map" swaps the table/cards for the new Position Map treemap, fed
 * the same search+filter-matched holdings (`visibleGroups`) re-summed into
 * fresh sector subtotals via `summarizeSector` — so searching "Suzlon" or
 * tapping "Losers" narrows the map exactly like it narrows the table. Sort
 * is irrelevant to a treemap (size already encodes magnitude), so it's left
 * alone rather than wired through.
 *
 * CHANGED again — sorting now genuinely runs through `@tanstack/react-table`
 * (`getSortedRowModel`) instead of the hand-rolled `sortHoldings()` that used
 * to live in lib/calculations.ts (removed). That library was already a
 * dependency — the PRD's recommended one for table display — but nothing
 * imported it; this closes that gap for real rather than leaving a
 * decorative line in package.json. react-table only owns the sort
 * comparison itself: this component still renders its own markup (no
 * react-table cell/header renderers), still groups by sector for the
 * accordion layout, and the external sortKey/sortDir/onSort contract the
 * command palette drives is completely unchanged — react-table's `sorting`
 * state is a one-way derived mirror of those same props, not a second
 * source of truth.
 */
'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';
import { filterHoldings, sortableValue, summarizeSector, type SortDirection } from '@/lib/calculations';
import type { EnrichedHolding, Sector, SectorGroup } from '@/types/holding';
import { ArrowDownIcon, ArrowUpIcon } from '@/components/ui/icons';
import { SectorTableGroup } from './SectorTableGroup';
import { SectorCardGroup } from './SectorCardGroup';
import { TreemapView } from './TreemapView';
import {
  FILTER_TABS,
  SORTABLE_COLUMNS,
  TABLE_COLUMNS,
  TABLE_GRID_COLUMNS,
  TABLE_MIN_WIDTH,
  VIEW_TABS,
  type FilterMode,
  type SortKey,
  type ViewMode,
} from './gridTemplate';

interface HoldingsTableProps {
  sectorGroups: SectorGroup[];
  onSelectHolding: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  sortKey: SortKey | null;
  sortDir: SortDirection;
  onSort: (key: SortKey) => void;
}

export function HoldingsTable({
  sectorGroups,
  onSelectHolding,
  search,
  onSearchChange,
  filterMode,
  onFilterModeChange,
  sortKey,
  sortDir,
  onSort,
}: HoldingsTableProps) {
  const [openSectors, setOpenSectors] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sectorGroups.map((g, i) => [g.sector, i < 2]))
  );
  const [view, setView] = useState<ViewMode>('table');

  const toggle = (sector: Sector) => setOpenSectors((prev) => ({ ...prev, [sector]: !prev[sector] }));

  // Search/filter first (sector-agnostic), then hand the flat result to
  // react-table for sorting, then regroup by sector for the accordion UI.
  const searchFiltered = useMemo(
    () => filterHoldings(sectorGroups.flatMap((g) => g.holdings), search, filterMode),
    [sectorGroups, search, filterMode]
  );

  const columns = useMemo<ColumnDef<EnrichedHolding, unknown>[]>(
    () => SORTABLE_COLUMNS.map((col) => ({ id: col.key, accessorFn: (h: EnrichedHolding) => sortableValue(h, col.key) })),
    []
  );

  const sorting: SortingState = useMemo(() => (sortKey ? [{ id: sortKey, desc: sortDir === 'desc' }] : []), [sortKey, sortDir]);

  const table = useReactTable({
    data: searchFiltered,
    columns,
    state: { sorting },
    // Never actually fires — this component's sort UI calls `onSort` directly
    // from its own header buttons rather than react-table's header renderer
    // — but a controlled `state.sorting` requires a handler, so this keeps
    // the two in sync if anything ever does trigger it.
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      if (next[0]) onSort(next[0].id as SortKey);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sortedFlat = table.getSortedRowModel().rows.map((r) => r.original);

  const visibleGroups = useMemo(() => {
    const bySector = new Map<Sector, EnrichedHolding[]>();
    for (const h of sortedFlat) {
      const list = bySector.get(h.sector) ?? [];
      list.push(h);
      bySector.set(h.sector, list);
    }
    return sectorGroups.map((group) => ({ group, visibleHoldings: bySector.get(group.sector) ?? [] }));
  }, [sectorGroups, sortedFlat]);

  const totalVisible = visibleGroups.reduce((sum, g) => sum + g.visibleHoldings.length, 0);

  const treemapGroups = useMemo<SectorGroup[]>(
    () =>
      visibleGroups
        .map(({ group, visibleHoldings }) => summarizeSector(group.sector, visibleHoldings))
        .filter((g) => g.holdings.length > 0),
    [visibleGroups]
  );

  if (sectorGroups.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface py-16 text-center">
        <p className="text-text-secondary text-sm">No active holdings</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-1)] overflow-hidden">
      {/* Toolbar: search + gainers/losers segmented control */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search holdings…"
            aria-label="Search holdings by name or code"
            className="w-full rounded-md border border-border bg-bg pl-8 pr-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent transition-shadow"
          />
        </div>

        <div className="relative flex items-center gap-0.5 rounded-md border border-border bg-bg p-0.5 text-xs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onFilterModeChange(tab.key)}
              className="relative px-2.5 py-1 rounded-[5px] font-medium transition-colors duration-150 active:scale-95"
            >
              {filterMode === tab.key && (
                <motion.span
                  layoutId="filter-pill"
                  className="absolute inset-0 rounded-[5px] bg-accent"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              {/* Dark text on the gold pill, not white — #C9A876 only clears AA (8.8:1) against near-black text. */}
              <span className={`relative z-10 ${filterMode === tab.key ? 'text-bg font-semibold' : 'text-text-secondary'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex items-center gap-0.5 rounded-md border border-border bg-bg p-0.5 text-xs">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              aria-pressed={view === tab.key}
              className="relative px-2.5 py-1 rounded-[5px] font-medium transition-colors duration-150 active:scale-95"
            >
              {view === tab.key && (
                <motion.span
                  layoutId="view-pill"
                  className="absolute inset-0 rounded-[5px] bg-accent"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className={`relative z-10 ${view === tab.key ? 'text-bg font-semibold' : 'text-text-secondary'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        <span className="text-xs text-text-secondary ml-auto">
          {totalVisible} holding{totalVisible === 1 ? '' : 's'}
        </span>
      </div>

      {view === 'map' ? (
        <div className="p-4">
          <TreemapView sectorGroups={treemapGroups} onSelectHolding={onSelectHolding} />
        </div>
      ) : (
        <>
          <div role="table" aria-label="Holdings" className="holdings-table hidden sm:block overflow-x-auto themed-scroll">
            <div style={{ minWidth: TABLE_MIN_WIDTH }}>
              <div
                role="row"
                className="grid sticky top-0 z-[2] bg-surface border-b border-border px-4 py-2.5"
                style={{ gridTemplateColumns: TABLE_GRID_COLUMNS }}
              >
                {TABLE_COLUMNS.map((col) => {
                  const isActive = sortKey === col.key;
                  return (
                    <button
                      key={col.key}
                      type="button"
                      role="columnheader"
                      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      disabled={!col.sortable}
                      onClick={() => col.sortable && onSort(col.key)}
                      className={`group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap transition-colors active:scale-95 ${
                        col.align === 'right' ? 'justify-end text-right' : 'justify-start text-left'
                      } ${col.sortable ? 'hover:text-accent cursor-pointer' : 'cursor-default'} ${
                        isActive ? 'text-accent' : 'text-text-secondary'
                      }`}
                    >
                      {col.label}
                      {col.sortable && (
                        <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
                          {isActive && sortDir === 'asc' ? <ArrowUpIcon className="w-2.5 h-2.5" /> : <ArrowDownIcon className="w-2.5 h-2.5" />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {visibleGroups.map(({ group, visibleHoldings }) => (
                <SectorTableGroup
                  key={group.sector}
                  group={group}
                  visibleHoldings={visibleHoldings}
                  isOpen={!!openSectors[group.sector]}
                  onToggle={() => toggle(group.sector)}
                  onSelectHolding={onSelectHolding}
                />
              ))}
            </div>
          </div>

          {/* Mobile: card-per-holding, grouped by sector */}
          <div className="holdings-cards sm:hidden grid gap-3 p-3">
            {visibleGroups.map(({ group, visibleHoldings }) => (
              <SectorCardGroup
                key={group.sector}
                group={group}
                visibleHoldings={visibleHoldings}
                isOpen={!!openSectors[group.sector]}
                onToggle={() => toggle(group.sector)}
                onSelectHolding={onSelectHolding}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
