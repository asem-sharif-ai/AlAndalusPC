export const storageMap = {
    language: 'language',
    theme:    'theme',
};

export const read = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
};

export const write = (key, value) => {
    try { localStorage.setItem(key, value); } catch { return null; }
};

// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------

const LANGUAGES = ["en", "ar"];
const ATTRIBUTES = [
  "title", "placeholder", "alt",
  "label", "value", "summary", "data-tooltip",
  "aria-label", "aria-description", "aria-valuetext",
];

export function splitPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  let base = "";
  if (parts[0] === "system") { base = "/system"; parts.shift(); }
  let lang = null;
  if (LANGUAGES.includes(parts[0])) lang = parts.shift();
  return { base, lang, rest: "/" + parts.join("/") };
}

export const buildPath = (base, lang, rest = "/") =>
  `${base}/${lang}${rest === "/" ? "" : rest}`;

export function detectLanguage(path) {
  const p = splitPath(path.pathname).lang;
  const b = navigator.language?.slice(0, 2);
  const s = read(storageMap.language);
  return [p, b, s].find((x) => LANGUAGES.includes(x)) || LANGUAGES[0];
}

export function applyLanguage(l) {
  if (!LANGUAGES.includes(l)) l = LANGUAGES[0];
  const def = LANGUAGES[0];
  const others = LANGUAGES.slice(1);

  const textSelector = others.map((x) => `[data-${x}]`).join(",");
  document.querySelectorAll(textSelector).forEach((el) => {
    if (!el.hasAttribute(`data-${def}`)) el.setAttribute(`data-${def}`, el.textContent);
    el.textContent = el.getAttribute(`data-${l}`) ?? el.getAttribute(`data-${def}`);
  });

  ATTRIBUTES.forEach((attr) => {
    const attrSelector = others.map((x) => `[data-${x}-${attr}]`).join(",");
    document.querySelectorAll(attrSelector).forEach((el) => {
      const src = `data-${def}-${attr}`;
      if (!el.hasAttribute(src)) el.setAttribute(src, el.getAttribute(attr) ?? "");
      el.setAttribute(attr, el.getAttribute(`data-${l}-${attr}`) ?? el.getAttribute(src));
    });
  });
}

export function nextLanguage(l) {
  return l === "ar" ? "en" : "ar";
}

// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------

const systemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export function detectTheme() {
  const stored = read(storageMap.theme);
  return stored === "dark" || stored === "light" ? stored : systemTheme();
}

export function applyTheme(t, animate = false) {
  const root = document.documentElement;

  if (animate) {
    root.classList.add("theme-transition");
    clearTimeout(applyTheme._timer);
    applyTheme._timer = setTimeout(
      () => root.classList.remove("theme-transition"),
      1000
    );
  }

  if (t) {
    root.setAttribute("data-theme", t);
    write(storageMap.theme, t);
  } else {
    root.removeAttribute("data-theme");
  }
}

export function nextTheme(t) {
  return (t ?? systemTheme()) === "dark" ? "light" : "dark";
}

// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------

export const cx = (...classes) => classes.filter(Boolean).join(' ');

export const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

const pad = (n) => String(n).padStart(2, '0');

function parseDate(s) {
  const [date, time = '00:00'] = s.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toDateTimeStr = (d) => `${toDateStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const now = () => toDateTimeStr(new Date());

export function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function addTime(s, { days = 0, hours = 0 }) {
  const d = parseDate(s);
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return toDateTimeStr(d);
}

export const isTomorrow = (s, from) => s.slice(0, 10) === addDays(from.slice(0, 10), 1);

export const minutesBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 60000);

export function formatDate(s, lang) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric", month: "short", year: "numeric",
    ...(s.includes("T") && { hour: "numeric", minute: "2-digit" }),
  }).format(parseDate(s));
}