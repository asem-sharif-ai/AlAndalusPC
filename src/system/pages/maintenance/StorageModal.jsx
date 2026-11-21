import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Ico from '../../components/Ico';
import useScrollLock from '../../components/useScrollLock';
import { BTN, BTN_PRIMARY, SURFACE } from '../../components/ui';
import { cx, uid } from '../../../utils';
import I18N from './maintenance.i18n';
import { MAX_COLS, MAX_GRIDS, MAX_ROWS, minSize, nextCode, slotsOf, usedSlots } from './maintenance.storage';
import { TextInput } from '../../components/TextField';

const CELL = 'flex h-12 min-h-[3rem] w-full min-w-[3.5rem] flex-col items-center justify-center whitespace-nowrap rounded-lg border px-1 text-xs font-semibold transition-all duration-150';
const CELL_FREE = 'border-neutral-500/30 bg-neutral-500/5';
const CELL_FREE_HOVER = 'hover:border-neutral-500/60 hover:bg-neutral-500/20';
const CELL_PICK = 'cursor-pointer hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-emerald-500/15 hover:shadow-md hover:ring-1 hover:ring-emerald-500 active:translate-y-0';
const CELL_TAKEN = 'border-red-500/40 bg-red-500/15 text-red-700 [[data-theme=dark]_&]:text-red-300 hover:border-red-500/70 hover:bg-red-500/25';
const CELL_ON = 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700';
const CHIP_ON = 'border-emerald-600 bg-emerald-600/15 font-semibold';
const LINK_RED = 'cursor-pointer text-sm font-medium text-red-600 underline underline-offset-4 hover:text-red-800 focus-visible:outline-2 focus-visible:outline-red-500 [[data-theme=dark]_&]:text-red-400 [[data-theme=dark]_&]:hover:text-red-300';
const LINK_PLAIN = 'cursor-pointer text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600 focus-visible:outline-2 focus-visible:outline-neutral-500 [[data-theme=dark]_&]:text-neutral-100 [[data-theme=dark]_&]:hover:text-neutral-300';
const LINK = 'cursor-pointer text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-500 [[data-theme=dark]_&]:text-emerald-300 [[data-theme=dark]_&]:hover:text-emerald-200';

export function GridIcon({ size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" width={size} height={size} style={{ width: size, height: size }} className="shrink-0"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ResizeHandle({ gridRef, scrollRef, grid, min, onResize, label, inert }) {
  const drag = useRef(null);
  const [active, setActive] = useState(false);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const stop = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    cancelAnimationFrame(d.raf);
    setActive(false);
    document.body.style.userSelect = d.userSelect;

    const el = scrollRef.current;
    if (el && (d.last.cols > d.cols0 || d.last.rows > d.rows0)) {
      requestAnimationFrame(() => el.scrollTo({
        left: d.last.cols > d.cols0 ? el.scrollWidth : el.scrollLeft,
        top: d.last.rows > d.rows0 ? el.scrollHeight : el.scrollTop,
        behavior: 'smooth',
      }));
    }
  };
  useEffect(() => () => drag.current && cancelAnimationFrame(drag.current.raf), []);

  const down = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const box = gridRef.current.getBoundingClientRect();
    const GAP = 6;
    drag.current = {
      x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, raf: 0,
      cols0: grid.cols, rows0: grid.rows, last: { cols: grid.cols, rows: grid.rows },

      sx: (box.width + GAP) / grid.cols, sy: (box.height + GAP) / grid.rows,
      userSelect: document.body.style.userSelect,
    };
    document.body.style.userSelect = 'none';
    setActive(true);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    d.px = e.clientX;
    d.py = e.clientY;
    if (d.raf) return;
    d.raf = requestAnimationFrame(() => {
      d.raf = 0;
      const cols = clamp(d.cols0 + Math.round((d.px - d.x) / d.sx), min.cols, MAX_COLS);
      const rows = clamp(d.rows0 + Math.round((d.py - d.y) / d.sy), min.rows, MAX_ROWS);
      if (cols === d.last.cols && rows === d.last.rows) return;
      d.last = { cols, rows };
      onResize(cols, rows);
    });
  };
  const key = (e) => {
    const step = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
    if (!step) return;
    e.preventDefault();
    onResize(clamp(grid.cols + step[0], min.cols, MAX_COLS), clamp(grid.rows + step[1], min.rows, MAX_ROWS));
  };

  return (
    <button
      type="button" aria-label={label} title={inert ? undefined : label} disabled={inert} tabIndex={inert ? -1 : 0}
      onPointerDown={down} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onKeyDown={key}
      style={{ touchAction: 'none', right: 0, bottom: 0, width: 18, height: 18, padding: 0 }}
      className={cx(
        'absolute grid place-items-center border transition-colors focus-visible:outline-2 focus-visible:outline-emerald-500',
        inert ? 'cursor-default border-neutral-500/20 bg-neutral-500/10 opacity-50' : 'cursor-nwse-resize',
        inert ? '' : active ? 'border-emerald-500 bg-emerald-500/30' : 'border-neutral-500/40 bg-neutral-500/10 hover:border-emerald-500 hover:bg-emerald-500/20',
      )}
    >
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <path d="M20 10 10 20M20 16l-4 4" />
      </svg>
    </button>
  );
}

const SCROLL_CSS = `
@keyframes slot-in{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
.slot-scroll{scrollbar-width:auto;-ms-overflow-style:auto}
.slot-scroll::-webkit-scrollbar{display:block;width:12px;height:12px}
.slot-scroll::-webkit-scrollbar{width:18px;height:18px}
.slot-scroll::-webkit-scrollbar-track{display:block;background:rgba(115,115,115,.15)}
.slot-scroll::-webkit-scrollbar-thumb{display:block;background:rgba(115,115,115,.6);border-radius:8px;border:3px solid transparent;background-clip:padding-box}
.slot-scroll::-webkit-scrollbar-thumb:hover{background:rgba(115,115,115,.85);background-clip:padding-box}
.slot-scroll::-webkit-scrollbar-corner{background:rgba(115,115,115,.15)}
@supports (-moz-appearance:none){.slot-scroll{scrollbar-color:rgba(115,115,115,.6) rgba(115,115,115,.15)}}
`;

function useNarrow(max = 640) {
  const query = `(max-width: ${max - 1}px)`;
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return narrow;
}

const firstId = (grids, selected) => (grids.find((g) => slotsOf(g).some((s) => s.label === selected)) || grids[0])?.id ?? null;

export default function StorageModal({ lang, grids, slotMap, selected = '', onPick, onOpenTicket, onSave, onRemove, onClose }) {
  useScrollLock();
  const t = I18N[lang].storage;
  const [activeId, setActiveId] = useState(() => firstId(grids, selected));
  const [draft, setDraft] = useState(null);
  const [choice, setChoice] = useState(selected);
  const [fresh, setFresh] = useState(null);
  const gridRef = useRef(null);
  const scrollRef = useRef(null);
  const narrow = useNarrow();

  const active = grids.find((g) => g.id === activeId) || grids[0] || null;
  const editing = draft !== null;

  const latest = useRef(null);
  latest.current = () => {
    if (editing) setDraft(null); else onClose();
  };
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      latest.current();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const add = () => {
    const names = new Set(grids.map((g) => g.name));
    let n = grids.length + 1;
    while (names.has(t.defaultName(n))) n++;
    const grid = { id: uid(), name: t.defaultName(n), code: nextCode(grids), cols: 2, rows: 2 };
    onSave(grid);
    setActiveId(grid.id);
    setFresh(grid.id);
    setDraft({ cols: grid.cols, rows: grid.rows, name: grid.name });
  };

  const startEdit = () => {
    setFresh(null);
    setDraft({ cols: active.cols, rows: active.rows, name: active.name });
  };
  const saveEdit = () => {
    const name = draft.name.trim() || active.name;
    if (draft.cols !== active.cols || draft.rows !== active.rows || name !== active.name) onSave({ ...active, cols: draft.cols, rows: draft.rows, name });
    setDraft(null);
  };
  const remove = () => {
    onRemove(active.id);
    setDraft(null);
  };

  const shown = active && (editing ? { ...active, cols: draft.cols, rows: draft.rows } : active);
  const cells = shown ? slotsOf(shown) : [];
  const free = cells.filter((c) => !slotMap.has(c.label)).length;
  const inUse = active ? usedSlots(active, slotMap).length : 0;
  const picking = !!onPick;
  const canPick = picking && !editing;
  const canOpen = !picking && !editing && !!onOpenTicket;
  const exists = choice && grids.some((g) => slotsOf(g).some((s) => s.label === choice));

  // keyboard: arrows move the cursor, Enter selects / deselects (or opens a taken slot), Shift+Enter runs the main button
  const [cursor, setCursor] = useState(selected);
  const keys = useRef(null);
  const dialogRef = useRef(null);
  useEffect(() => { dialogRef.current?.focus(); }, []); // take focus from the button that opened the modal
  const at = cells.find((c) => c.label === cursor)?.label ?? cells[0]?.label;
  keys.current = (e) => {
    if (e.target.closest?.('input, textarea, select')) return;
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (editing) saveEdit();
      else if (picking && ((exists || selected))) { onPick(choice); onClose(); }
      return;
    }
    if (editing || !cells.length) return;
    const onCell = e.target.closest?.('[data-cell]');
    const idx = Math.max(cells.findIndex((c) => c.label === at), 0);
    const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: shown.cols, ArrowUp: -shown.cols }[e.key];
    if (move) {
      e.preventDefault();
      const next = cells[Math.min(Math.max(idx + move, 0), cells.length - 1)].label;
      setCursor(next);
      requestAnimationFrame(() => gridRef.current?.querySelector(`[data-label="${CSS.escape(next)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && (onCell || e.target === dialogRef.current || !dialogRef.current?.contains(e.target))) {
      e.preventDefault();
      const label = cells[idx].label;
      const ticket = slotMap.get(label);
      if (canPick && !ticket) setChoice((c) => (c === label ? '' : label));
      else if (canOpen && ticket) onOpenTicket(label);
    }
  };
  useEffect(() => {
    const onKey = (e) => keys.current(e);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-black/50 p-4"
      style={{ gridTemplateColumns: 'minmax(0, 1fr)' }} // a plain auto track grows to the widest content; this one never exceeds the screen
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{SCROLL_CSS}</style>
      <div
        ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="storage-modal-title"
        className={cx('outline-none min-w-0 rounded-2xl border border-neutral-500/30 p-5 shadow-xl', SURFACE)}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, maxWidth: '100%', width: `min(100%, max(50vw, 34rem${shown ? `, ${shown.cols * 56 + (shown.cols - 1) * 6 + 68}px` : ''}))`, maxHeight: 'min(46rem, calc(100dvh - 2rem))' }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="storage-modal-title" className="min-w-0 text-lg font-bold [overflow-wrap:anywhere]">{onPick ? t.pickTitle : t.title}</h2>
          <button
            type="button" className={cx(BTN, 'shrink-0 !p-0')} style={{ width: 40, height: 40 }}
            onClick={onClose} aria-label={t.close} title={t.close}
          >
            <Ico name="x" />
          </button>
        </div>

        {grids.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {grids.map((g) => {
            const on = g.id === active?.id;

            if (on && editing) {
              return (
                <TextInput dir="auto"
                  key={g.id} value={draft.name} maxLength={40} aria-label={t.rename} autoFocus={fresh === g.id}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  style={{ width: `${Math.max(draft.name.length, 3) + 4}ch`, minWidth: '6rem', maxWidth: '100%' }}
                  className={cx(BTN, CHIP_ON, 'text-center outline-none focus:ring-2 focus:ring-emerald-600')}
                />
              );
            }
            return (
              <button
                key={g.id} type="button" disabled={editing} aria-pressed={on}
                onClick={() => setActiveId(g.id)}
                className={cx(BTN, on && CHIP_ON)}
              >
                {g.name}
              </button>
            );
          })}
          {!picking && !editing && (
            <button type="button" disabled={grids.length >= MAX_GRIDS} className={cx(BTN, '!px-2.5', 'disabled:cursor-not-allowed')} onClick={add} title={t.add} aria-label={t.add}>
              <Ico name="plus" />
            </button>
          )}
        </div>
        )}

        {active ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, minWidth: 0, maxWidth: '100%' }}>

            <div className="text-xs" style={{ display: 'flex', flexDirection: 'row', flexWrap: narrow ? 'wrap' : 'nowrap', alignItems: 'center', gap: narrow ? '10px 12px' : 12, whiteSpace: 'nowrap' }}>
              <ul className="m-0 list-none p-0" style={{ display: 'flex', alignItems: 'center', gap: 12, flex: narrow ? '1 1 auto' : '1 1 0', minWidth: 0, order: 1 }}>
                <li className="flex items-center gap-1.5"><i className={cx('inline-block h-3 w-3 rounded border', CELL_FREE)} />{t.available}</li>
                <li className="flex items-center gap-1.5"><i className={cx('inline-block h-3 w-3 rounded border', CELL_TAKEN)} />{t.taken}</li>
                {canPick && <li className="flex items-center gap-1.5"><i className={cx('inline-block h-3 w-3 rounded border', CELL_ON)} />{t.picked}</li>}
              </ul>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: narrow ? '1 1 100%' : '0 0 auto', order: narrow ? 0 : 2 }}>
                {picking ? null : editing ? (
                  <>
                    <button type="button" className={LINK} onClick={saveEdit}>{t.save}</button>

                    {inUse === 0 && (
                      <>
                        <span aria-hidden="true" className="opacity-60">•</span>
                        <button type="button" className={LINK_RED} onClick={remove}>{t.remove}</button>
                      </>
                    )}
                    <span aria-hidden="true" className="opacity-60">•</span>
                    <button type="button" className={LINK_PLAIN} onClick={() => setDraft(null)}>{t.cancel}</button>
                  </>
                ) : (
                  <button type="button" className={LINK} onClick={startEdit}>{t.edit}</button>
                )}
              </div>

              <p className="m-0" style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, flex: narrow ? '1 1 auto' : '1 1 0', minWidth: 0, order: narrow ? 2 : 3 }}>
                <span dir="ltr" className="font-semibold">{t.size(shown.cols, shown.rows)}</span>
                <span className="opacity-70">· {t.summary(free, cells.length)}</span>
              </p>
            </div>

            <div
              className="relative overflow-hidden rounded-xl border border-neutral-500/30"
              style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, minWidth: 0, maxWidth: '100%' }}
            >

              <div ref={scrollRef} dir="ltr" className={cx('slot-scroll', editing && 'is-editing')} style={{ overflow: 'scroll', flex: '1 1 auto', minHeight: 0, minWidth: 0, maxWidth: '100%', overscrollBehavior: 'contain' }}>

                <div dir="ltr" style={{ display: 'flex', justifyContent: 'center', width: 'max-content', minWidth: '100%', padding: 12 }}>
                  <div ref={gridRef} className="grid shrink-0 gap-1.5" style={{ gridTemplateColumns: `repeat(${shown.cols}, minmax(3.5rem, max-content))` }}>
                    {cells.map(({ label, col, row }) => {
                      const added = editing && (col >= active.cols || row > active.rows);
                      const ticket = slotMap.get(label);
                      const pickable = canPick && !ticket;
                      const openable = canOpen && !!ticket;
                      const Tag = pickable || openable ? 'button' : 'div';
                      return (
                        <Tag
                          key={label} data-cell data-label={label}
                          {...(pickable ? { type: 'button', onClick: () => setChoice((c) => (c === label ? '' : label)), 'aria-pressed': choice === label } : {})}
                          {...(openable ? { type: 'button', onClick: () => onOpenTicket(label) } : {})}
                          title={ticket ? `${label} · #${ticket}` : label}
                          style={added ? { animation: 'slot-in 160ms ease-out' } : undefined}
                          className={cx(
                            CELL,
                            ticket ? CELL_TAKEN : choice === label && canPick ? CELL_ON : cx(CELL_FREE, !pickable && CELL_FREE_HOVER),
                            pickable && choice !== label && CELL_PICK,
                            openable && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
                            !editing && at === label && 'outline outline-2 outline-offset-2 outline-emerald-500',
                          )}
                        >
                          <span>{label}</span>
                          {ticket && <span className="text-[10px] font-normal opacity-80">#{ticket}</span>}
                        </Tag>
                      );
                    })}
                  </div>
                </div>
              </div>
              <ResizeHandle
                inert={!editing}
                gridRef={gridRef} scrollRef={scrollRef} grid={shown} min={minSize(active, slotMap)} label={t.resize}
                onResize={(cols, rows) => setDraft((d) => d && { ...d, cols, rows })}
              />
            </div>

          </div>
        ) : (
          picking ? (
            <div className="w-full rounded-xl border border-dashed border-neutral-500/40 p-8 text-center">
              <p className="text-sm font-semibold">{t.pickNoneTitle}</p>
              <p className="text-sm opacity-70">{t.pickNoneHint}</p>
            </div>
          ) : (
            <button
              type="button" onClick={add}
              className="w-full cursor-pointer rounded-xl border border-dashed border-neutral-500/40 p-8 text-center text-sm font-semibold opacity-70 transition-opacity hover:opacity-100"
            >
              {t.noneHint}
            </button>
          )
        )}

        {onPick && (
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={BTN} onClick={onClose}>{t.cancel}</button>
            <button
              type="button" disabled={(!exists && !selected) || editing}
              className={cx(BTN_PRIMARY, 'disabled:cursor-not-allowed disabled:opacity-50')}
              onClick={() => { onPick(choice); onClose(); }}
            >
              {exists ? t.use(choice) : selected ? t.confirm : t.choose}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}