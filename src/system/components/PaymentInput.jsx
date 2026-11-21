import { useEffect, useRef, useState } from 'react';

import { cx } from '../../utils';
import Spinner from './Spinner';
import { ADD_TONE, BTN, DELETE_TONE, ROW_FIELD } from './ui';

const MENU_SURFACE =
  'border-neutral-300 bg-[#fcfcfc] text-neutral-900 [[data-theme=dark]_&]:border-neutral-700 [[data-theme=dark]_&]:bg-[#232323] [[data-theme=dark]_&]:text-neutral-100';

const NO_SPINNER = `
.pay-input input[type=number]{-moz-appearance:textfield;appearance:textfield}
.pay-input input[type=number]::-webkit-outer-spin-button,.pay-input input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
`;

function MethodMenu({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  return (
    <div ref={rootRef} className="relative flex" style={{ alignSelf: 'stretch' }}>
      <button
        type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="flex min-w-[5.5rem] cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-semibold outline-none transition-colors hover:bg-neutral-500/10 focus-visible:bg-neutral-500/10"
      >
        <span>{selected?.label}</span>
      </button>
      {open && (
        <ul role="listbox" style={{ top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' }} className={cx('absolute z-50 min-w-[9rem] rounded-xl border p-1 shadow-lg', MENU_SURFACE)}>
          {options.map((o) => (
            <li key={o.value} role="presentation">
              <button
                type="button" role="option" aria-selected={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cx(
                  'block w-full cursor-pointer rounded-lg px-3 py-1.5 text-center text-sm outline-none hover:bg-neutral-500/15 focus-visible:bg-neutral-500/15',
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

export default function PaymentInput({
  amount, onAmountChange, amountLabel, method, methods, onMethodChange,
  submitLabel, submitTitle, submitDisabled, negative = false, busy = false,
}) {
  return (
    <div
      className={cx('pay-input flex items-stretch rounded-lg border border-neutral-500/40 transition-colors focus-within:border-emerald-500', ROW_FIELD)}
      style={{ height: 42, padding: 3, gap: 6 }}
    >
      <style>{NO_SPINNER}</style>
      <input
        type="number" step="50" dir="ltr" inputMode="decimal" aria-label={amountLabel} value={amount} onChange={(e) => onAmountChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold tabular-nums outline-none"
      />
      <span aria-hidden="true" className="w-px self-stretch bg-neutral-500/30" style={{ margin: '5px 0' }} />
      <MethodMenu value={method} options={methods} onChange={onMethodChange} />
      <button
        type="submit" disabled={submitDisabled} title={submitTitle}
        className={cx(BTN, negative ? DELETE_TONE : ADD_TONE, 'whitespace-nowrap px-4')}
      >
        {busy && <Spinner />}{submitLabel}
      </button>
    </div>
  );
}