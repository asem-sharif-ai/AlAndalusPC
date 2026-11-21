import { cx } from '../../utils';

export const SURFACE =
  'bg-white text-neutral-900 [[data-theme=dark]_&]:bg-neutral-900 [[data-theme=dark]_&]:text-neutral-100';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500';

export const BTN = cx(
  'inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-500/30 px-3 py-1.5 text-center [overflow-wrap:anywhere]',
  'cursor-pointer text-sm font-medium transition-colors hover:bg-neutral-500/15 disabled:cursor-not-allowed disabled:opacity-50',
  FOCUS,
);

export const BTN_PRIMARY = cx(
  'inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-center [overflow-wrap:anywhere]',
  'cursor-pointer text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50',
  FOCUS,
);

export const FIELD = cx(
  'w-full min-w-0 max-w-full rounded-lg border border-neutral-500/40 bg-transparent px-3 py-2 text-sm outline-none',
  'transition-colors focus:border-emerald-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [color-scheme:light] [[data-theme=dark]_&]:[color-scheme:dark]',
);

export const BADGE = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';

export const TONE = {
  red: { badge: 'bg-red-500/15 text-red-700 [[data-theme=dark]_&]:text-red-300', bar: 'border-s-red-500' },
  amber: { badge: 'bg-amber-500/15 text-amber-700 [[data-theme=dark]_&]:text-amber-300', bar: 'border-s-amber-500' },
  sky: { badge: 'bg-sky-500/15 text-sky-700 [[data-theme=dark]_&]:text-sky-300', bar: 'border-s-sky-500' },
  blue: { badge: 'bg-blue-500/15 text-blue-700 [[data-theme=dark]_&]:text-blue-300', bar: 'border-s-blue-500' },
  emerald: { badge: 'bg-emerald-500/15 text-emerald-700 [[data-theme=dark]_&]:text-emerald-300', bar: 'border-s-emerald-500' },
  neutral: { badge: 'bg-neutral-500/15', bar: 'border-s-neutral-500' },
};

export const DD_BUTTON =
  'text-neutral-900 [[data-theme=dark]_&]:text-neutral-100 bg-[#fcfcfc] [[data-theme=dark]_&]:bg-[#232323] hover:!bg-neutral-200 [[data-theme=dark]_&]:hover:!bg-neutral-700';

export const DD_ARROW =
  'bg-neutral-100 [[data-theme=dark]_&]:bg-neutral-800';

export const CARD_SURFACE =
  'rounded-xl border border-neutral-300 bg-[#fcfcfc] [[data-theme=dark]_&]:border-neutral-700 [[data-theme=dark]_&]:bg-[#232323] text-neutral-900 [[data-theme=dark]_&]:text-neutral-100';

export const PRIMARY_DISABLED =
  'disabled:cursor-not-allowed disabled:opacity-50';

export const ADD_TONE =
  'border-emerald-500/60 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 [[data-theme=dark]_&]:text-emerald-300';

export const EDIT_TONE =
  'border-blue-500/60 bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 [[data-theme=dark]_&]:text-blue-300';

export const DELETE_TONE =
  'border-red-500/60 bg-red-500/15 text-red-700 hover:bg-red-500/25 [[data-theme=dark]_&]:text-red-300';

export const RED_BOLD =
  'font-semibold text-red-600 [[data-theme=dark]_&]:text-red-400';

export const CARD_SURFACE_BARRED =
  'rounded-xl border border-y-neutral-300 border-e-neutral-300 bg-[#fcfcfc] [[data-theme=dark]_&]:border-y-neutral-700 [[data-theme=dark]_&]:border-e-neutral-700 [[data-theme=dark]_&]:bg-[#232323] text-neutral-900 [[data-theme=dark]_&]:text-neutral-100';

export const DD_BUTTON_IN_CARD =
  'bg-[#fcfcfc] [[data-theme=dark]_&]:bg-[#232323] hover:!bg-neutral-200 [[data-theme=dark]_&]:hover:!bg-neutral-700';

export const BAR =
  'bg-[#fcfcfc] [[data-theme=dark]_&]:bg-[#232323]';

export const ROW =
  'bg-neutral-100 [[data-theme=dark]_&]:bg-neutral-900';

export const ROW_FIELD =
  '!bg-neutral-100 [[data-theme=dark]_&]:!bg-neutral-900';

export const DIVIDER =
  'border-neutral-300 [[data-theme=dark]_&]:border-neutral-700';
