import { useState } from 'react';

import ConfirmDialog from '../../components/ConfirmDialog';
import Dropdown from '../../components/Dropdown';
import Ico from '../../components/Ico';
import RichLine from '../../components/RichLine';
import Spinner from '../../components/Spinner';
import { ADD_TONE, BADGE, BAR, BTN, CARD_SURFACE_BARRED, DD_ARROW, DD_BUTTON_IN_CARD, DIVIDER, EDIT_TONE, FIELD, RED_BOLD, ROW, ROW_FIELD, TONE } from '../../components/ui';
import { addTime, cx, formatDate, isTomorrow, minutesBetween } from '../../../utils';
import { useRemoteLog } from '../../api/sync';
import { EXTEND_OPTIONS, STATUSES, isActive, isOverdue } from './notes.data';
import I18N from './notes.i18n';
import { TextInput } from '../../components/TextField';

const TONES = {
  ...TONE,
  light: { badge: 'bg-neutral-500/15 text-neutral-700 [[data-theme=dark]_&]:text-neutral-300', bar: 'border-s-neutral-500' },
  strong: {
    badge: 'bg-neutral-800 text-neutral-50 [[data-theme=dark]_&]:bg-neutral-200 [[data-theme=dark]_&]:text-neutral-950',
    bar: 'border-s-neutral-800 [[data-theme=dark]_&]:border-s-neutral-200',
  },
};

const PRIORITY_TONE = { high: 'red', medium: 'amber', low: 'light' };
const STATUS_TONE = { pending: 'neutral', in_progress: 'strong', done: 'emerald', archived: 'neutral' };

const PHONE_TONE = {
  high: 'border-red-500/60 bg-red-500/15 text-red-700 hover:bg-red-500/25 [[data-theme=dark]_&]:text-red-300',
  medium: 'border-amber-500/60 bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 [[data-theme=dark]_&]:text-amber-300',
  low: 'border-neutral-400 bg-neutral-500/15 text-neutral-700 hover:bg-neutral-500/25 [[data-theme=dark]_&]:text-neutral-300',
};

export default function NoteCard({ note, lang, now, api, onEdit }) {
  const t = I18N[lang];
  const [open, setOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const updates = useRemoteLog('notes', note.id, note.rev, open && showLog); // the update history is fetched only for an opened card
  const [draft, setDraft] = useState('');

  const [pending, setPending] = useState(null);
  const [option, setOption] = useState(null);
  const [statusDraft, setStatusDraft] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const locked = !isActive(note);

  const overdue = isOverdue(note, now);
  const diff = minutesBetween(now, note.deadline);
  const relative = !isActive(note) ? null : overdue ? t.overdue(-diff) : isTomorrow(note.deadline, now) ? t.tomorrow : t.inTime(diff);

  const extendFrom = note.deadline > now ? note.deadline : now;

  const pickOption = (opt) => {
    if (option === opt.id) {
      setOption(null);
      setPending(null);
      return;
    }
    setOption(opt.id);
    setPending(addTime(extendFrom, opt));
  };

  const dirty = Boolean((pending && pending !== note.deadline) || (statusDraft && statusDraft !== note.status) || draft.trim());

  const save = async () => {
    setSaving(true);
    // extend + typed update + status change are one request, applied together by the server
    await api.save(note.id, {
      deadline: pending && pending !== note.deadline ? pending : undefined,
      text: draft.trim() || undefined,
      status: statusDraft && statusDraft !== note.status ? statusDraft : undefined,
    });
    setSaving(false);
    setPending(null);
    setOption(null);
    setStatusDraft(null);
    setDraft('');
    setConfirming(false);
  };

  const closesNote = Boolean(statusDraft) && statusDraft !== note.status && !isActive({ status: statusDraft });
  const requestSave = () => (closesNote ? setConfirming(true) : save());

  const shown = (field, v) => (field === 'category' ? t.category[v] : field === 'priority' ? t.priority[v] : v);
  const LOG_TEXT = {
    status: (u) => t.log.status(t.status[u.value]),
    extend: (u) => t.log.extend(formatDate(u.from, lang), formatDate(u.to, lang)),
    edit: (u) => (u.field === 'description'
      ? t.log.editText(t.form.description)
      : t.log.edit(t.form[u.field], shown(u.field, u.from), shown(u.field, u.to))),
    note: (u) => u.text,
  };
  const logText = (u) => LOG_TEXT[u.type](u);

  return (
    <li className={cx(CARD_SURFACE_BARRED, 'border-s-4', TONES[PRIORITY_TONE[note.priority]].bar, !isActive(note) && 'opacity-70')}>
      <div className={cx('flex items-start gap-3 p-3 sm:p-4', BAR, 'rounded-t-xl', !open && 'rounded-b-xl')}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="block min-w-0 flex-1 cursor-pointer text-start"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold [overflow-wrap:anywhere]">{note.name}</span>
            <span className={cx(BADGE, TONES.neutral.badge)}>{t.category[note.category]}</span>
            <span className={cx(BADGE, TONES[STATUS_TONE[note.status]].badge)}>{t.status[note.status]}</span>
          </span>
          <span className="mt-1 flex flex-wrap gap-x-3 text-sm opacity-90">
            {relative && <span className={cx('font-bold', overdue && RED_BOLD)}>{relative}</span>}
            <span className="opacity-80">{formatDate(note.deadline, lang)}</span>
          </span>
        </button>

        <a href={`tel:${note.phone}`} dir="ltr" title={t.priority[note.priority]} aria-label={note.phone} className={cx(BTN, PHONE_TONE[note.priority], 'shrink-0 self-center max-sm:h-[34px] max-sm:w-[34px] max-sm:!p-0')}>
          <Ico name="phone" />
          <span className="hidden tabular-nums sm:inline">{note.phone}</span>
        </a>
      </div>

      {open && (
        <>
        <div className={cx('space-y-4 border-t p-3 sm:p-4', DIVIDER)}>
          <p className="whitespace-pre-line text-sm [overflow-wrap:anywhere]">
            {note.description || <span className="opacity-60">{t.card.noDescription}</span>}
          </p>

          <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t.card.updates}</h3>
                <button
                  type="button" aria-expanded={showLog} onClick={() => setShowLog((v) => !v)}
                  className="cursor-pointer text-xs underline opacity-80 hover:opacity-100"
                >
                  {showLog ? t.card.hide : t.card.reveal}
                </button>
              </div>
              {showLog && (
              <ul className="space-y-1.5">
                {[...updates].reverse().map((u) => (
                  <li key={u.id} className={cx('flex items-start gap-2 rounded-lg px-3 py-2 text-sm', ROW)}>
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                      <span className="me-2 text-xs opacity-70">{formatDate(u.at, lang)}</span>
                      <span className={cx(u.type !== 'note' && 'italic opacity-80')}>{u.type === 'note' ? logText(u) : <RichLine text={logText(u)} />}</span>
                    </span>
                  </li>
                ))}

                <li className={cx('flex items-start gap-2 rounded-lg px-3 py-2 text-sm', ROW)}>
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    <span className="me-2 text-xs opacity-70">{formatDate(note.createdAt, lang)}</span>
                    <span className="italic opacity-80">{t.card.createdBy[note.createdBy ?? 'human']}</span>
                  </span>
                </li>
              </ul>
              )}
            </div>
        </div>

        {!locked && (
        <div className={cx('grid grid-cols-1 gap-x-4 gap-y-2 rounded-b-xl border-t p-3 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,auto)] sm:p-4', DIVIDER, BAR)}>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm opacity-70">{t.card.extend}:</span>
            {EXTEND_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={option === opt.id}
                onClick={() => pickOption(opt)}
                className={cx(BTN, 'max-sm:grow', option === opt.id && 'border-emerald-600 bg-emerald-600/15 font-semibold')}
              >
                {t.ext[opt.id]}
              </button>
            ))}
            <input
              type="datetime-local"
              value={pending ?? note.deadline}
              onChange={(e) => {
                setPending(e.target.value);
                setOption(null);
              }}
              aria-label={t.card.newDeadline}
              className={cx(FIELD, 'w-auto flex-1 basis-40 py-1.5')}
            />
          </div>

          <div>
            <Dropdown
              className="w-full"
              label={t.card.status}
              value={statusDraft ?? note.status}
              options={STATUSES.map((s) => ({ value: s, label: t.status[s] }))}
              onChange={(s) => setStatusDraft(s === note.status ? null : s)}
              buttonClassName={DD_BUTTON_IN_CARD}
              arrowClassName={DD_ARROW}
            />
          </div>

          <TextInput dir="auto"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && dirty && requestSave()}
            placeholder={t.card.updatePlaceholder}
            aria-label={t.card.addUpdate}
            className={cx(FIELD, ROW_FIELD)}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={!dirty || saving} className={cx(BTN, ADD_TONE, 'flex-1 disabled:cursor-not-allowed')} onClick={requestSave}>
              {saving && <Spinner />}{t.card.save}
            </button>
            <button type="button" className={cx(BTN, EDIT_TONE, 'flex-1')} onClick={() => onEdit(note)}>
              {t.card.edit}
            </button>
          </div>
        </div>
        )}
        </>
      )}
      {confirming && (
        <ConfirmDialog
          id={`note-${note.id}-confirm`}
          title={t.card.closeTitle(t.status[statusDraft])} body={t.card.closeBody}
          keepLabel={t.form.keep} confirmLabel={t.card.save}
          busy={saving} onKeep={() => setConfirming(false)} onConfirm={save}
        />
      )}
    </li>
  );
}