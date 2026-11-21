import { useEffect, useRef, useState } from 'react';

import ConfirmDialog from '../../components/ConfirmDialog';
import Ico from '../../components/Ico';
import RichLine from '../../components/RichLine';
import PaymentInput from '../../components/PaymentInput';
import Spinner from '../../components/Spinner';
import { ADD_TONE, BTN, FIELD, ROW, ROW_FIELD } from '../../components/ui';
import { addTime, cx, formatDate, now } from '../../../utils';
import { METHODS, balance, canPay, discountOf, editableFields, money, noDues, paid, reportLock, total } from './maintenance.data';
import { findDeviceHistory } from './maintenance.api';
import I18N from './maintenance.i18n';
import { Lightbox } from './PhotoLightbox';
import { TextArea, TextInput } from '../../components/TextField';

const RED_TEXT = 'text-red-600 [[data-theme=dark]_&]:text-red-400';
const AMBER_BOX = 'border-amber-500/60 bg-amber-500/15 text-amber-800 [[data-theme=dark]_&]:text-amber-200';

function Row({ label, wide, action, children }) {
  return (
    <div className={cx('rounded-lg px-3 py-2 text-sm', ROW, wide && 'sm:col-span-2')}>
      <dt className="flex items-center justify-between gap-2 text-xs"><span className="opacity-70">{label}</span>{action}</dt>
      <dd className="whitespace-pre-line [overflow-wrap:anywhere]">{children || <span className="opacity-60">—</span>}</dd>
    </div>
  );
}

function Input({ label, wide, area, error, hint, hintTone, disabled, ...props }) {
  const Tag = area ? TextArea : TextInput;
  return (
    <label className={cx('block space-y-1', wide && 'sm:col-span-2')}>
      {(label || error || hint) && (
        <span className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
          <span className="opacity-70">{label}</span>
          {error && <span className={RED_TEXT}>{error}</span>}
          {!error && hint && <span className={cx('font-semibold tabular-nums', hintTone)}>{hint}</span>}
        </span>
      )}
      <Tag rows={area ? 3 : undefined} dir="auto" disabled={disabled} className={cx(FIELD, ROW_FIELD, disabled && 'cursor-not-allowed opacity-60')} {...props} />
    </label>
  );
}

function DebtRow({ ticket, lang }) {
  const t = I18N[lang];
  if (!ticket.debt) return null;
  return (
    <p className={cx('flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-sm font-semibold', AMBER_BOX)}>
      <span>{t.acct.deferRow}</span>
      <span className="tabular-nums">{`${money(ticket.debt.amount)} ${t.currency}`}</span>
      <span>{formatDate(ticket.debt.dueAt, lang)}</span>
    </p>
  );
}

export function IntakePanel({ ticket, lang, onPickSlot, onSlot, onOpenTicket }) {
  const t = I18N[lang];
  const [history, setHistory] = useState([]);
  useEffect(() => {
    let live = true;
    if (String(ticket.serial ?? '').trim().length < 4) { setHistory([]); return undefined; }
    findDeviceHistory(ticket.serial, ticket.id).then((h) => live && setHistory(h)).catch(() => {});
    return () => { live = false; };
  }, [ticket.id, ticket.serial]);
  const [showPin, setShowPin] = useState(false);
  const [viewer, setViewer] = useState(null);

  return (
    <>
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Row label={t.f.type}>{`${t.type[ticket.type]} · ${ticket.model}`}</Row>
      <Row label={t.f.serial}><span dir="ltr">{ticket.serial}</span></Row>
      <Row label={t.f.pin} action={ticket.pin && (
        <button type="button" className="cursor-pointer text-xs underline opacity-80 hover:opacity-100" onClick={() => setShowPin((v) => !v)}>
          {showPin ? t.card.hide : t.card.reveal}
        </button>
      )}>
        {ticket.pin && <span dir="ltr" className="tabular-nums">{showPin ? ticket.pin : '••••'}</span>}
      </Row>
      <Row label={t.card.history}>
        {history.length > 0 && (
          <span className="flex flex-wrap gap-2" dir="ltr">
            {history.map((h) => (
              <button key={h.id} type="button" onClick={() => onOpenTicket?.(h.id)} className="cursor-pointer rounded-md bg-neutral-500/15 px-2 py-0.5 text-sm underline hover:bg-neutral-500/25">
                #{h.number} · {t.status[h.status]}
              </button>
            ))}
          </span>
        )}
      </Row>
      <Row label={t.f.complaint} wide>{ticket.complaint}</Row>
      <div className={cx('flex min-h-[52px] items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm', ROW)}>
        <div className="min-w-0">
          <dt className="text-xs opacity-70">{t.f.staffSlot}</dt>
          <dd className="break-words">{ticket.staff || <span className="opacity-60">—</span>}</dd>
        </div>
        {ticket.slot ? (
          <span
            title={t.card.slotOnce}
            className={cx('inline-flex h-[30px] min-w-[30px] shrink-0 items-center justify-center rounded-lg border px-2 text-sm font-semibold', ADD_TONE)}
          >
            <span dir="ltr">{ticket.slot}</span>
          </span>
        ) : ticket.status !== 'delivered' ? (
          <button
            type="button" onClick={() => onPickSlot('', onSlot)} title={t.storage.pickBtn} aria-label={t.storage.pickBtn}
            className={cx(BTN, ADD_TONE, 'h-[30px] w-[30px] shrink-0 !p-0')}
          >
            <Ico name="plus" />
          </button>
        ) : null}
      </div>
      <div className={cx('flex min-h-[52px] items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm', ROW)}>
        <div className="min-w-0">
          <dt className="text-xs opacity-70">{t.f.photos}</dt>
          <dd className="font-normal">{t.card.imageCount((ticket.images || []).length)}</dd>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {(ticket.images || []).map((_, i) => (
            <button
              key={i} type="button" onClick={() => setViewer(i)}
              className={cx(BTN, 'h-[30px] shrink-0 border-neutral-500/40 bg-white !px-2 text-sm font-normal hover:bg-neutral-100 [[data-theme=dark]_&]:bg-neutral-900 [[data-theme=dark]_&]:hover:bg-neutral-800')}
            >
              {t.card.imageN(i + 1)}
            </button>
          ))}
        </div>
      </div>
      <Row label={t.f.condition}>{ticket.condition}</Row>
      <Row label={t.f.accessories}>{ticket.accessories}</Row>
      <Row label={t.f.estimate}>{`${money(ticket.estimate)} ${t.currency}`}</Row>
      <Row label={t.card.received}>{formatDate(ticket.receivedAt, lang)}</Row>

    </dl>
    {viewer !== null && <Lightbox images={ticket.images} start={viewer} onClose={() => setViewer(null)} />}
    </>
  );
}

function buildReport(ticket, draft, t, lang, warn) {
  const line = (label, value) => (value ? `${label}: ${value}` : null);
  return [
    t.report.title(ticket.number),
    line(t.report.status, t.status[ticket.status]),
    line(t.report.device, `${t.type[ticket.type]} · ${ticket.model}`),
    line(t.report.complaint, ticket.complaint),
    line(t.report.diagnosis, draft.diagnosis),
    line(t.report.cause, draft.cause),
    line(t.report.action, draft.action),
    line(t.report.parts, draft.parts),
    line(t.report.estimate, `${money(ticket.estimate)} ${t.currency}`),
    line(t.report.actual, `${money(Number(draft.actual) || 0)} ${t.currency}`),
    line(t.report.eta, formatDate(draft.eta, lang)),
    warn && t.report.approve,
  ].filter(Boolean).join('\n');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

export function RepairPanel({ ticket, lang, draft, setDraft, locked, etaError }) {
  const t = I18N[lang];
  const open = editableFields(ticket);
  const lock = reportLock(ticket);
  const off = (key) => !open.includes(key);
  const [copied, setCopied] = useState(false);
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const costDiff = Number(draft.actual) > ticket.estimate;
  const needsParts = Boolean(draft.parts.trim());
  const warn = costDiff || needsParts;

  const copy = async () => {
    await copyText(buildReport(ticket, draft, t, lang, warn));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (locked) {
    return (
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Row label={t.f.tech}>{ticket.tech}</Row>
        <Row label={t.f.parts}>{ticket.parts}</Row>
        <Row label={t.f.cause}>{ticket.cause}</Row>
        <Row label={t.f.action}>{ticket.action}</Row>
        <Row label={t.f.actual}>{`${money(ticket.actual)} ${t.currency}`}</Row>
        <Row label={t.f.eta}>{formatDate(ticket.eta, lang)}</Row>
        <Row label={t.f.diagnosis} wide>{ticket.diagnosis}</Row>
      </dl>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label={t.f.tech} disabled={off('tech')} value={draft.tech} onChange={set('tech')} />
        <Input label={t.f.parts} disabled={off('parts')} value={draft.parts} onChange={set('parts')} />
        <Input label={t.f.cause} disabled={off('cause')} value={draft.cause} onChange={set('cause')} />
        <Input label={t.f.action} disabled={off('action')} value={draft.action} onChange={set('action')} />
        <Input label={t.f.actual} disabled={off('actual')} type="number" min="0" step="50" dir="ltr" value={draft.actual} onChange={set('actual')} />
        <Input label={t.f.eta} disabled={off('eta')} type="datetime-local" value={draft.eta} onChange={set('eta')} error={etaError && t.form.errPast} />
        <Input label={t.f.diagnosis} area wide disabled={off('diagnosis')} value={draft.diagnosis} onChange={set('diagnosis')} />
      </div>

      {false && <p className={cx('rounded-lg border px-3 py-2 text-sm', AMBER_BOX)}>{lock === 'all' ? t.card.lockedAll : t.card.lockedApproved}</p>}

      {warn && !lock && (
        <div className={cx('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm', AMBER_BOX)}>
          <p className="min-w-0 flex-1">
            {t.card.hint(costDiff && [money(Number(draft.actual) || 0), money(ticket.estimate)], needsParts && draft.parts.trim())}
          </p>
          <button type="button" className={cx(BTN, 'shrink-0')} onClick={copy}>
            {copied ? t.card.copied : t.card.copy}
          </button>
        </div>
      )}
    </div>
  );
}

export function DeliveryPanel({ ticket, lang, draft, setDraft, locked }) {
  const t = I18N[lang];
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const withWarranty = ticket.outcome !== 'cancelled_early' && ticket.outcome !== 'cancelled';

  if (locked) {
    return (
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Row label={t.f.deliverer}>{ticket.deliverer}</Row>
        <Row label={t.f.receiver}>{ticket.receiver}</Row>
        {withWarranty && <Row label={t.f.warranty} wide>{ticket.warranty}</Row>}
        <Row label={t.status.delivered} wide>{formatDate(ticket.deliveredAt, lang)}</Row>
      </dl>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label={t.f.deliverer} value={draft.deliverer} onChange={set('deliverer')} />
        <Input label={t.f.receiver} value={draft.receiver} onChange={set('receiver')} />
        {withWarranty && <Input label={t.f.warranty} area wide value={draft.warranty} onChange={set('warranty')} />}
      </div>
    </div>
  );
}

const SPIN_CSS = '@keyframes code-spin{to{transform:rotate(360deg)}}';
function CodeMark({ state }) {
  if (!state) return null;
  return (
    <span style={{ position: 'absolute', insetInlineEnd: 4, top: '50%', transform: 'translateY(-50%)', display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      {state === 'checking' && (
        <>
          <style>{SPIN_CSS}</style>
          <svg
            viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"
            style={{ width: 16, height: 16, opacity: 0.75, animation: 'code-spin 0.8s linear infinite', transformOrigin: '50% 50%' }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </>
      )}
      {state === 'ok' && <span style={{ color: '#16a34a', display: 'grid' }}><Ico name="check" size={16} /></span>}
      {state === 'bad' && <span style={{ color: '#dc2626', display: 'grid' }}><Ico name="x" size={16} /></span>}
    </span>
  );
}

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

export function Account({ ticket, lang, onPay, onCheckDiscount, onDiscount, onDefer }) {
  const t = I18N[lang];
  const narrow = useNarrow();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const payerKey = `payer:${ticket.id}`;
  const [payer, setPayer] = useState(() => ticket.payer || (() => { try { return localStorage.getItem(payerKey) || ''; } catch { return ''; } })());
  useEffect(() => { try { localStorage.setItem(payerKey, payer); } catch { return; } }, [payerKey, payer]);
  const [cashier, setCashier] = useState(() => ticket.cashier || (() => { try { return localStorage.getItem('cashier') || ''; } catch { return ''; } })());
  const noNames = !payer.trim() || !cashier.trim();
  const [code, setCode] = useState('');
  const [codeState, setCodeState] = useState('idle');
  const [found, setFound] = useState(null);
  const [applying, setApplying] = useState(false);
  const onCheckRef = useRef(onCheckDiscount);
  onCheckRef.current = onCheckDiscount;

  const [deferOpen, setDeferOpen] = useState(false);
  const [dueAt, setDueAt] = useState(() => addTime(now(), { days: 3 }));
  const dueBad = !dueAt || dueAt < now();
  const openDefer = () => { setDueAt(addTime(now(), { days: 3 })); setDeferOpen(true); };

  const sum = total(ticket);
  const off = discountOf(ticket);
  const left = balance(ticket);
  const free = noDues(ticket);
  const percent = sum ? Math.min(Math.round((paid(ticket) / sum) * 100), 100) : 100;
  const value = Number(amount);
  const badValue = value !== 0 && !Number.isFinite(value);

  const change = value > left ? Math.round((value - left) * 100) / 100 : 0;
  const remainingAfter = Math.max(Math.round((left - value) * 100) / 100, 0);

  const [paying, setPaying] = useState(false);
  const [deferring, setDeferring] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [fullPay, setFullPay] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (!value || !Number.isFinite(value) || noNames || paying) return;
    setFullPay(false);
    setPayOpen(true);
  };
  const payFullOpen = () => {
    if (left <= 0 || noNames || paying) return;
    setFullPay(true);
    setPayOpen(true);
  };
  const payValue = fullPay ? left : value;
  const payChange = fullPay ? 0 : change;
  const refunding = value < 0 && !badValue;
  const payLabel = value && !badValue ? `${refunding ? t.acct.refund : t.acct.pay} ${money(Math.abs(value))}` : t.acct.pay;
  const addHint = !value ? t.acct.amount : noNames ? `${t.acct.cashier} / ${t.acct.payer}` : '';
  const confirmPay = async () => {
    setPaying(true);
    try { localStorage.setItem('cashier', cashier.trim()); } catch { /* storage unavailable */ }
    try { await onPay(payValue, method, payer.trim(), cashier.trim()); } finally { setPaying(false); }
    setAmount('');
    setFullPay(false);
    setPayOpen(false);
  };
  const preview = value !== 0 && !badValue
    ? (change > 0 ? { text: t.acct.statChange, num: money(change), tone: 'text-amber-700 [[data-theme=dark]_&]:text-amber-300' } : { text: t.acct.statRemaining, num: money(remainingAfter), tone: remainingAfter > 0 ? RED_TEXT : 'text-emerald-700 [[data-theme=dark]_&]:text-emerald-300' })
    : null;

  useEffect(() => {
    const value = code.trim();
    if (!value) { setCodeState('idle'); return undefined; }
    let alive = true;
    const timer = setTimeout(async () => {
      setCodeState('checking');
      try {
        const result = await onCheckRef.current(value);
        if (!alive) return;
        if (!result) return setCodeState('bad');
        setCodeState('idle');
        setFound(result);
      } catch {
        if (alive) setCodeState('bad');
      }
    }, 600);
    return () => { alive = false; clearTimeout(timer); };
  }, [code]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{t.acct.title}</h3>
      <div className={cx('space-y-2 rounded-lg px-3 py-3', ROW)}>
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm opacity-80">{free ? t.acct.noDues : left > 0 ? t.acct.remaining : t.acct.settled}</span>
          <span className={cx('text-xl font-bold tabular-nums', left > 0 && RED_TEXT)}>{`${money(left)} ${t.currency}`}</span>
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-500/20" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-emerald-600" style={{ width: `${percent}%` }} />
        </div>

        <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: narrow ? 'center' : 'space-between', gap: narrow ? 12 : '12px 24px' }}>
          {(() => {
            const applied = ticket.discount?.code || '';
            const locked = !canPay(ticket) || Boolean(ticket.discount) || ticket.payments.length > 0;
            return (
              <label className="text-sm" style={{ display: 'flex', alignItems: 'baseline', justifyContent: narrow ? 'center' : 'flex-start', gap: 8, flex: narrow ? '0 0 auto' : '0 1 auto', minWidth: 0 }}>
                <span style={{ flexShrink: 0 }}>{t.acct.codeLabel}:</span>

                <span style={{ position: 'relative', display: 'inline-block', width: '7.5rem' }}>
                  <TextInput
                    dir="ltr" emptyDir={undefined} value={locked ? applied : code} aria-label={t.acct.codeLabel}
                    disabled={locked} readOnly={locked}
                    onChange={(e) => setCode(e.target.value)}
                    className={cx('bg-transparent text-sm font-bold uppercase outline-none focus:border-emerald-500', codeState === 'bad' ? 'border-red-500' : 'border-neutral-500/60', locked && 'cursor-not-allowed opacity-70')}
                    style={{ width: '100%', textAlign: 'center', border: 0, borderBottomWidth: 1, borderBottomStyle: 'dashed', borderRadius: 0, padding: '0 22px' }}
                  />
                  <CodeMark state={ticket.discount ? 'ok' : locked ? null : codeState === 'checking' ? 'checking' : codeState === 'bad' ? 'bad' : null} />
                </span>
              </label>
            );
          })()}

          <dl className="m-0 text-sm" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'center', marginInlineStart: narrow ? 0 : 'auto', rowGap: 6 }}>
            {[
              ...(off > 0
                ? [
                  [t.acct.total, money(ticket.actual), ''],
                  [t.acct.discount, `-${money(off)}${ticket.discount?.type === 'percent' ? ` (${ticket.discount.value}%)` : ''}`, 'text-emerald-700 [[data-theme=dark]_&]:text-emerald-300'],
                  [t.acct.statNet, money(sum), ''],
                ]
                : [[t.acct.total, money(sum), '']]),
              [t.acct.paid, money(paid(ticket)), ''],
              [t.acct.statRemaining, money(left), left > 0 ? RED_TEXT : ''],
            ].map(([label, val, tone], i) => (
              <div
                key={label}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap',
                  paddingInline: narrow ? 8 : 14,
                  ...(i > 0 ? { borderInlineStart: '1px solid rgba(115,115,115,0.55)' } : null),
                }}
              >
                <dt className="text-xs opacity-70">{label}</dt>
                <dd className={cx('m-0 font-bold tabular-nums', tone)}>{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <DebtRow ticket={ticket} lang={lang} />

      {!canPay(ticket) && (ticket.payer || ticket.cashier) && (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Row label={t.acct.cashier}>{ticket.cashier}</Row>
          <Row label={t.acct.payer}>{ticket.payer}</Row>
        </dl>
      )}

      {canPay(ticket) && (
        <form onSubmit={submit} className="space-y-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label={t.acct.cashier} value={cashier} onChange={(e) => setCashier(e.target.value)} />
            <Input label={t.acct.payer} value={payer} onChange={(e) => setPayer(e.target.value)} />
          </div>
          <style>{'.pay-row .pay-btn{height:42px;box-sizing:border-box}'}</style>
          <div className="pay-row" style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'stretch' : 'flex-end', gap: narrow ? 10 : 20 }}>
            <div className="space-y-1" style={{ flex: narrow ? undefined : '1 1 0', minWidth: 0 }}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
              <span className="opacity-70">{t.acct.amount}</span>
              {preview && (
                <span className="font-normal text-neutral-900 [[data-theme=dark]_&]:text-neutral-100">
                  {preview.text} <span className={cx('font-bold tabular-nums', preview.tone)}>{preview.num}</span>
                </span>
              )}
            </div>
            <PaymentInput
              amount={amount} onAmountChange={setAmount} amountLabel={t.acct.amount}
              method={method} methods={METHODS.map((m) => ({ value: m, label: t.method[m] }))} onMethodChange={setMethod}
              submitLabel={payLabel} submitTitle={addHint} negative={refunding} busy={paying}
              submitDisabled={!value || badValue || noNames || paying}
            />
            </div>
            <div style={{ flex: narrow ? undefined : '1 1 0', minWidth: 0, display: 'flex', gap: 8 }}>
              <button type="button" disabled={left <= 0 || noNames || paying} title={noNames ? `${t.acct.cashier} / ${t.acct.payer}` : ''} style={{ flex: 1 }} className={cx(BTN, ADD_TONE, 'pay-btn disabled:cursor-not-allowed')} onClick={payFullOpen}>
                {t.acct.payFull}
              </button>
              <button type="button" style={{ flex: 1 }} className={cx(BTN, 'pay-btn border-red-500/60 bg-red-500/15 text-red-700 hover:bg-red-500/25 [[data-theme=dark]_&]:text-red-300')} onClick={openDefer} disabled={!cashier.trim()}>
                {t.acct.deferRow}
              </button>
            </div>
          </div>
        </form>
      )}

      {payOpen && (
        <ConfirmDialog
          id={`pay-${ticket.id}`} title={fullPay ? t.acct.payFullTitle : t.acct.payTitle}
          body={<RichLine text={fullPay
            ? t.acct.payFullBody(`${money(left)} ${t.currency}`, t.method[method], payer.trim(), cashier.trim())
            : t.acct.payBody(`${money(Math.abs(payValue))} ${t.currency}`, t.method[method], payer.trim(), payChange > 0 ? `${money(payChange)} ${t.currency}` : '', payValue < 0, cashier.trim())} />}
          keepLabel={t.acct.deferCancel} confirmLabel={t.acct.pay} busy={paying}
          onKeep={() => { setPayOpen(false); setFullPay(false); }} onConfirm={confirmPay}
        />
      )}

      {found && (
        <ConfirmDialog
          id={`code-${ticket.id}`} title={t.acct.codeTitle}
          body={<RichLine text={t.acct.codeBody(found.code, found.type === 'percent' ? `${found.value}%` : `${money(found.value)} ${t.currency}`, found, `${money(Math.max(ticket.actual - Math.min(found.type === 'percent' ? (ticket.actual * found.value) / 100 : found.value, ticket.actual), 0))} ${t.currency}`, found.expiresAt ? formatDate(found.expiresAt, lang) : '')} />}
          keepLabel={t.acct.deferCancel} confirmLabel={t.acct.codeConfirm} busy={applying}
          onKeep={() => { setFound(null); setCode(''); setCodeState('idle'); }}
          onConfirm={async () => {
            setApplying(true);
            try { await onDiscount(found.code); } finally { setApplying(false); }
            setFound(null);
            setCode('');
            setCodeState('idle');
          }}
        />
      )}

      {deferOpen && (
        <ConfirmDialog
          id={`defer-${ticket.id}`} title={t.acct.deferTitle} body={t.acct.deferHint(`${money(left)} ${t.currency}`)}
          keepLabel={t.acct.deferCancel} confirmLabel={t.acct.deferConfirm} confirmDisabled={dueBad} busy={deferring}
          onKeep={() => setDeferOpen(false)}
          onConfirm={async () => {
            setDeferring(true);
            try { await onDefer(dueAt, cashier.trim()); } finally { setDeferring(false); }
            setDeferOpen(false);
          }}
        >
          <Input label={t.acct.deferDate} type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} error={dueBad && t.form.errPast} />
        </ConfirmDialog>
      )}
    </div>
  );
}