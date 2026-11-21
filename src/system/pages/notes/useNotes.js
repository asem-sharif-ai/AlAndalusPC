import { useEffect, useMemo } from 'react';

import { http, newId } from '../../api/http';
import * as store from '../../api/sync';

const GROUPS = ['created', 'deadline', 'status', 'category', 'priority'];

export const noteQuery = (filters, search) => {
  const p = {};
  for (const g of GROUPS) if (filters[g] && filters[g] !== 'any' && filters[g] !== 'all') p[g] = filters[g];
  if (search.trim().length >= 2) p.q = search.trim();
  return p;
};

export default function useNotes({ filters, search }) {
  const version = store.useVersion();
  const q = store.useDebounced(search, 350);
  const query = useMemo(() => noteQuery(filters, q), [filters, q]);
  const key = store.listKey('notes', query);
  const settling = store.listKey('notes', noteQuery(filters, search)) !== key; // typing or just changed: the request has not been sent yet

  useEffect(() => { store.ensureList('notes', query); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const notes = useMemo(() => store.rows('notes'), [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = store.listState(key);

  const act = (id, path, body, method = 'POST') =>
    store.run(async () => {
      const out = await http(`/notes/${id}${path}`, { method, body });
      store.merge('notes', [out.note ?? { id, deleted: true, rev: Number.MAX_SAFE_INTEGER }]);
      return out;
    }, 'notes', id);

  return {
    notes, error: store.getError(), loading: settling || list.loading || (!list.loaded && !list.failed), hasMore: Boolean(list.next),
    clearError: store.clearError, loadMore: () => store.loadMore('notes', query),

    add: (data) =>
      store.run(async () => {
        const { note } = await http('/notes', { method: 'POST', body: { ...data, id: newId() } });
        store.merge('notes', [note]);
        return note;
      }),
    edit: (id, data) => act(id, '', data, 'PATCH'),
    save: (id, data) => act(id, '/save', data),     // extend + typed update + status in one request
    setStatus: (id, status) => act(id, '/status', { status }),
    addUpdate: (id, text) => act(id, '/updates', { text }),
    remove: (id) => act(id, '', undefined, 'DELETE'),
  };
}