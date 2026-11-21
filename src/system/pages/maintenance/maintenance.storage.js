export const MAX_COLS = 26;
export const MAX_ROWS = 26;

const colLetter = (i) => String.fromCharCode(65 + i);

export const MAX_GRIDS = 26;
export function nextCode(grids) {
  const used = new Set(grids.map((g) => g.code));
  for (let i = 0; i < MAX_GRIDS; i++) if (!used.has(colLetter(i))) return colLetter(i);
  return '';
}

export function slotsOf(grid) {
  const prefix = `${grid.code || 'A'}-`;
  const out = [];
  for (let row = 1; row <= grid.rows; row++)
    for (let col = 0; col < grid.cols; col++) out.push({ label: `${prefix}${colLetter(col)}${String(row).padStart(2, '0')}`, col, row });
  return out;
}

export const usedSlots = (grid, slotMap) => slotsOf(grid).map((s) => s.label).filter((l) => slotMap.has(l));

export function minSize(grid, slotMap) {
  let cols = 1;
  let rows = 1;
  for (const s of slotsOf(grid)) {
    if (!slotMap.has(s.label)) continue;
    cols = Math.max(cols, s.col + 1);
    rows = Math.max(rows, s.row);
  }
  return { cols, rows };
}
