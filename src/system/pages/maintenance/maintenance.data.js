import { addDays, isTomorrow } from '../../../utils';
import { textMatch } from '../../api/sync';

export const TYPES = ['pc', 'monitor', 'laptop', 'printer', 'other'];
export const STATUSES = ['received', 'inspecting', 'awaiting_client', 'waiting_parts', 'in_repair', 'ready', 'delivered', 'unrepairable', 'parts_not_found', 'cancelled'];
export const METHODS = ['cash', 'card', 'wallet', 'instapay'];
export const REPAIR_FIELDS = ['tech', 'actual', 'eta', 'cause', 'action', 'parts', 'diagnosis'];
export const DELIVERY_FIELDS = ['deliverer', 'receiver', 'warranty'];

const STAGE = { received: 0, inspecting: 1, awaiting_client: 1, waiting_parts: 1, in_repair: 1, delivered: 4 };

const ENDED = ['delivered', 'unrepairable', 'parts_not_found', 'cancelled'];
const ARCHIVED = ['delivered', 'parts_not_found', 'cancelled'];
const WORK_ENDED = ['ready', 'unrepairable', 'parts_not_found', 'cancelled'];

export const stageOf = (n) => (WORK_ENDED.includes(n.status) ? (balance(n) > 0 && !n.debt ? 2 : 3) : STAGE[n.status]);

const NEXT = {
  received: ['inspecting', 'cancelled'],
  inspecting: ['awaiting_client', 'waiting_parts', 'in_repair', 'unrepairable', 'cancelled'],
  awaiting_client: ['in_repair', 'cancelled'],
  waiting_parts: ['in_repair', 'parts_not_found', 'cancelled'],
  in_repair: ['ready', 'unrepairable', 'cancelled'],
  ready: [],
  unrepairable: [],
  parts_not_found: [],
  cancelled: [],
  delivered: [],
};

export const needsApproval = (n, actual, parts) => Number(actual) > n.estimate || Boolean(String(parts ?? '').trim());

export const stepOf = (n, approval, parts) =>
  n.status === 'awaiting_client' ? 'confirming'
    : n.status === 'waiting_parts' ? 'waiting'
      : n.status === 'in_repair' ? 'repair'
        : approval && !n.cleared ? 'confirm'
          : String(parts ?? '').trim() ? 'parts' : 'start';

const REPORT_OPEN = ['diagnosis'];
export const reportLock = (n) =>
  n.status === 'in_repair' ? 'all' : n.status === 'awaiting_client' || n.status === 'waiting_parts' || (n.status === 'inspecting' && n.cleared) ? 'approved' : null;
export const editableFields = (n) => {
  const lock = reportLock(n);
  return lock === 'all' ? REPORT_OPEN : lock === 'approved' ? ['diagnosis', 'eta'] : REPAIR_FIELDS;
};

export const canGo = (n, to) => NEXT[n.status].includes(to);

export const canPay = (n) => WORK_ENDED.includes(n.status) && balance(n) > 0 && !n.debt;

export const canDeliver = (n) => WORK_ENDED.includes(n.status) && (balance(n) === 0 || Boolean(n.debt));

export const isOpen = (n) => n.status !== 'delivered';

export const isClosed = (n) => n.status === 'delivered';

export const isEnded = (n) => ENDED.includes(n.status);

export const isArchived = (n) => ARCHIVED.includes(n.status);

export const isLate = (n, t) => !isEnded(n) && n.eta < t;

export const badEta = (n, eta, t) => !eta || (eta !== n.eta && eta < t);

export const money = (v) => Number(v).toLocaleString('en-US');

export const paid = (n) => Math.round(n.payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;

const NO_DUES = ['cancelled_early', 'cancelled', 'unrepairable'];

export const noDues = (n) => NO_DUES.includes(n.outcome);

const round2 = (v) => Math.round(v * 100) / 100;

export const discountOf = (n) => {
  if (!n.discount || n.outcome === 'cancelled_early') return 0;
  const { type, value } = n.discount;
  return round2(Math.min(type === 'percent' ? (n.actual * value) / 100 : value, n.actual));
};

export const total = (n) => (n.outcome === 'cancelled_early' ? 0 : round2(Math.max(n.actual - discountOf(n), 0)));

export const balance = (n) => (noDues(n) ? 0 : round2(Math.max(total(n) - paid(n), 0)));

const day = (s) => s.slice(0, 10);
const between = (d, from, to) => d >= from && d <= to;

const upcoming = (n, t) => !isEnded(n) && n.eta >= t;

const PAYMENT_FILTERS = {
  any: () => true,
  unpaid: (n) => WORK_ENDED.includes(n.status) && !noDues(n) && !n.debt && balance(n) > 0 && paid(n) === 0,
  partial: (n) => paid(n) > 0 && balance(n) > 0 && !n.debt,
  paid: (n) => n.payments.length > 0 && balance(n) === 0,
  deferred: (n) => Boolean(n.debt),
  discounted: (n) => Boolean(n.discount),
};

const PROMISED_FILTERS = {
  any: () => true,
  late: isLate,
  today: (n, t) => upcoming(n, t) && day(n.eta) === day(t),
  tomorrow: (n, t) => upcoming(n, t) && isTomorrow(n.eta, t),
  next7: (n, t) => upcoming(n, t) && between(day(n.eta), day(t), addDays(day(t), 7)),
  month: (n, t) => upcoming(n, t) && n.eta.slice(0, 7) === t.slice(0, 7),
};

const RECEIVED_FILTERS = {
  any: () => true,
  today: (n, t) => day(n.receivedAt) === day(t),
  last7: (n, t) => between(day(n.receivedAt), addDays(day(t), -7), day(t)),
  last30: (n, t) => between(day(n.receivedAt), addDays(day(t), -30), day(t)),
};

export const FILTER_OPTIONS = {
  received: Object.keys(RECEIVED_FILTERS),
  promised: Object.keys(PROMISED_FILTERS),
  status: ['all', ...STATUSES],
  type: ['any', 'pc', 'monitor', 'laptop', 'printer', 'other'],
  payment: Object.keys(PAYMENT_FILTERS),
};

export const DEFAULT_FILTERS = Object.fromEntries(
  Object.entries(FILTER_OPTIONS).map(([group, keys]) => [group, keys[0]]),
);

const byEta = (a, b) => (isArchived(a) - isArchived(b)) || a.eta.localeCompare(b.eta);

export function applyFilters(tickets, f, search, t) {
  return tickets
    .filter(
      (n) =>
        RECEIVED_FILTERS[f.received](n, t) &&
        PROMISED_FILTERS[f.promised](n, t) &&
        (f.status === 'all' || n.status === f.status) &&
        (f.type === 'any' || n.type === f.type) &&
        PAYMENT_FILTERS[f.payment](n) &&
        textMatch([n.number, n.name, n.phone, n.model, n.serial], n.phone, search),
    )
    .sort(byEta);
}