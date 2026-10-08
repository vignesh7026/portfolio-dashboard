/**
 * NEW — pulled out of AllocationChart.tsx so the new Position Map (treemap)
 * can use the exact same sector→colour mapping instead of redefining it.
 * Two charts disagreeing on what colour "Tech" is would be a cohesion bug.
 */
import type { Sector } from '@/types/holding';

// A muted jewel-tone categorical palette, deliberately distinct from the single
// champagne-gold accent reserved for interactive/important elements.
export const SECTOR_COLORS: Record<Sector, string> = {
  Financial: '#5B8DF0', // sapphire
  Tech: '#8B7FD6', // amethyst
  Consumer: '#D6A94F', // topaz
  Power: '#4FAE84', // emerald
  Pipe: '#C77DAD', // orchid
  Others: '#8A8D93', // pewter
};
