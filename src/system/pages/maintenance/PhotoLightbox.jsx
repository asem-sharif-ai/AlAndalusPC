import { useEffect, useRef, useState } from 'react';
import { thumb } from '../../api/images';
import { createPortal } from 'react-dom';

import Ico from '../../components/Ico';
import useScrollLock from '../../components/useScrollLock';
import { cx } from '../../../utils';

const FADE_MS = 240;

export function Lightbox({ images, start = 0, onClose }) {
  useScrollLock();
  const [index, setIndex] = useState(start);
  const [shown, setShown] = useState(false);
  const step = (d) => setIndex((i) => (i + d + images.length) % images.length);

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  const close = () => {
    setShown(false);
    setTimeout(onClose, FADE_MS);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else return;
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, images.length]);

  const nav = 'absolute top-1/2 cursor-pointer grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-xl text-white hover:bg-white/30';
  const go = (d) => (e) => { e.stopPropagation(); step(d); };

  return createPortal(
    <div
      role="dialog" aria-modal="true" dir="ltr"
      className="fixed inset-0 grid place-items-center"
      style={{
        zIndex: 3000, padding: 8, cursor: 'zoom-out',
        background: shown ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0)',
        backdropFilter: shown ? 'blur(8px)' : 'blur(0px)',
        WebkitBackdropFilter: shown ? 'blur(8px)' : 'blur(0px)',
        transition: `background ${FADE_MS}ms ease, backdrop-filter ${FADE_MS}ms ease, -webkit-backdrop-filter ${FADE_MS}ms ease`,
      }}
      onClick={close}
    >
      <img
        key={index} src={images[index]} alt="" draggable={false}
        className="rounded-lg"
        style={{
          width: '92vw', height: '86vh', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
          opacity: shown ? 1 : 0, transform: shown ? 'scale(1)' : 'scale(0.94)',
          transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          willChange: 'opacity, transform',
        }}
      />
      {images.length > 1 && (
        <>
          <button type="button" aria-label="Previous" className={`${nav} left-3`} style={{ opacity: shown ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }} onClick={go(-1)}>‹</button>
          <button type="button" aria-label="Next" className={`${nav} right-3`} style={{ opacity: shown ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }} onClick={go(1)}>›</button>
        </>
      )}
    </div>,
    document.body,
  );
}

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MAX_PHOTOS = 3;

const SLOT_H = 38;
const GAP = 12;
const TILE = 'relative grid w-full place-items-center overflow-hidden rounded-lg border';
const TILE_EMPTY = `${TILE} border-dashed border-neutral-500/50`;
const TILE_FILLED = `${TILE} border-neutral-500/40`;
const HOVER = 'cursor-pointer hover:bg-neutral-500/10';

const SLOT_TILE = `${TILE} cursor-pointer border-solid border-emerald-600/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 [[data-theme=dark]_&]:text-emerald-300`;
const tileStyle = { height: SLOT_H, minWidth: 0, padding: 0 };
const slotStyle = { ...tileStyle, gridColumn: 5, gridRow: 2 };

function PhotoSlot({ src, index, labels, onOpen, onRemove, onReplace }) {
  const inputRef = useRef(null);
  const timer = useRef(null);
  const fired = useRef(false);
  const cancel = () => clearTimeout(timer.current);
  const start = () => {
    if (!onReplace) return;
    fired.current = false;
    timer.current = setTimeout(() => { fired.current = true; inputRef.current?.click(); }, 500);
  };
  return (
    <span className="relative block" style={{ height: SLOT_H }}>
      <button
        type="button"
        onClick={() => { if (fired.current) { fired.current = false; return; } onOpen && onOpen(index); }}
        onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
        onContextMenu={(e) => onReplace && e.preventDefault()}
        className={`${TILE_FILLED} cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-500`}
        style={{ ...tileStyle, userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      >
        <img src={thumb(src)} alt="" loading="lazy" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
      </button>
      {onReplace && <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onReplace(index, e)} />}
      {onRemove && (
        <button
          type="button" title={labels.remove} aria-label={labels.remove} onClick={() => onRemove(index)}
          className="absolute -end-1.5 -top-1.5 grid h-4 w-4 cursor-pointer place-items-center rounded-full bg-red-600 text-white [&_svg]:h-2.5 [&_svg]:w-2.5"
          style={{ zIndex: 1 }}
        >
          <Ico name="x" />
        </button>
      )}
    </span>
  );
}

export function MediaRow({ images = [], slot, labels, labelClass = 'text-sm font-medium', className, onOpen, onAdd, onReplace, onRemove, onPickSlot, slotHint, photosOnly }) {
  return (
    <div className={cx('relative grid', className)} style={{ gridTemplateColumns: photosOnly ? 'repeat(3, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr)) 1px minmax(0, 1fr)', columnGap: GAP, rowGap: 4 }}>
      <span className={labelClass} style={{ gridColumn: '1 / 4', gridRow: 1 }}>{labels.photos}</span>
      {!photosOnly && <span className={labelClass} style={{ gridColumn: 5, gridRow: 1 }}>{labels.slot}</span>}

      {!photosOnly && <span aria-hidden="true" style={{ gridColumn: 4, gridRow: '1 / 3', alignSelf: 'stretch', width: 1, backgroundColor: 'currentColor' }} />}

      <div style={{ display: 'contents' }}>
        {Array.from({ length: MAX_PHOTOS }, (_, i) =>
          images[i] ? (
            <PhotoSlot key={i} src={images[i]} index={i} labels={labels} onOpen={onOpen} onRemove={onRemove} onReplace={onReplace} />
          ) : onAdd ? (i === images.length) && (
            <label key={i} className={`${TILE_EMPTY} ${HOVER}`} style={tileStyle} title={labels.add} aria-label={labels.add}>
              <PlusIcon />
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onAdd} />
            </label>
          ) : (
            <span key={i} className={`${TILE_EMPTY} opacity-50`} style={tileStyle} aria-hidden="true">—</span>
          ),
        )}
      </div>

      {!photosOnly && (onPickSlot ? (
        <button
          type="button" onClick={onPickSlot} title={slot ? labels.slot : slotHint || labels.pick} aria-label={labels.pick}
          className={`${SLOT_TILE} px-2 font-semibold`}
          style={slotStyle}
        >
          {slot ? <span dir="ltr" className="truncate">{slot}</span> : <PlusIcon />}
        </button>
      ) : (
        <span className={slot ? `${TILE} border-solid border-emerald-600/60 bg-emerald-500/10 px-2 font-semibold text-emerald-700 [[data-theme=dark]_&]:text-emerald-300` : `${TILE} border-solid border-neutral-500/30 opacity-50`} style={slotStyle}>
          <span dir="ltr" className="truncate">{slot || '—'}</span>
        </span>
      ))}
    </div>
  );
}