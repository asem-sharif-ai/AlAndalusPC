const RTL_CHAR = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const FIRST_LETTER = /\p{L}/u;

// Same rule as dir="auto": first strong (letter) character decides, otherwise the page direction.
export function detectDir(value, fallback) {
  const letter = String(value ?? '').match(FIRST_LETTER)?.[0];
  if (letter) return RTL_CHAR.test(letter) ? 'rtl' : 'ltr';
  return fallback ?? document.documentElement.dir ?? 'ltr';
}

const resolveDir = (dir, emptyDir, value) => (String(value ?? '') === '' ? emptyDir : dir);

export function TextInput({ dir = 'auto', emptyDir, value, ...props }) {
  return <input dir={resolveDir(dir, emptyDir, value)} value={value} {...props} />;
}

export function TextArea({ dir = 'auto', emptyDir, value, ...props }) {
  return <textarea dir={resolveDir(dir, emptyDir, value)} value={value} {...props} />;
}
