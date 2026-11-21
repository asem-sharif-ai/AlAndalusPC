import { Fragment, useEffect, useMemo, useState } from 'react';

import Dropdown from '../../components/Dropdown';
import ErrorBar from '../../components/ErrorBar';
import Ico from '../../components/Ico';
import Spinner from '../../components/Spinner';
import { BTN, BTN_PRIMARY, CARD_SURFACE, DD_ARROW, DD_BUTTON } from '../../components/ui';
import { cx, now } from '../../../utils';
import { DEFAULT_FILTERS, FILTER_OPTIONS, applyFilters, isActive } from './notes.data';
import I18N from './notes.i18n';
import NoteCard from './NoteCard';
import NoteModal from './NoteModal';
import useNotes from './useNotes';

const optionLabels = (t) => ({
  status: { ...t.status, ...t.view },
  deadline: { any: t.any, ...t.deadline },
  created: { any: t.any, ...t.created },
  priority: { any: t.any, ...t.priority },
  category: { any: t.any, ...t.category },
});

export default function NotesPage({ lang, title, search }) {
  const t = I18N[lang];
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { notes, loading, hasMore, loadMore, error, clearError, ...api } = useNotes({ filters, search });
  const [editor, setEditor] = useState(null);

  const [current, setCurrent] = useState(now);

  useEffect(() => {
    const id = setInterval(() => setCurrent(now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const labels = optionLabels(t);
  const filtered = search.trim() !== '' || Object.keys(DEFAULT_FILTERS).some((k) => filters[k] !== DEFAULT_FILTERS[k]); // nothing found vs nothing there yet
  const visible = useMemo(() => applyFilters(notes, filters, search, current), [notes, filters, search, current]);

  const closeEditor = () => setEditor(null);
  const remove = async () => {
    if (await api.remove(editor.note.id)) closeEditor();
  };
  const save = async (data) => {
    const done = editor.note ? await api.edit(editor.note.id, data) : await api.add(data);
    if (done) closeEditor();
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <button type="button" className={BTN_PRIMARY} onClick={() => setEditor({ note: null })}>
          <Ico name="plus" /> {t.add}
        </button>
      </div>

      <ErrorBar error={error} messages={t.err} onClose={clearError} />

      <div className="flex flex-wrap items-center gap-2">
        {Object.keys(FILTER_OPTIONS).map((group) => (
          <Dropdown
            key={group}
            label={t.filterLabel[group]}
            value={filters[group]}
            options={FILTER_OPTIONS[group].map((value) => ({ value, label: labels[group][value] }))}
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
          {visible.map((note, i) => (
            <Fragment key={note.id}>

              {i > 0 && isActive(visible[i - 1]) && !isActive(note) && (
                <li
                  role="separator"
                  className="my-6 border-t-2 border-neutral-400 [[data-theme=dark]_&]:border-neutral-600"
                />
              )}
              <NoteCard
                note={note}
                lang={lang}
                now={current}
                api={api}
                onEdit={(n) => setEditor({ note: n })}
              />
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

      {editor && <NoteModal note={editor.note} lang={lang} onSave={save} onDelete={remove} onClose={closeEditor} />}
    </section>
  );
}