import Ico from './Ico';

// One shared place for failed saves and loads. `messages` is the page's t.err table.
export default function ErrorBar({ error, messages, onClose }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-700 [[data-theme=dark]_&]:text-red-300">
      <span>{messages[error.code] ?? messages.generic}</span>
      <button type="button" onClick={onClose} aria-label={messages.close} className="grid cursor-pointer place-items-center hover:opacity-70"><Ico name="x" /></button>
    </div>
  );
}
