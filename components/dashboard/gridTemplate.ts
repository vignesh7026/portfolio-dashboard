export const TABLE_MIN_WIDTH = 1180;

export const TABLE_GRID_COLUMNS =
  'minmax(170px,1.7fr) 110px 70px 120px 110px 92px 150px 140px 160px 90px minmax(150px,1fr)';

export const TABLE_COLUMNS = [
  { key: 'particulars', label: 'Particulars', align: 'left' as const, sortable: true },
  { key: 'purchasePrice', label: 'Purchase Price', align: 'right' as const, sortable: true },
  { key: 'qty', label: 'Qty', align: 'right' as const, sortable: true },
  { key: 'investment', label: 'Investment', align: 'right' as const, sortable: true },
  { key: 'portfolioPct', label: 'Portfolio %', align: 'right' as const, sortable: true },
  { key: 'exchange', label: 'NSE/BSE', align: 'left' as const, sortable: false },
  { key: 'cmp', label: 'CMP', align: 'right' as const, sortable: true },
  { key: 'presentValue', label: 'Present Value', align: 'right' as const, sortable: true },
  { key: 'gainLoss', label: 'Gain/Loss', align: 'right' as const, sortable: true },
  { key: 'peRatio', label: 'P/E Ratio', align: 'right' as const, sortable: true },
  { key: 'latestEarnings', label: 'Latest Earnings', align: 'left' as const, sortable: false },
] as const;

export type SortKey = (typeof TABLE_COLUMNS)[number]['key'];

/**
 * NEW — filter mode + labels moved here (were local to HoldingsTable.tsx) so
 * the command palette can read/write the exact same state as the table's own
 * toolbar instead of duplicating the type.
 */
export type FilterMode = 'all' | 'gainers' | 'losers';

export const FILTER_TABS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gainers', label: 'Gainers' },
  { key: 'losers', label: 'Losers' },
];

export const SORTABLE_COLUMNS = TABLE_COLUMNS.filter((c) => c.sortable);

/** NEW — Table vs. Position Map toggle, same segmented-control pattern as FILTER_TABS. */
export type ViewMode = 'table' | 'map';

export const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: 'table', label: 'Table' },
  { key: 'map', label: 'Map' },
];

