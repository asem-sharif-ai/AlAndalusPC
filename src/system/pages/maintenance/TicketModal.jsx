import { useEffect, useRef, useState } from 'react';

import ConfirmDialog from '../../components/ConfirmDialog';
import Spinner from '../../components/Spinner';
import HintChips from '../../components/HintChips';
import Dropdown from '../../components/Dropdown';
import { BTN, BTN_PRIMARY, FIELD, PRIMARY_DISABLED, SURFACE } from '../../components/ui';
import { addTime, cx, formatDate, now } from '../../../utils';
import { newId } from '../../api/http';
import { MAX_PHOTO_BYTES, PhotoError, checkSource } from '../../api/images';
import { findDeviceHistory, parseTicketMessage } from './maintenance.api';
import { TYPES } from './maintenance.data';
import I18N from './maintenance.i18n';
import { Lightbox, MAX_PHOTOS, MediaRow } from './PhotoLightbox';
import Ico from '../../components/Ico';
import useScrollLock from '../../components/useScrollLock';
import { TextInput, TextArea, detectDir } from '../../components/TextField';

const AI_FIELDS = ['name', 'phone', 'type', 'model', 'serial', 'pin', 'complaint', 'condition', 'accessories', 'estimate', 'eta']; // form order; the chips show their exact form labels

function fillFrom(data) {
  const out = {};
  for (const key of AI_FIELDS) {
    const value = data?.[key];
    if (value == null || value === '') continue;
    if (key === 'type' && !TYPES.includes(value)) continue;
    out[key] = String(value);
  }
  return out;
}

const MAX_PIXELS = 50e6; // refuse images that would blow up the canvas

// Validates, resizes (max 1024px) and re-encodes as JPEG, lowering quality only if still over the size limit.
// Resolves to a data URL, rejects with a PhotoError.
const readPhoto = async (file) => {
  await checkSource(file);
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new PhotoError('photoRead'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onerror = () => reject(new PhotoError('photoRead'));
    el.onload = () => resolve(el);
    el.src = src;
  });
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw new PhotoError('photoRead');
  if (w * h > MAX_PIXELS) throw new PhotoError('photoSize');
  let scale = Math.min(1, 1024 / Math.max(w, h));
  for (const quality of [0.8, 0.65, 0.5]) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new PhotoError('photoRead');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL('image/jpeg', quality);
    if (out.startsWith('data:image/jpeg') && (out.length - out.indexOf(',') - 1) * 0.75 <= MAX_PHOTO_BYTES) return out;
    scale *= 0.75;
  }
  throw new PhotoError('photoSize');
};

const blank = () => ({
  staff: '', name: '', phone: '', type: 'laptop', model: '', serial: '', accessories: '', complaint: '', condition: '', pin: '',
  estimate: '', eta: addTime(now(), { days: 2 }), slot: '', images: [],
});

function Field({ label, action, subtitle, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium leading-none">{label}</span>
        {action}
      </span>
      {subtitle && <HintChips items={subtitle.items} />}
      <label className="contents">
        {children}
        {error ? (
          <span className="block text-xs text-red-600 [[data-theme=dark]_&]:text-red-400">{error}</span>
        ) : (
          hint && <span className="block text-xs opacity-70">{hint}</span>
        )}
      </label>
    </div>
  );
}

const AI_MIN = 20; // the assistant needs at least this many characters to work with

export default function TicketModal({ lang, occupied, onPickSlot, onSave, onClose }) {
  useScrollLock();
  const t = I18N[lang];
  const [form, setForm] = useState(blank);
  const idRef = useRef(newId()); // one id per modal: retrying a failed save can never create a second ticket
  const [tried, setTried] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [ask, setAsk] = useState(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState('manual');
  const [aiStep, setAiStep] = useState('input');
  const [aiUsed, setAiUsed] = useState(false);
  const [message, setMessage] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiDetail, setAiDetail] = useState('');
  const showForm = mode === 'manual' || aiStep === 'done';

  const [history, setHistory] = useState([]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (ask) return;
    const onKeyDown = (e) => e.key === 'Escape' && setAsk('cancel');
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ask]);

  useEffect(() => {
    const serial = form.serial.trim();
    if (serial.length < 4) return setHistory([]);
    let live = true;
    const timer = setTimeout(() => findDeviceHistory(serial).then((found) => live && setHistory(found)).catch(() => {}), 450); // wait for the typing to pause
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [form.serial]);

  const addPhotos = async (e) => {
    const files = [...e.target.files].slice(0, Math.max(MAX_PHOTOS - form.images.length, 0));
    e.target.value = '';
    const done = await Promise.allSettled(files.map(readPhoto));
    const added = done.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    setPhotoError(done.find((r) => r.status === 'rejected')?.reason?.code ?? '');
    setForm((f) => ({ ...f, images: [...f.images, ...added].slice(0, MAX_PHOTOS) }));
  };

  const replacePhoto = async (i, e) => {
    const file = e.target.files[0];
    e.target.value = '';
    const photo = file && (await readPhoto(file).catch((err) => { setPhotoError(err?.code ?? 'photoRead'); return null; }));
    if (photo) setPhotoError('');
    if (photo) setForm((f) => ({ ...f, images: f.images.map((img, j) => (j === i ? photo : img)) }));
  };

  const cost = form.estimate === '' ? 0 : Number(form.estimate);
  const errors = {
    staff: !form.staff.trim() && t.form.errStaff,
    name: !form.name.trim() && t.form.errName,
    phone: !/^[+\d\s(),-]{6,60}$/.test(form.phone.trim()) && t.form.errPhone,
    model: !form.model.trim() && t.form.errModel,
    complaint: !form.complaint.trim() && t.form.errComplaint,
    estimate: !(cost >= 0) && t.form.errCost,
    eta: (!form.eta && t.form.errDate) || (form.eta < now() && t.form.errPast),
    slot: occupied.has(form.slot.trim().toUpperCase()) && t.form.errSlot,
  };
  const show = (key) => tried && errors[key];

  const analyze = async () => {
    const text = message.trim();
    if (text.length < AI_MIN || aiStep === 'loading') return;
    setAiError('');
    setAiDetail('');
    setAiStep('loading');
    try {
      const data = await parseTicketMessage(text);
      setForm((f) => ({ ...f, ...fillFrom(data) }));
      setAiUsed(true);
      setAiStep('done');
    } catch (e) {
      setAiError(e?.code || 'generic');
      setAiDetail(e?.body?.detail || '');
      setAiStep('input');
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!showForm) return;
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    setPending({
      ...form,
      id: idRef.current,
      createdBy: aiUsed ? 'ai' : 'human',
      staff: form.staff.trim(), name: form.name.trim(), phone: form.phone.trim(), model: form.model.trim(), serial: form.serial.trim(),
      complaint: form.complaint.trim(), condition: form.condition.trim(), accessories: form.accessories.trim(), pin: form.pin.trim(),
      estimate: cost, slot: form.slot.trim().toUpperCase(),
    });
    setAsk('save');
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overflow-x-hidden bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && setAsk('cancel')}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
        onSubmit={submit}
        noValidate
        className={cx('w-full max-w-2xl space-y-4 rounded-2xl border border-neutral-500/30 p-5 shadow-xl', SURFACE)}
      >
        <h2 id="ticket-modal-title" className="text-lg font-bold">{t.form.newTitle}</h2>

        <div className="grid grid-cols-2 gap-2">
          {['manual', 'ai'].map((m) => (
            <button
              key={m} type="button" aria-pressed={mode === m} disabled={aiStep === 'loading'} onClick={() => setMode(m)}
              className={cx(BTN, mode === m && 'border-emerald-600 bg-emerald-600/15 font-semibold')}
            >
              {m === 'manual' ? t.ai.tabManual : t.ai.tabAi}
            </button>
          ))}
        </div>

        {mode === 'ai' && aiStep !== 'done' && (
          <>
            <Field label={t.ai.label} subtitle={{ items: AI_FIELDS.map((k) => t.f[k]) }} error={aiError && `${t.ai.errors?.[aiError] ?? t.ai.error}`}>
              <TextArea dir="auto"
                autoFocus rows={6} disabled={aiStep === 'loading'} value={message}
                onChange={(e) => setMessage(e.target.value)} placeholder={t.ai.placeholder} className={FIELD}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); analyze(); } }}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={BTN} onClick={() => setAsk('cancel')}>{t.form.cancel}</button>
              <button
                type="button" className={cx(BTN_PRIMARY, PRIMARY_DISABLED)}
                disabled={message.trim().length < AI_MIN || aiStep === 'loading'} onClick={analyze}
              >
                {aiStep === 'loading' && <Spinner />}{aiStep === 'loading' ? t.ai.analyzing : t.ai.analyze}
              </button>
            </div>
          </>
        )}

        {mode === 'ai' && aiStep === 'done' && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
            <h3 className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">{t.ai.reportTitle}</h3>
            <button type="button" className="shrink-0 cursor-pointer text-xs underline" onClick={() => setAiStep('input')}>{t.ai.tryAgain}</button>
          </div>
        )}

        {showForm && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t.f.name} error={show('name')}>
                <TextInput dir="auto" autoFocus={mode === 'manual'} value={form.name} onChange={(e) => set('name', e.target.value)} className={FIELD} />
              </Field>
              <Field label={t.f.phone} error={show('phone')}>
                <TextInput type="tel" dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={FIELD} />
              </Field>
              <div className="space-y-2">
                <span className="block text-sm font-medium">{t.f.type}</span>
                <Dropdown
                  className="w-full"
                  value={form.type}
                  options={TYPES.map((v) => ({ value: v, label: t.type[v] }))}
                  onChange={(v) => set('type', v)}
                />
              </div>
              <Field label={t.f.model} error={show('model')}>
                <TextInput dir="auto" value={form.model} onChange={(e) => set('model', e.target.value)} className={FIELD} />
              </Field>
              <Field label={t.f.serial}>
                <TextInput dir="ltr" value={form.serial} onChange={(e) => set('serial', e.target.value)} className={FIELD} />
              </Field>
              <Field label={t.f.pin} action={form.pin && (
                <button type="button" className="cursor-pointer text-xs underline opacity-80 hover:opacity-100" onClick={() => setShowPin((v) => !v)}>
                  {showPin ? t.card.hide : t.card.reveal}
                </button>
              )}>
                <TextInput dir="ltr" type={showPin ? 'text' : 'password'} autoComplete="off" value={form.pin} onChange={(e) => set('pin', e.target.value)} className={FIELD} />
              </Field>
            </div>

            {history.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t.card.history}</h3>
                <ul className="flex flex-wrap gap-2">
                  {history.map((h) => (
                    <li key={h.number} className="flex items-center gap-2 rounded-lg bg-neutral-500/10 px-3 py-2 text-sm">
                      <span className="tabular-nums" dir="ltr">#{h.number}</span>
                      <span>{t.status[h.status]}</span>
                      <span className="text-xs opacity-70">{formatDate(h.receivedAt, lang)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Field label={t.f.complaint} error={show('complaint')}>
              <TextInput dir="auto" value={form.complaint} onChange={(e) => set('complaint', e.target.value)} className={FIELD} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t.f.staffSlot} error={show('staff') || show('slot')}>
                <span className="relative block" dir={detectDir(form.staff)}>
                  <TextInput dir={detectDir(form.staff)} value={form.staff} onChange={(e) => set('staff', e.target.value)} className={FIELD} style={{ paddingInlineEnd: form.slot ? 84 : 44 }} />

                  <button
                    type="button" onClick={() => onPickSlot(form.slot, (v) => set('slot', v))}
                    title={t.storage.pickBtn} aria-label={t.storage.pickBtn}
                    className={cx(BTN, 'absolute end-1 top-1/2 h-[30px] -translate-y-1/2 !p-0',
                      'border-emerald-500/60 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 [[data-theme=dark]_&]:text-emerald-300',
                      form.slot ? 'min-w-[30px] !px-2 font-semibold' : 'w-[30px]')}
                  >
                    {form.slot ? <span dir="ltr" className="truncate">{form.slot}</span> : <Ico name="plus" />}
                  </button>
                </span>
              </Field>
              <div>
                <MediaRow
                  photosOnly images={form.images}
                  labels={{ photos: t.f.photos, add: t.form.uploadPhoto, remove: t.form.removePhoto }}
                  onOpen={setViewer} onAdd={addPhotos} onReplace={replacePhoto} onRemove={(i) => set('images', form.images.filter((_, j) => j !== i))}
                />
                {photoError && <p role="alert" className="mt-1 text-xs text-red-600 [[data-theme=dark]_&]:text-red-400">{t.form[photoError] ?? t.form.photoRead}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t.f.condition}>
                <TextInput dir="auto" value={form.condition} onChange={(e) => set('condition', e.target.value)} className={FIELD} />
              </Field>
              <Field label={t.f.accessories}>
                <TextInput dir="auto" value={form.accessories} onChange={(e) => set('accessories', e.target.value)} className={FIELD} />
              </Field>
              <Field label={t.f.estimate} error={show('estimate')}>
                <TextInput type="number" min="0" step="50" dir="ltr" value={form.estimate} onChange={(e) => set('estimate', e.target.value)} className={FIELD} />
              </Field>
              <Field label={t.f.eta} error={show('eta')}>
                <input type="datetime-local" value={form.eta} onChange={(e) => set('eta', e.target.value)} className={FIELD} />
              </Field>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={BTN} onClick={() => setAsk('cancel')}>{t.form.cancel}</button>
              <button type="submit" className={BTN_PRIMARY}>{t.form.save}</button>
            </div>
          </>
        )}
      </form>
      {ask && (
        <ConfirmDialog
          id="ticket-confirm"
          title={ask === 'save' ? t.form.saveTitle : t.form.cancelTitle} body={ask === 'save' ? t.form.saveBody : t.form.cancelBody}
          keepLabel={t.form.keep} confirmLabel={ask === 'save' ? t.form.save : t.form.discard} busy={busy}
          onKeep={() => setAsk(null)}
          onConfirm={async () => {
            if (ask !== 'save') return onClose();
            setBusy(true);
            try { await onSave(pending); } finally { setBusy(false); }
          }}
        />
      )}
      {viewer !== null && <Lightbox images={form.images} start={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}