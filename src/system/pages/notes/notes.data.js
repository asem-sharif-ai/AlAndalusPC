import { addDays, isTomorrow } from '../../../utils';
import { textMatch } from '../../api/sync';

export const PRIORITIES = ['high', 'medium', 'low'];
export const STATUSES = ['pending', 'in_progress', 'done', 'archived'];

export const CATEGORIES = ['customer', 'supplier', 'repair', 'payment', 'order', 'other'];
export const PICKABLE_CATEGORIES = CATEGORIES;
export const EXTEND_OPTIONS = [
  { id: '3h', hours: 3 },
  { id: '6h', hours: 6 },
  { id: '1d', days: 1 },
  { id: '3d', days: 3 },
  { id: '1w', days: 7 },
];

const day = (s) => s.slice(0, 10);

export const isActive = (n) => n.status === 'pending' || n.status === 'in_progress';

export const isOverdue = (n, t) => isActive(n) && n.deadline < t;

const onTime = (n, t) => isActive(n) && n.deadline >= t;

const between = (d, from, to) => d >= from && d <= to;

const STATUS_FILTERS = {
  all: () => true,
  pending: (n) => n.status === 'pending',
  in_progress: (n) => n.status === 'in_progress',
  done: (n) => n.status === 'done',
  archived: (n) => n.status === 'archived',
};

const DEADLINE_FILTERS = {
  any: () => true,
  missed: isOverdue,
  today: (n, t) => onTime(n, t) && day(n.deadline) === day(t),
  tomorrow: (n, t) => onTime(n, t) && isTomorrow(n.deadline, t),
  next7: (n, t) => onTime(n, t) && between(day(n.deadline), day(t), addDays(day(t), 7)),
  month: (n, t) => n.deadline.slice(0, 7) === t.slice(0, 7),
};

const CREATED_FILTERS = {
  any: () => true,
  today: (n, t) => day(n.createdAt) === day(t),
  last7: (n, t) => between(day(n.createdAt), addDays(day(t), -7), day(t)),
  last30: (n, t) => between(day(n.createdAt), addDays(day(t), -30), day(t)),
};

export const FILTER_OPTIONS = {
  created: Object.keys(CREATED_FILTERS),
  deadline: Object.keys(DEADLINE_FILTERS),
  status: Object.keys(STATUS_FILTERS),
  category: ['any', 'customer', 'order', 'payment', 'repair', 'supplier', 'other'],
  priority: ['any', ...[...PRIORITIES].reverse()],
};

export const DEFAULT_FILTERS = Object.fromEntries(
  Object.entries(FILTER_OPTIONS).map(([group, keys]) => [group, keys[0]]),
);

const byDeadline = (a, b) =>
  (!isActive(a) - !isActive(b)) ||
  a.deadline.localeCompare(b.deadline) ||
  PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);

export function applyFilters(notes, f, search, t) {
  return notes
    .filter(
      (n) =>
        STATUS_FILTERS[f.status](n, t) &&
        DEADLINE_FILTERS[f.deadline](n, t) &&
        CREATED_FILTERS[f.created](n, t) &&
        (f.priority === 'any' || n.priority === f.priority) &&
        (f.category === 'any' || n.category === f.category) &&
        textMatch([n.name, n.phone], n.phone, search),
    )
    .sort(byDeadline);
}