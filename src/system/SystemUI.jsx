import { useEffect, useLayoutEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

import Header from "./components/Header";
import MaintenancePage from "./pages/maintenance/MaintenancePage";
import NotesPage from "./pages/notes/NotesPage";
import { start } from "./api/sync";

import {
  write, storageMap, applyTheme, nextTheme, applyLanguage, nextLanguage,
  splitPath, buildPath,
} from "../utils";

const TITLES = { en: "Al-Andalus System", ar: "نظام الأندلس" };

function PageShell({ title, children }) {
  return (
    <section>
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </section>
  );
}

const DashboardPage   = ({ title }) => <PageShell title={title} />;
const DepositoryPage  = ({ title }) => <PageShell title={title} />;

const PAGES = [
  { path: "dashboard",   en: "Dashboard",   ar: "لوحة التحكم", Page: DashboardPage,
    searchHint: { en: "Search Dashboard", ar: "ابحث في لوحة التحكم" } },
  { path: "maintenance", en: "Maintenance", ar: "الصيانة",     Page: MaintenancePage,
    searchHint: { en: "Search Name, Phone Or Ticket", ar: "ابحث بالاسم أو الهاتف أو التذكرة" } },
  { path: "depository",  en: "Depository",  ar: "المخزن",      Page: DepositoryPage,
    searchHint: { en: "Search Products", ar: "ابحث عن منتج" } },
  { path: "notes",       en: "Notes",       ar: "الملاحظات",   Page: NotesPage,
    searchHint: { en: "Search Name Or Phone", ar: "ابحث بالاسم أو الهاتف" } },
];

export default function SystemUI({ lang: initialLang, theme: initialTheme }) {
  const [lang, setLang] = useState(initialLang);
  const [theme, setTheme] = useState(initialTheme);
  const [query, setQuery] = useState("");

  useEffect(() => { start().catch(() => {}); }, []);
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const { base, rest } = splitPath(pathname);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = TITLES[lang];
    applyLanguage(lang);
    write(storageMap.language, lang);

    const url = buildPath(base, lang, rest) + search + hash;
    if (url !== pathname + search + hash) navigate(url, { replace: true });
  }, [lang, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => setQuery(""), [rest]);

  const current = PAGES.find((p) => rest === `/${p.path}`) ?? PAGES[0];

  const home = buildPath(base, lang, `/${PAGES[0].path}`);

  return (
    <div className="app min-h-dvh bg-neutral-200 text-neutral-900 [[data-theme=dark]_&]:bg-neutral-950 [[data-theme=dark]_&]:text-neutral-100">
      <Header
        lang={lang}
        base={base}
        pages={PAGES}
        home={home}
        search={query}
        onSearch={setQuery}
        searchPlaceholder={current.searchHint[lang]}
        onToggleLang={() => setLang(nextLanguage)}
        onToggleTheme={() => setTheme(nextTheme)}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {PAGES.map((page) => (
          <div key={page.path} hidden={page !== current}>
            <page.Page lang={lang} title={page[lang]} search={page === current ? query : ""} />
          </div>
        ))}
        <Routes>
          <Route path={`${base}/${lang}`}>
            <Route path="*" element={PAGES.some((p) => rest === `/${p.path}`) ? null : <Navigate to={home} replace />} />
          </Route>
          <Route path="*" element={null} />
        </Routes>
      </main>
    </div>
  );
}