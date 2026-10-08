/**
 * NEW — squarified treemap layout (Bruls, Huizing & van Wijk, 1999), used by
 * the Position Map view. Pure math, no DOM: give it items + a value getter
 * and a pixel-space box, get back rectangles that sum to that box and keep
 * aspect ratios close to square (unlike a naive slice-and-dice layout, which
 * degenerates into slivers once values vary a lot — holdings range from a
 * few thousand rupees to several lakhs, so this matters here).
 */

export interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function worst(row: number[], length: number): number {
  const sum = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = sum * sum;
  const l2 = length * length;
  return Math.max((l2 * max) / s2, s2 / (l2 * min));
}

function layoutRow(row: number[], x: number, y: number, w: number, h: number): TreemapRect[] {
  const rowSum = row.reduce((a, b) => a + b, 0);
  const rects: TreemapRect[] = [];
  if (w >= h) {
    const colWidth = h > 0 ? rowSum / h : 0;
    let oy = y;
    for (const area of row) {
      const itemH = colWidth > 0 ? area / colWidth : 0;
      rects.push({ x, y: oy, w: colWidth, h: itemH });
      oy += itemH;
    }
  } else {
    const rowHeight = w > 0 ? rowSum / w : 0;
    let ox = x;
    for (const area of row) {
      const itemW = rowHeight > 0 ? area / rowHeight : 0;
      rects.push({ x: ox, y, w: itemW, h: rowHeight });
      ox += itemW;
    }
  }
  return rects;
}

/** Areas must already sum to w*h. Returns rects in the same order as `areas`. */
function squarify(areas: number[], x: number, y: number, w: number, h: number): TreemapRect[] {
  const result: TreemapRect[] = [];
  let remaining = areas.slice();
  let rx = x;
  let ry = y;
  let rw = w;
  let rh = h;

  while (remaining.length > 0) {
    if (remaining.length === 1) {
      result.push(...layoutRow(remaining, rx, ry, rw, rh));
      break;
    }
    const length = Math.min(rw, rh);
    let row = [remaining[0]];
    let i = 1;
    while (i < remaining.length) {
      const nextRow = [...row, remaining[i]];
      if (worst(nextRow, length) <= worst(row, length)) {
        row = nextRow;
        i++;
      } else {
        break;
      }
    }
    result.push(...layoutRow(row, rx, ry, rw, rh));

    const rowSum = row.reduce((a, b) => a + b, 0);
    if (rw >= rh) {
      const colWidth = rh > 0 ? rowSum / rh : 0;
      rx += colWidth;
      rw -= colWidth;
    } else {
      const rowHeight = rw > 0 ? rowSum / rw : 0;
      ry += rowHeight;
      rh -= rowHeight;
    }
    remaining = remaining.slice(row.length);
  }
  return result;
}

/**
 * Lays out arbitrary items by a numeric value within a pixel box. Items with
 * a non-positive value are dropped (zero-area rects aren't renderable and
 * would blow up the aspect-ratio math). Returns pairs in descending-value
 * order, which is also the order squarify produces its best packing in.
 */
export function squarifyItems<T>(
  items: T[],
  getValue: (item: T) => number,
  x: number,
  y: number,
  w: number,
  h: number
): { item: T; rect: TreemapRect }[] {
  const positive = items.filter((item) => getValue(item) > 0);
  if (positive.length === 0 || w <= 0 || h <= 0) return [];

  const sorted = [...positive].sort((a, b) => getValue(b) - getValue(a));
  const total = sorted.reduce((sum, item) => sum + getValue(item), 0);
  const scale = (w * h) / total;
  const areas = sorted.map((item) => getValue(item) * scale);
  const rects = squarify(areas, x, y, w, h);

  return sorted.map((item, idx) => ({ item, rect: rects[idx] }));
}
