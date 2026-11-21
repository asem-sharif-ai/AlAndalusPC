import { useEffect, useMemo } from 'react';

import { ApiError, http } from '../../api/http';
import { uploadImages } from '../../api/images';
import * as store from '../../api/sync';

const GROUPS = ['received', 'promised', 'status', 'type', 'payment'];

// The page's filters become the server query (only the non-default ones); the same filters still run over the loaded rows
// in the page (applyFilters), so edits made by anyone show up instantly without refetching the list.
export const ticketQuery = (filters, search) => {
  const p = {};
  for (const g of GROUPS) if (filters[g] && filters[g] !== 'any' && filters[g] !== 'all') p[g] = filters[g];
  if (search.trim().length >= 2) p.q = search.trim();
  return p;
};

export default function useMaintenance({ filters, search }) {
  const version = store.useVersion();
  const q = store.useDebounced(search, 350);
  const query = useMemo(() => ticketQuery(filters, q), [filters, q]);
  const key = store.listKey('tickets', query);
  const settling = store.listKey('tickets', ticketQuery(filters, search)) !== key; // typing or just changed: the request has not been sent yet

  useEffect(() => { store.ensureList('tickets', query); store.ensureGrids(); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const tickets = useMemo(() => store.rows('tickets'), [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const grids = useMemo(() => store.rows('grids').sort((a, b) => a.code.localeCompare(b.code)), [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = store.listState(key);

  const act = (id, path, body, method = 'POST') =>
    store.run(async () => {
      const out = await http(`/tickets/${id}${path}`, { method, body });
      store.merge('tickets', [out.ticket]);
      if (out.note) store.merge('notes', [out.note]);
      return out.ticket;
    }, 'tickets', id);

  return {
    tickets, grids, slots: store.getSlots(), error: store.getError(),
    loading: settling || list.loading || (!list.loaded && !list.failed), hasMore: Boolean(list.next),
    clearError: store.clearError,
    loadMore: () => store.loadMore('tickets', query),
    loadSlots: store.loadSlots,
    fetchTicket: (id) => store.fetchOne('tickets', id),

    // create: photos are uploaded to ImageKit first; the client id makes a retry safe
    add: (data) =>
      store.run(async () => {
        const images = await uploadImages(data.images ?? []);
        const { ticket } = await http('/tickets', { method: 'POST', body: { ...data, images } });
        store.merge('tickets', [ticket]);
        return ticket;
      }),

    go: (id, status, repair) => act(id, '/status', { to: status, repair }),
    confirm: (id, how, repair) => act(id, '/confirm', { how, repair }),
    editRepair: (id, data) => act(id, '/repair', data, 'PATCH'),
    setSlot: (id, slot) => act(id, '/slot', { slot }, 'PUT'),
    addPayment: (id, amount, method, payer, cashier) => act(id, '/payments', { amount, method, payer, cashier }),
    deferBalance: (id, dueAt, description, cashier) => act(id, '/defer', { dueAt, description, cashier }),
    deliver: (id, data) => act(id, '/deliver', data),
    removeTicket: (id) => store.run(async () => {
      await http(`/tickets/${id}`, { method: 'DELETE' });
      store.drop('tickets', id);
    }, 'tickets', id),

    checkDiscount: async (id, code) => {
      try {
        const out = await http(`/tickets/${id}/discount/check`, { method: 'POST', body: { code } });
        return out.discount;
      } catch (e) {
        if (!(e instanceof ApiError && e.code === 'bad_code')) store.report(e);
        return null;
      }
    },

    // true = applied, false = unknown / expired code (the Account box shows its "not valid" state)
    applyDiscount: async (id, code) => {
      try {
        const out = await http(`/tickets/${id}/discount`, { method: 'POST', body: { code } });
        store.merge('tickets', [out.ticket]);
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.code === 'bad_code') return false;
        store.report(e);
        store.fetchOne('tickets', id);
        return false;
      }
    },

    // grids are tiny, so they update on screen at once and are corrected by the server reply
    saveGrid: (grid) => {
      const old = store.rows('grids').find((g) => g.id === grid.id);
      store.force('grids', { ...grid, rev: old?.rev ?? 0 });
      return store.run(async () => {
        const out = await http(`/grids/${grid.id}`, { method: 'PUT', body: grid });
        store.force('grids', out.grid);
      });
    },
    removeGrid: (id) => {
      store.drop('grids', id);
      return store.run(() => http(`/grids/${id}`, { method: 'DELETE' })).then(async (out) => {
        if (!out) (await http('/grids')).grids.forEach((g) => store.force('grids', g)); // the server said no: put the shelf back
      });
    },
  };
}