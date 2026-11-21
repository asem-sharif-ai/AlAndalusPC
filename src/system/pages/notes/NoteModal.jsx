import { useEffect, useState } from 'react';

import ConfirmDialog from '../../components/ConfirmDialog';
import Spinner from '../../components/Spinner';
import HintChips from '../../components/HintChips';
import Dropdown from '../../components/Dropdown';
import useScrollLock from '../../components/useScrollLock';
import { BTN, BTN_PRIMARY, DELETE_TONE, FIELD, PRIMARY_DISABLED, SURFACE } from '../../components/ui';
import { addTime, cx, now } from '../../../utils';
import { parseNoteMessage } from './notes.api';
import { CATEGORIES, PICKABLE_CATEGORIES, PRIORITIES } from './notes.data';
import I18N from './notes.i18n';
import { TextInput, TextArea } from '../../components/TextField';

const FIELDS = ['name', 'phone', 'category', 'priority', 'deadline', 'description'];

function fillFrom(data) {
  const out = {};
  for (const key of FIELDS) {
    const value = data?.[key];
    if (value == null || value === '') continue;
    if (key === 'category' && !PICKABLE_CATEGORIES.includes(value)) continue;
    if (key === 'priority' && !PRIORITIES.includes(value)) continue;
    out[key] = String(value);
  }
  return out;
}

const blank = () => ({
  name: '', phone: '', category: 'customer', priority: 'medium', deadline: addTime(now(), { days: 1 }), description: '',
});

function Field({ label, subtitle, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium leading-none">{label}</span>
      {subtitle && <HintChips items={subtitle.items} />}
      <label className="contents">
        {children}
        {error && <span className="block text-xs text-red-600 [[data-theme=dark]_&]:text-red-400">{error}</span>}
      </label>
    </div>
  );
}

const AI_MIN = 20; // the assistant needs at least this many characters to work with

export default function NoteModal({ note, lang, onSave, onDelete, onClose }) {
  useScrollLock();
  const t = I18N[lang];
  const [initial] = useState(() => (note ? Object.fromEntries(FIELDS.map((k) => [k, note[k]])) : blank()));
  const [form, setForm] = useState(initial);
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState('manual');
  const [aiStep, setAiStep] = useState('input');
  const [aiUsed, setAiUsed] = useState(false);
  const [message, setMessage] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiDetail, setAiDetail] = useState('');
  const showForm = mode === 'manual' || aiStep === 'done';

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const dirty = FIELDS.some((k) => form[k] !== initial[k]) || Boolean(message.trim());
  const requestClose = () => (dirty ? setConfirm('cancel') : onClose());

  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && requestClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dirty]);

  const errors = {
    name: !form.name.trim() && t.form.errName,
    phone: !/^[+\d\s()-]{6,20}$/.test(form.phone.trim()) && t.form.errPhone,
    deadline: (!form.deadline && t.form.errDate) || (form.deadline !== note?.deadline && form.deadline < now() && t.form.errPast),
  };
  const show = (key) => tried && errors[key];

  const analyze = async () => {
    const text = message.trim();
    if (text.length < AI_MIN || aiStep === 'loading') return;
    setAiError('');
    setAiDetail('');
    setAiStep('loading');
    try {
      const data = await parseNoteMessage(text);
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
    if (dirty) setConfirm('save');
    else onClose();
  };

  const save = () =>
    onSave({
      ...form, name: form.name.trim(), phone: form.phone.trim(), description: form.description.trim(),
      ...(aiUsed && !note ? { createdBy: 'ai' } : {}),
    });

  const guarded = (fn) => async () => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const DIALOGS = {
    save: { title: t.form.saveTitle, body: t.form.saveBody, label: t.form.save, onConfirm: guarded(save) },
    cancel: { title: t.form.cancelTitle, body: t.form.cancelBody, label: t.form.discard, onConfirm: onClose },
    delete: { title: t.form.deleteTitle, body: t.form.deleteBody, label: t.form.delete, onConfirm: guarded(onDelete) },
  };
  const dialog = confirm && DIALOGS[confirm];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overflow-x-hidden bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-modal-title"
        onSubmit={submit}
        noValidate
        className={cx('w-full max-w-lg space-y-4 rounded-2xl border border-neutral-500/30 p-5 shadow-xl', SURFACE)}
      >
        <h2 id="note-modal-title" className="text-lg font-bold [overflow-wrap:anywhere]">
          {note ? t.form.editTitle : t.form.newTitle}
        </h2>

        {!note && (
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
        )}

        {mode === 'ai' && aiStep !== 'done' && (
          <>
            <Field label={t.ai.label} subtitle={{ items: FIELDS.map((k) => t.form[k]) }} error={aiError && `${t.ai.errors?.[aiError] ?? t.ai.error}`}>
              <TextArea dir="auto"
                autoFocus rows={6} disabled={aiStep === 'loading'} value={message}
                onChange={(e) => setMessage(e.target.value)} placeholder={t.ai.placeholder} className={FIELD}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); analyze(); } }}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={BTN} onClick={requestClose}>{t.form.cancel}</button>
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
        <Field label={t.form.name} error={show('name')}>
          <TextInput dir="auto" autoFocus={mode === 'manual'} value={form.name} onChange={(e) => set('name', e.target.value)} className={FIELD} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t.form.phone} error={show('phone')}>
            <TextInput
              type="tel" dir="ltr" inputMode="tel"
              value={form.phone} onChange={(e) => set('phone', e.target.value)} className={FIELD}
            />
          </Field>
          <Field label={t.form.deadline} error={show('deadline')}>
            <input type="datetime-local" min={now()} value={form.deadline} onChange={(e) => set('deadline', e.target.value)} className={FIELD} />
          </Field>
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium">{t.form.priority}</span>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p} type="button" aria-pressed={form.priority === p} onClick={() => set('priority', p)}
                className={cx(BTN, form.priority === p && 'border-emerald-600 bg-emerald-600/15 font-semibold')}
              >
                {t.priority[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium">{t.form.category}</span>
          <Dropdown
            className="w-full"
            value={form.category}
            options={CATEGORIES.filter((c) => PICKABLE_CATEGORIES.includes(c) || c === form.category).map((c) => ({ value: c, label: t.category[c] }))}
            onChange={(c) => set('category', c)}
          />
        </div>

        <Field label={t.form.description}>
          <TextArea dir="auto" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} className={FIELD} />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {note && <button type="button" className={cx(BTN, DELETE_TONE)} onClick={() => setConfirm('delete')}>{t.form.delete}</button>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BTN} onClick={requestClose}>{t.form.cancel}</button>
            <button type="submit" className={BTN_PRIMARY}>{t.form.save}</button>
          </div>
        </div>
          </>
        )}
      </form>

      {dialog && (
        <ConfirmDialog
          id="note-confirm" title={dialog.title} body={dialog.body}
          keepLabel={t.form.keep} confirmLabel={dialog.label} busy={busy}
          onKeep={() => setConfirm(null)} onConfirm={dialog.onConfirm}
        />
      )}
    </div>
  );
}