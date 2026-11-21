export const stripMarks = (s) => String(s).replace(/\*\*(.+?)\*\*/g, '$1');

export default function RichLine({ text }) {
  return String(text)
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => (i % 2 ? <b key={i} className="font-semibold not-italic">{part}</b> : part));
}
