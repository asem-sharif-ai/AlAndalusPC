import { createPortal } from 'react-dom';

import Spinner from './Spinner';
import useScrollLock from './useScrollLock';

import { BTN, BTN_PRIMARY, SURFACE } from './ui';
import { cx } from '../../utils';

export default function ConfirmDialog({ id = 'confirm', title, body, note, keepLabel, confirmLabel, onKeep, onConfirm, children, confirmDisabled, busy }) {
  useScrollLock();
  return createPortal(
    <div
      className="fixed inset-0 grid place-items-center overflow-y-auto overflow-x-hidden bg-black/50 p-4"
      style={{ zIndex: 2000 }}
      onMouseDown={(e) => { e.stopPropagation(); e.target === e.currentTarget && !busy && onKeep(); }}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        if (!busy) onKeep();
      }}
    >
      <div
        role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`}
        className={cx('w-full max-w-sm space-y-3 rounded-2xl border border-neutral-500/30 p-5 shadow-xl', SURFACE)}
      >
        <h2 id={`${id}-title`} className="text-lg font-bold [overflow-wrap:anywhere]">{title}</h2>
        {body && <p className="text-sm opacity-80 [overflow-wrap:anywhere]">{body}</p>}
        {children}
        {note && <p className="whitespace-pre-line [overflow-wrap:anywhere] rounded-lg bg-neutral-500/10 px-3 py-2 text-sm font-semibold">{note}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" autoFocus disabled={busy} className={BTN} onClick={onKeep}>{keepLabel}</button>
          <button type="button" disabled={confirmDisabled || busy} aria-busy={busy || undefined} className={cx(BTN_PRIMARY, 'disabled:cursor-not-allowed disabled:opacity-50')} onClick={onConfirm}>{busy && <Spinner />}{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
