import { useEffect, useState, useSyncExternalStore } from 'react';

import { ApiError, http, query } from './http';

// One shared store for the whole app (survives page changes, so going Maintenance -> Notes -> Maintenance costs no requests).
// - Rows are kept by id, newest `rev` wins, so a row can arrive from a list page, a mutation reply or the change feed in any order.
// - The change feed is the only thing that moves the cursor; it is polled while the tab is visible and costs one tiny read when idle.
const kinds = { tickets: new Map(), notes: new Map(), grids: new Map() };
const lists = new Map(); // "tickets?status=ready" -> { next, loading, loaded }
let slots = [];
let error = null;
let version = 0;
const listeners = new Set();
const emit = () => { version += 1; listeners.forEach((f) => f()); };

export const useVersion = () => useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, () => version);
export const rows = (kind) => [...kinds[kind].values()];
export const getSlots = () => slots;
export const getError = () => error;
export const report = (e) => { error = { code: e instanceof ApiError ? e.code : 'generic', at: Date.now() }; emit(); };
export const clearError = () => { error = null; emit(); };

export function merge(kind, items) {
  const map = kinds[kind];
  let dirty = false;
  for (const row of items) {
    const old = map.get(row.id);
    if (old && old.rev >= row.rev) continue;
    if (row.deleted) map.delete(row.id); else map.set(row.id, row);
    dirty = true;
  }
  if (dirty) emit();
}

// optimistic write (grids): the server reply replaces it
export const force = (kind, row) => { kinds[kind].set(row.id, row); emit(); };
export const drop = (kind, id) => { kinds[kind].delete(id); emit(); };

// ---- change feed ----
let cursor = null;
let started = null;
let polling = false;

export async function poll() {
  if (polling || cursor == null) return;
  polling = true;
  try {
    for (let i = 0; i < 25; i += 1) {
      const c = await http(`/changes?since=${cursor}`);
      merge('tickets', c.tickets);
      merge('notes', c.notes);
      merge('grids', c.grids);
      cursor = c.rev;
      if (!c.more) break;
    }
  } catch { /* offline: try again on the next tick */ } finally { polling = false; }
}

export function start() {
  if (started) return started;
  started = http('/rev').then(({ rev }) => {
    cursor = rev;
    const tick = () => document.visibilityState === 'visible' && poll();
    setInterval(tick, 20_000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    window.addEventListener('online', tick);
  }).catch((e) => { started = null; throw e; });
  return started;
}

// ---- lists (server-side filtering and keyset paging) ----
export const listKey = (kind, params) => `${kind}${query(params)}`;
export const listState = (key) => lists.get(key) ?? { next: null, loading: false, loaded: false };

const firstPage = new Map(); // kind -> { key, ctl }: only the newest search/filter request is kept alive
async function fetchPage(kind, params, key, cursorValue) {
  const state = { ...listState(key), loading: true };
  lists.set(key, state);
  emit();
  const ctl = new AbortController();
  if (!cursorValue) {
    const prev = firstPage.get(kind);
    if (prev && prev.key !== key) prev.ctl.abort();
    firstPage.set(kind, { key, ctl });
  }
  try {
    await start();
    const page = await http(`/${kind}${query({ ...params, limit: 30, cursor: cursorValue })}`, { signal: ctl.signal });
    merge(kind, page.items);
    lists.set(key, { next: page.next, loading: false, loaded: true });
  } catch (e) {
    if (e?.name === 'AbortError') lists.set(key, { next: null, loading: false, loaded: false }); // superseded: fetch it again if the user comes back
    else {
      lists.set(key, { ...state, loading: false, failed: true });
      report(e);
    }
  } finally {
    if (firstPage.get(kind)?.ctl === ctl) firstPage.delete(kind);
  }
  emit();
}

export function ensureList(kind, params) {
  const key = listKey(kind, params);
  const s = listState(key);
  if (!s.loaded && !s.loading) fetchPage(kind, params, key, '');
}
export function loadMore(kind, params) {
  const key = listKey(kind, params);
  const s = listState(key);
  if (s.next && !s.loading) fetchPage(kind, params, key, s.next);
}

export async function ensureGrids() {
  if (lists.has('grids')) return;
  lists.set('grids', { loaded: true });
  try { await start(); merge('grids', (await http('/grids')).grids); } catch (e) { lists.delete('grids'); report(e); }
}

export async function loadSlots() {
  try { slots = (await http('/slots')).slots; emit(); } catch (e) { report(e); }
}

export async function fetchOne(kind, id) {
  try {
    const out = await http(`/${kind}/${id}`);
    const row = out.ticket ?? out.note;
    merge(kind, [row]);
    return row;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) merge(kind, [{ id, deleted: true, rev: Number.MAX_SAFE_INTEGER }]);
    return null;
  }
}

// Runs one action. On failure it reports the error (shown once, in the page's bar) and, for rejected rows, re-reads the row so the screen tells the truth.
export async function run(fn, kind, id) {
  try { return await fn(); } catch (e) {
    report(e);
    if (kind && e instanceof ApiError && e.status >= 400 && e.status < 500) fetchOne(kind, id);
    return undefined;
  }
}

// ---- lazy activity logs: fetched only while a card shows them, refetched only when the row's rev moved ----
const logCache = new Map();
export function useRemoteLog(kind, id, rev, enabled) {
  const path = kind === 'tickets' ? 'log' : 'updates';
  const key = `${kind}:${id}:${rev}`;
  const [entries, setEntries] = useState(() => logCache.get(key) ?? []);
  useEffect(() => {
    if (!enabled) return undefined;
    if (logCache.has(key)) { setEntries(logCache.get(key)); return undefined; }
    let live = true;
    http(`/${kind}/${id}/${path}`).then((out) => {
      const list = out.log ?? out.updates;
      logCache.set(key, list);
      if (logCache.size > 300) logCache.delete(logCache.keys().next().value);
      if (live) setEntries(list);
    }).catch(() => {});
    return () => { live = false; };
  }, [enabled, key, kind, id, path]);
  return entries;
}

// Same rule as the server's search: every word must appear (any order); a digits-only word also matches the phone without spaces/dashes.
const AR_DIGITS = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9, '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9 };
const digitsOf = (s) => String(s ?? '').replace(/[٠-٩۰-۹]/g, (c) => AR_DIGITS[c]).replace(/\D/g, '');
export const MIN_SEARCH = 2; // shorter text is neither sent to the server nor used to filter
export function textMatch(parts, phone, search) {
  const words = String(search ?? '').trim().toLowerCase().slice(0, 80).split(/\s+/).filter(Boolean).slice(0, 5);
  if (String(search ?? '').trim().length < MIN_SEARCH) return true;
  const hay = parts.join(' ').toLowerCase();
  const phoneDigits = digitsOf(phone);
  return words.every((w) => hay.includes(w) || (/^[+\d٠-٩۰-۹()-]+$/.test(w) && digitsOf(w) && phoneDigits.includes(digitsOf(w))));
}

export function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return v;
}