import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

import Dropdown from '../../components/Dropdown';
import ErrorBar from '../../components/ErrorBar';
import Ico from '../../components/Ico';
import Spinner from '../../components/Spinner';
import { BTN, BTN_PRIMARY, CARD_SURFACE, DD_ARROW, DD_BUTTON } from '../../components/ui';
import { cx, now } from '../../../utils';
import { DEFAULT_FILTERS, FILTER_OPTIONS, applyFilters, isArchived } from './maintenance.data';
import I18N from './maintenance.i18n';
import StorageModal, { GridIcon } from './StorageModal';
import TicketCard from './TicketCard';
import TicketModal from './TicketModal';
import useMaintenance from './useMaintenance';

const optionLabels = (t) => ({
  received: { any: t.any, ...t.received },
  promised: { any: t.any, ...t.promised },
  status: { all: t.view.all, ...t.status },
  type: { any: t.any, ...t.type },
  payment: { any: t.any, ...t.payment },
});

export default function MaintenancePage({ lang, title, search }) {
  const t = I18N[lang];
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { tickets, grids, slots, loading, hasMore, loadMore, loadSlots, error, clearError, saveGrid, removeGrid, ...api } = useMaintenance({ filters, search });
  const [editor, setEditor] = useState(false);

  const [storage, setStorage] = useState(null);

  const [current, setCurrent] = useState(now);

  useEffect(() => {
    const id = setInterval(() => setCurrent(now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const labels = optionLabels(t);
  const options = FILTER_OPTIONS;
  const filtered = search.trim() !== '' || Object.keys(DEFAULT_FILTERS).some((k) => filters[k] !== DEFAULT_FILTERS[k]); // nothing found vs nothing there yet
  const visible = useMemo(() => applyFilters(tickets, filters, search, current), [tickets, filters, search, current]);

  // shelf occupancy comes from the server (it knows every open ticket, not just the loaded page); re-read whenever a slot picker opens
  const slotMap = useMemo(() => new Map(slots.map((s) => [s.slot, s.number])), [slots]);
  const pickerOpen = editor || Boolean(storage);
  useEffect(() => { if (pickerOpen) loadSlots(); }, [pickerOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const occupied = useMemo(() => new Set(slotMap.keys()), [slotMap]);
  const pickSlot = (selected, onPick) => setStorage({ selected, onPick });

  const [focus, setFocus] = useState(null);
  const openTicket = async (slot) => {
    const entry = slots.find((s) => s.slot === slot);
    if (!entry) return;
    setStorage(null);
    const ticket = await api.fetchTicket(entry.id); // may not be on a loaded page yet
    if (!ticket) return;
    if (!applyFilters([ticket], filters, search, current).length) setFilters(DEFAULT_FILTERS);
    setFocus((f) => ({ id: ticket.id, n: (f?.n || 0) + 1 }));
  };

  const openById = async (id) => {
    const ticket = await api.fetchTicket(id);
    if (!ticket) return;
    if (!applyFilters([ticket], filters, search, current).length) setFilters(DEFAULT_FILTERS);
    setFocus((f) => ({ id: ticket.id, n: (f?.n || 0) + 1 }));
  };

  const closeEditor = () => setEditor(false);
  const saving = useRef(false);
  const save = async (data) => {
    if (saving.current) return;
    saving.current = true;
    const ticket = await api.add(data);
    saving.current = false;
    if (ticket) closeEditor();
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={BTN} onClick={() => setStorage({})}>
            <GridIcon /> <span className="hidden sm:inline">{t.storage.open}</span>
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={() => setEditor(true)}>
            <Ico name="plus" /> {t.add}
          </button>
        </div>
      </div>

      <ErrorBar error={error} messages={t.err} onClose={clearError} />

      <div className="flex flex-wrap items-center gap-2">
        {Object.keys(options).map((group) => (
          <Dropdown
            key={group}
            label={t.filterLabel[group]}
            value={filters[group]}
            options={options[group].map((value) => ({ value, label: labels[group][value] ?? value }))}
            onChange={(value) => setFilters((f) => ({ ...f, [group]: value }))}
            active={filters[group] !== DEFAULT_FILTERS[group]}
            className="min-w-[200px] flex-1"
            buttonClassName={DD_BUTTON}
            arrowClassName={DD_ARROW}
          />
        ))}
      </div>

      {visible.length ? (
        <ul className="space-y-3">
          {visible.map((ticket, i) => (
            <Fragment key={ticket.id}>

              {i > 0 && !isArchived(visible[i - 1]) && isArchived(ticket) && (
                <li
                  role="separator"
                  className="my-6 border-t-2 border-neutral-400 [[data-theme=dark]_&]:border-neutral-600"
                />
              )}
              <TicketCard ticket={ticket} lang={lang} now={current} api={api} onPickSlot={pickSlot} onOpenTicket={openById} focus={focus?.id === ticket.id ? focus.n : 0} />
            </Fragment>
          ))}
        </ul>
      ) : loading ? (
        <p className="flex items-center justify-center gap-2 p-8 text-center text-sm opacity-70"><Spinner /> {t.list.loading}</p>
      ) : (
        <div className={cx(CARD_SURFACE, 'p-8 text-center')}>
          <p className="font-semibold">{filtered ? t.emptyTitle : t.emptyNone}</p>
          <p className="text-sm opacity-70">{filtered ? t.emptyFoundHint : t.emptyNoneHint}</p>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button type="button" className={BTN} disabled={loading} onClick={loadMore}>{loading && <Spinner />}{loading ? t.list.loading : t.list.more}</button>
        </div>
      )}

      {editor && <TicketModal lang={lang} occupied={occupied} onPickSlot={pickSlot} onSave={save} onClose={closeEditor} />}
      {storage && (
        <StorageModal
          lang={lang} grids={grids} slotMap={slotMap} selected={storage.selected} onPick={storage.onPick} onOpenTicket={openTicket}
          onSave={saveGrid} onRemove={removeGrid} onClose={() => setStorage(null)}
        />
      )}
    </section>
  );
}