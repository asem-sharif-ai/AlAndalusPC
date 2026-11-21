import { useEffect, useRef, useState } from 'react';

import { cx } from '../../utils';
import Ico from './Ico';
import { BTN } from './ui';

const FRAME = { display: 'inline-flex', flexDirection: 'row', alignItems: 'stretch', width: '100%', minWidth: 'min(130px, 100%)', minHeight: 36, padding: 0, gap: 0, overflow: 'hidden' };
const VALUE = { display: 'flex', alignItems: 'center', flex: '1 1 auto', minWidth: 0, gap: 8, padding: '6px 12px', fontSize: 14, lineHeight: '20px', textAlign: 'start', overflowWrap: 'anywhere', color: 'inherit' };
const ARROW = { display: 'grid', placeItems: 'center', flex: 'none', width: 34, borderInlineStart: '1px solid rgba(115, 115, 115, 0.35)' };

const MENU_SURFACE = 'border-neutral-300 bg-[#fcfcfc] [[data-theme=dark]_&]:border-neutral-700 [[data-theme=dark]_&]:bg-[#232323] text-neutral-900 [[data-theme=dark]_&]:text-neutral-100';

export default function Dropdown({ label, value, options, onChange, active = false, hideDivider = false, fill = false, className, buttonClassName, arrowClassName }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const rect = root.getBoundingClientRect();
    setUp(window.innerHeight - rect.bottom < 260 && rect.top > window.innerHeight - rect.bottom);
    root.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });

    const onPointerDown = (e) => {
      if (!root.contains(e.target)) setOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      root.querySelector('button')?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  const onMenuKeyDown = (e) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const items = [...e.currentTarget.querySelectorAll('[role="option"]')];
    const next = items.indexOf(document.activeElement) + step;
    items[(next + items.length) % items.length]?.focus();
  };

  const choose = (v) => {
    onChange(v);
    setOpen(false);
    rootRef.current.querySelector('button')?.focus();
  };

  return (
    <div
      ref={rootRef}
      style={fill ? { display: 'block', width: '100%' } : undefined}
      className={cx('relative inline-block', className)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={FRAME}
        className={cx(BTN, 'cursor-pointer', active && 'border-emerald-600 ring-1 ring-emerald-600', buttonClassName)}
      >
        <span style={VALUE}>
          {label && <span className="opacity-70">{label}:</span>}
          <span className="min-w-0 font-semibold">{selected?.label}</span>
        </span>
        <span style={hideDivider ? { ...ARROW, borderInlineStart: 'none' } : ARROW} className={arrowClassName}>
          <Ico name="chevron" className={cx('transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          onKeyDown={onMenuKeyDown}
          className={cx(
            up ? 'absolute start-0 bottom-full z-50 mb-1' : 'absolute start-0 top-full z-50 mt-1',
            'max-h-60 w-max min-w-full max-w-[calc(100vw-2rem)] overflow-auto',
            'rounded-xl border p-1 shadow-lg',
            MENU_SURFACE,
          )}
        >
          {options.map((o) => (
            <li key={o.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => choose(o.value)}
                className={cx(
                  'block w-full cursor-pointer rounded-lg px-3 py-1.5 text-start text-sm outline-none [overflow-wrap:anywhere]',
                  'hover:bg-neutral-500/15 focus-visible:bg-neutral-500/15',
                  o.value === value && 'font-semibold text-emerald-700 [[data-theme=dark]_&]:text-emerald-300',
                )}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}