import { useState } from 'react';

// Keyword chips, centered on every screen size. Tapping one fades it (tap again to restore) so you can tick off what you've covered.
export default function HintChips({ items }) {
  const [faded, setFaded] = useState(() => new Set());
  const toggle = (x) => setFaded((prev) => {
    const next = new Set(prev);
    if (!next.delete(x)) next.add(x);
    return next;
  });
  return (
    <span className="block" style={{ paddingTop: 0, paddingBottom: 2 }}>
      <span className="flex flex-wrap items-center justify-center gap-1.5">
      {items.map((x) => (
        <button
          key={x} type="button" aria-pressed={faded.has(x)}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(x); }}
          style={{ opacity: faded.has(x) ? 0.35 : 1, transition: 'opacity 200ms' }}
          className="cursor-pointer rounded-full border border-neutral-500/30 px-2 py-0.5 text-xs"
        >
          {x}
        </button>
      ))}
      </span>
    </span>
  );
}