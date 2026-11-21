import { useEffect, useRef, useState } from 'react';

import ConfirmDialog from '../../components/ConfirmDialog';
import Ico from '../../components/Ico';
import Spinner from '../../components/Spinner';
import RichLine, { stripMarks } from '../../components/RichLine';
import { ADD_TONE, BADGE, BAR, BTN, CARD_SURFACE_BARRED, DELETE_TONE, DIVIDER, EDIT_TONE, RED_BOLD, ROW, TONE } from '../../components/ui';
import { cx, formatDate, isTomorrow, minutesBetween } from '../../../utils';
import { useRemoteLog } from '../../api/sync';
import {
  DELIVERY_FIELDS, REPAIR_FIELDS, badEta, balance, canDeliver, canGo, editableFields, isClosed, isLate, isOpen, money, needsApproval, stageOf, stepOf,
} from './maintenance.data';
import I18N from './maintenance.i18n';
import { Account, DeliveryPanel, IntakePanel, RepairPanel } from './TicketStages';

const TONES = {
  ...TONE,
  light: { badge: 'bg-neutral-500/15 text-neutral-700 [[data-theme=dark]_&]:text-neutral-300', bar: 'border-s-neutral-500' },
  strong: {
    badge: 'bg-neutral-800 text-neutral-50 [[data-theme=dark]_&]:bg-neutral-200 [[data-theme=dark]_&]:text-neutral-950',
    bar: 'border-s-neutral-800 [[data-theme=dark]_&]:border-s-neutral-200',
  },
};

const STATUS_TONE = {
  received: 'light', inspecting: 'light', in_repair: 'strong', waiting_parts: 'amber', awaiting_client: 'blue', ready: 'emerald',
  delivered: 'neutral', unrepairable: 'red', parts_not_found: 'red', cancelled: 'neutral',
};
const PHONE_TONE = {
  late: 'border-red-500/60 bg-red-500/15 text-red-700 hover:bg-red-500/25 [[data-theme=dark]_&]:text-red-300',
  normal: 'border-neutral-400 bg-neutral-500/15 text-neutral-700 hover:bg-neutral-500/25 [[data-theme=dark]_&]:text-neutral-300',
};

const STAGES = ['intake', 'repair', 'payment', 'delivery'];
const LAST_TAB = STAGES.length - 1;
const pick = (ticket, fields) => Object.fromEntries(fields.map((k) => [k, String(ticket[k] ?? '')]));

export default function TicketCard({ ticket, lang, now, api, onPickSlot, onOpenTicket, focus = 0 }) {
  const t = I18N[lang];
  const stage = stageOf(ticket);
  const locked = isClosed(ticket);

  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const rootRef = useRef(null);
  const log = useRemoteLog('tickets', ticket.id, ticket.rev, open && showLog); // the activity log is fetched only while it is on screen

  useEffect(() => {
    if (!focus) return undefined;
    setOpen(true);
    setFlash(true);
    const scroll = setTimeout(() => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    const off = setTimeout(() => setFlash(false), 1800);
    return () => { clearTimeout(scroll); clearTimeout(off); };
  }, [focus]);
  const [tab, setTab] = useState(Math.min(stage, LAST_TAB));
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [repair, setRepair] = useState(() => pick(ticket, REPAIR_FIELDS));
  const [delivery, setDelivery] = useState(() => pick(ticket, DELIVERY_FIELDS));

  useEffect(() => setTab(Math.min(stage, LAST_TAB)), [stage]);

  const late = isLate(ticket, now);
  const left = balance(ticket);
  const diff = minutesBetween(now, ticket.eta);
  const relative = late ? t.overdue(-diff) : diff < 0 ? t.ago(-diff) : isTomorrow(ticket.eta, now) ? t.tomorrow : t.inTime(diff);
  const tone = late ? 'red' : STATUS_TONE[ticket.status];

  const editable = editableFields(ticket);
  const etaError = editable.includes('eta') && badEta(ticket, repair.eta, now);
  const repairDirty = editable.some((k) => repair[k] !== String(ticket[k] ?? ''));
  const costValid = !editable.includes('actual') || (repair.actual !== '' && Number(repair.actual) >= 0);

  const repairPayload = () => ({
    ...Object.fromEntries(editable.map((k) => [k, repair[k].trim()])),
    ...(editable.includes('actual') ? { actual: Number(repair.actual) } : {}),
  });
  const saveRepair = () => api.editRepair(ticket.id, repairPayload());

  const deliver = async () => {
    setBusy(true);
    try { await api.deliver(ticket.id, Object.fromEntries(DELIVERY_FIELDS.map((k) => [k, delivery[k].trim()]))); } finally { setBusy(false); }
  };

  const list = new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' });
  const clip = (v) => (v.length > 30 ? `${v.slice(0, 30)}…` : v);
  const withCurrency = (v) => `${money(v)} ${t.currency}`;
  const isBlank = (v) => String(v ?? '').trim() === '';
  const changeValue = (field, v) =>
    field === 'eta' ? formatDate(v, lang)
      : field === 'actual' ? withCurrency(v)
        : isBlank(v) ? t.log.empty
          : t.log.quote(clip(String(v).trim()));
  const describeChange = (field, from, to) =>
    isBlank(from) ? t.log.set(t.f[field], changeValue(field, to))
      : isBlank(to) ? t.log.cleared(t.f[field], changeValue(field, from))
        : t.log.change(t.f[field], changeValue(field, from), changeValue(field, to));

  const LOG_TEXT = {
    status: (e) => t.log.status(t.status[e.value]),
    edit: (e) => t.log.edit(list.format(e.changes.map((c) => describeChange(c.field, c.from, c.to)))),
    slot: (e) => t.log.slot(e.value),
    payment: (e) => t.log.payment(withCurrency(Math.abs(e.amount)), t.method[e.method], e.change > 0 ? withCurrency(e.change) : '', e.amount < 0, e.payer),
    discount: (e) => t.log.discount(e.code),
    debt: (e) => t.log.debt(withCurrency(e.amount), formatDate(e.dueAt, lang)),
    confirm: (e) => t.log.confirm[e.value],
    delivery: (e) => t.log.delivery(e.value),
  };
  const logText = (e) => LOG_TEXT[e.type](e);

  const device = `${t.type[ticket.type]} ${ticket.model}`;

  // the server makes the balance note itself (same name and phone, high priority) and only takes the localized text from here
  const defer = (dueAt, cashier) => api.deferBalance(ticket.id, dueAt, t.acct.noteText(ticket.number, device, withCurrency(left)), cashier);
  const ask = (kind, run) => setDialog({ kind, run });
  const costNow = withCurrency(Number(repair.actual) || ticket.actual);
  const DIALOGS = {
    cancel: {
      title: t.card.cancelTitle, body: t.card.cancelBody, label: t.card.cancel,
      note: ticket.status === 'received' ? t.card.cancelFree : t.card.cancelCost(withCurrency(ticket.actual)),
    },
    delete: { title: t.card.deleteTitle, body: t.card.deleteBody, label: t.card.deleteLabel, note: t.card.deleteNote },
    ...Object.fromEntries(
      Object.keys(t.card.goTitle).map((k) => [
        k,
        {
          title: t.card.goTitle[k], body: t.card.goBody[k], label: t.card[k === 'confirmed' ? 'confirmed' : k === 'resume' || k === 'pick' ? 'startRepair' : k],
          note: k === 'skip' && ticket.status === 'awaiting_client' ? '' : t.card.goNote[k] ?? (k === 'ask' || k === 'skip' ? t.card.lockApproved : t.card.lockAll),
        },
      ]),
    ),
    save: {
      title: t.card.saveTitle, body: () => '', label: t.card.save,
      note: editable
        .filter((k) => String(repair[k] ?? '').trim() !== String(ticket[k] ?? '').trim())
        .map((k) => {
          const line = describeChange(k, ticket[k], repair[k]);
          return stripMarks(`${line[0].toUpperCase()}${line.slice(1)}`);
        }).join('\n'),
    },
    fixed: { title: t.card.fixedTitle, body: t.card.fixedBody, label: t.card.fixed, note: t.card.fixedNote(costNow) },
    unrepairable: { title: t.card.unrepTitle, body: t.card.unrepBody, label: t.card.unrepairable, note: t.card.unrepNote },
    notFound: { title: t.card.notFoundTitle, body: t.card.notFoundBody, label: t.card.notFound, note: t.card.unrepNote },
  };
  const current = dialog && DIALOGS[dialog.kind];
  const partsBold = list.format(String(repair.parts ?? ticket.parts ?? '').split(/[\n,،;]+/).map((p) => p.trim()).filter(Boolean).map((p) => `**${p}**`));

  const plain = (key, label, tone, onClick, disabled) => (
    <button key={key} type="button" disabled={disabled || busy} className={cx(BTN, tone, 'grow disabled:cursor-not-allowed')} onClick={onClick}>
      {busy && key === 'deliver' && <Spinner />}{label}
    </button>
  );

  const start = [];
  const end = [];
  if (tab === 0 && stage === 0) {
    end.push(plain('start', t.card.start, ADD_TONE, () => ask('start', () => api.go(ticket.id, 'inspecting'))));
  }
  if (tab === 1 && stage === 1) {
    const id = ticket.id;
    const blocked = repairDirty && (etaError || !costValid);

    // unsaved report edits travel with the step itself: one request, applied and logged together by the server
    const step = (fn) => () => fn(repairDirty ? repairPayload() : undefined);
    const slots = {
      confirm: [
        plain('ask', t.card.ask, EDIT_TONE, () => ask('ask', step((r) => api.go(id, 'awaiting_client', r))), blocked),
        plain('skip', t.card.skip, '', () => ask('skip', step((r) => api.confirm(id, 'skipped', r))), blocked),
      ],
      confirming: [
        plain('confirmed', t.card.confirmed, ADD_TONE, () => ask('confirmed', step((r) => api.confirm(id, 'confirmed', r))), blocked),
        plain('skip', t.card.skip, '', () => ask('skip', step((r) => api.confirm(id, 'skipped', r))), blocked),
      ],

      parts: [
        plain('parts', t.card.parts, EDIT_TONE, () => ask('parts', step((r) => api.go(id, 'waiting_parts', r))), blocked),
        plain('pick', t.card.pick, '', () => ask('pick', step((r) => api.go(id, 'in_repair', r))), blocked),
      ],

      start: [
        plain('repair', t.card.startRepair, ADD_TONE, () => ask('startRepair', step((r) => api.go(id, 'in_repair', r))), blocked),
        plain('unrepairable', t.card.unrepairable, DELETE_TONE, () => ask('unrepairable', step((r) => api.go(id, 'unrepairable', r))), blocked),
      ],

      waiting: [
        plain('resume', t.card.resume, ADD_TONE, () => ask('resume', step((r) => api.go(id, 'in_repair', r))), blocked),
        plain('notFound', t.card.notFound, DELETE_TONE, () => ask('notFound', step((r) => api.go(id, 'parts_not_found', r))), blocked),
      ],
      repair: [
        plain('fixed', t.card.fixed, ADD_TONE, () => ask('fixed', step((r) => api.go(id, 'ready', r))), blocked),
        plain('unrepairable', t.card.unrepairable, DELETE_TONE, () => ask('unrepairable', step((r) => api.go(id, 'unrepairable', r))), blocked),
      ],
    };
    start.push(plain('save', t.card.save, ADD_TONE, () => ask('save', saveRepair), !repairDirty || etaError || !costValid));
    end.push(...slots[stepOf(ticket, needsApproval(ticket, repair.actual, repair.parts), repair.parts)]);
  }

  if (tab === 3 && canDeliver(ticket)) {
    end.push(plain('deliver', t.card.deliver, ADD_TONE, deliver, !delivery.receiver.trim()));
  }

  const solo = start.length === 0 && end.length === 1;

  return (
    <li
      ref={rootRef} style={{ scrollMarginTop: 80 }}
      className={cx(CARD_SURFACE_BARRED, 'border-s-4 transition-shadow', TONES[tone].bar, locked && 'opacity-70', flash && 'ring-2 ring-emerald-500')}
    >
      <div className={cx('flex items-start gap-3 p-3 sm:p-4', BAR, 'rounded-t-xl', !open && 'rounded-b-xl')}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="block min-w-0 flex-1 cursor-pointer text-start"
        >
          <span className="block min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold [overflow-wrap:anywhere]">{ticket.name}</span>
              <span className={cx(BADGE, TONES.neutral.badge)}>{t.type[ticket.type]}</span>
              <span className={cx(BADGE, TONES[STATUS_TONE[ticket.status]].badge)}>{t.status[ticket.status]}</span>
            </span>
            <span className="mt-1 flex flex-wrap gap-x-3 text-sm opacity-90">
              <span className={cx('font-bold', late && RED_BOLD)}>{relative}</span>
              <span className="opacity-80">{formatDate(ticket.eta, lang)}</span>
              {!locked && (
                <span className={cx(left > 0 ? 'font-semibold' : 'opacity-80')}>
                  {left > 0 ? t.card.due(withCurrency(left)) : t.card.settled}
                </span>
              )}
            </span>
          </span>
        </button>

        <div className={cx('flex shrink-0 items-center gap-2 self-center text-sm', lang === 'en' && 'flex-row-reverse')} dir="ltr">
          <span className="tabular-nums opacity-70">#{ticket.number}</span>
          {isOpen(ticket) && ticket.slot && (
            <>
              <span aria-hidden="true" className="opacity-60">•</span>
              <span className="font-semibold">{ticket.slot}</span>
            </>
          )}
          {ticket.status === 'delivered' && (
            <>
              <span aria-hidden="true" className="opacity-60">•</span>
              <button
                type="button" title={t.card.deleteLabel} aria-label={t.card.deleteLabel}
                className="grid cursor-pointer place-items-center text-red-600 hover:opacity-70 [[data-theme=dark]_&]:text-red-400"
                onClick={() => ask('delete', () => api.removeTicket(ticket.id))}
              >
                <Ico name="trash" />
              </button>
            </>
          )}
          {canGo(ticket, 'cancelled') && (
            <>
              <span aria-hidden="true" className="opacity-60">•</span>
              <button
                type="button" title={t.card.cancel} aria-label={t.card.cancel}
                className="grid cursor-pointer place-items-center text-red-600 hover:opacity-70 [[data-theme=dark]_&]:text-red-400"
                onClick={() => ask('cancel', () => api.go(ticket.id, 'cancelled'))}
              >
                <Ico name="x" />
              </button>
            </>
          )}
        </div>

        <a href={`tel:${ticket.phone}`} dir="ltr" aria-label={ticket.phone} className={cx(BTN, 'shrink-0 self-center max-sm:h-[34px] max-sm:w-[34px] max-sm:!p-0', late ? PHONE_TONE.late : PHONE_TONE.normal)}>
          <Ico name="phone" />
          <span className="hidden tabular-nums sm:inline">{ticket.phone}</span>
        </a>
      </div>

      {open && (
        <>
          <div className={cx('space-y-4 border-t p-3 sm:p-4', DIVIDER)}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STAGES.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  disabled={i > stage}
                  aria-pressed={tab === i}
                  onClick={() => setTab(i)}
                  className={cx(BTN, 'disabled:cursor-not-allowed', tab === i && 'border-emerald-600 bg-emerald-600/15 font-semibold')}
                >
                  {i < stage && <Ico name="check" />} {t.stage[name]}
                </button>
              ))}
            </div>

            <div hidden={tab !== 0}><IntakePanel ticket={ticket} lang={lang} onPickSlot={onPickSlot} onSlot={(slot) => slot && api.setSlot(ticket.id, slot)} onOpenTicket={onOpenTicket} /></div>
            <div hidden={tab !== 1}>
              <RepairPanel ticket={ticket} lang={lang} draft={repair} setDraft={setRepair} locked={stage > 1} etaError={etaError} />
            </div>
            <div hidden={tab !== 2}><Account ticket={ticket} lang={lang} onPay={(amount, method, payer, cashier) => api.addPayment(ticket.id, amount, method, payer, cashier)} onCheckDiscount={(code) => api.checkDiscount(ticket.id, code)} onDiscount={(code) => api.applyDiscount(ticket.id, code)} onDefer={defer} /></div>
            <div hidden={tab !== 3}><DeliveryPanel ticket={ticket} lang={lang} draft={delivery} setDraft={setDelivery} locked={stage > 3} /></div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t.card.log}</h3>
                <button
                  type="button" aria-expanded={showLog} onClick={() => setShowLog((v) => !v)}
                  className="cursor-pointer text-xs underline opacity-80 hover:opacity-100"
                >
                  {showLog ? t.card.hide : t.card.reveal}
                </button>
              </div>
              {showLog && (
              <ul className="space-y-1.5">
                {[...log].reverse().map((e) => (
                  <li key={e.id} className={cx('rounded-lg px-3 py-2 text-sm', ROW)}>
                    <span className="me-2 text-xs opacity-70">{formatDate(e.at, lang)}{e.by && ` · ${e.by}`}</span>
                    <span className="italic opacity-80"><RichLine text={logText(e)} /></span>
                  </li>
                ))}

                <li className={cx('rounded-lg px-3 py-2 text-sm', ROW)}>
                  <span className="me-2 text-xs opacity-70">{formatDate(ticket.receivedAt, lang)}{ticket.staff && ` · ${ticket.staff}`}</span>
                  <span className="italic opacity-80">{t.card.createdBy[ticket.createdBy ?? 'human']}</span>
                </li>
              </ul>
              )}
            </div>
          </div>

          {(start.length > 0 || end.length > 0) && (
            <div className={cx('flex flex-wrap items-center gap-2 rounded-b-xl border-t p-3 sm:p-4', solo ? 'justify-center' : 'justify-between', DIVIDER, BAR)}>

              <div className="grid w-full grid-cols-1 gap-2 sm:w-96 sm:grid-cols-2 sm:[&>*:only-child]:col-span-2">{end}</div>
              <div className="flex w-full gap-2 empty:hidden sm:w-auto">{start}</div>
            </div>
          )}
        </>
      )}

      {current && (
        <ConfirmDialog
          id={`confirm-${ticket.id}`} title={current.title} body={<RichLine text={current.body(ticket.name, ticket.number, device, partsBold)} />} note={current.note}
          keepLabel={t.card.keep} confirmLabel={current.label}
          busy={busy} onKeep={() => setDialog(null)}
          onConfirm={async () => {
            setBusy(true);
            try { await dialog.run(); } finally { setBusy(false); }
            setDialog(null);
          }}
        />
      )}
    </li>
  );
}