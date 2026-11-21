import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { SpriteIcon } from '../../shared/components/Icon';
import { TextInput } from './TextField';
import { buildPath, cx } from '../../utils';

const LOGO_MASK = 'url(/system.svg) center / contain no-repeat';

const ACTIVE = 'bg-emerald-900 text-white';

const HEADER = 'sticky top-0 z-40 border-b border-emerald-950 bg-emerald-800 text-neutral-100';

const ICON_BTN = cx(
  'grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors',
  'hover:bg-emerald-900 hover:text-white',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300',
);

const NAV_LINK = cx(
  'block rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
  'hover:bg-emerald-900 hover:text-white',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300',
);

const SEARCH_INPUT = cx(
  'h-10 w-full rounded-full border border-white/10 bg-emerald-950/35 px-4 text-sm font-medium',
  'text-neutral-100 placeholder:font-normal placeholder:text-neutral-300/60',
  'shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)] outline-none',
  'transition-[background-color,border-color,box-shadow] duration-200',
  'focus:border-emerald-300/60 focus:bg-emerald-950/50',
  'focus:shadow-[inset_0_1px_3px_rgb(0_0_0/0.35),inset_0_0_0_1px_rgb(110_231_183/0.25)]',
  '[&::-webkit-search-cancel-button]:appearance-none',
);

const SEARCH_MOTION = 'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

const findVisible = (root, selector) =>
  Array.from(root?.querySelectorAll(selector) ?? []).find((el) => el.offsetParent !== null);

function IconButton({ icon, className, ...props }) {
  return (
    <button type="button" className={cx(ICON_BTN, className)} {...props}>
      <SpriteIcon name={icon} className="size-[22px]" />
    </button>
  );
}

function Brand({ to }) {
  return (
    <Link className="shrink-0" to={to} aria-label="Al-Andalus System Brand">
      <span className="relative block h-10">
        <img src="/system.svg" alt="" className="invisible h-10" />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-current"
          style={{ WebkitMask: LOGO_MASK, mask: LOGO_MASK }}
        />
      </span>
    </Link>
  );
}

function NavLinks({ className, onNavigate, pages, base, lang }) {
  return (
    <nav className={className} dir="auto" aria-label="Main" data-ar-aria-label="القائمة الرئيسية">
      <ul className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
        {pages.map(({ path, en, ar }) => (
          <li key={path}>
            <NavLink
              to={buildPath(base, lang, `/${path}`)}
              onClick={onNavigate}
              data-ar={ar}
              className={({ isActive }) => cx(NAV_LINK, isActive && ACTIVE)}
            >
              {en}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Actions({ className, lang, searching, search, onSearch, searchPlaceholder, onToggleSearch, onToggleTheme, onToggleLang }) {
  return (
    <div className={cx('items-center gap-2', className)}>
      <div
        className={cx(
          'flex min-w-0 items-center justify-end transition-[flex-grow,gap] md:grow-0',
          SEARCH_MOTION,
          searching ? 'grow gap-2' : 'grow-0 gap-0',
        )}
      >
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className={cx(
            'w-0 min-w-0 overflow-hidden transition-[flex-grow,width,opacity,filter,visibility]',
            SEARCH_MOTION,
            searching ? 'visible grow opacity-100 blur-0 md:w-64' : 'invisible grow-0 opacity-0 blur-sm',
          )}
        >
          <TextInput
            emptyDir={lang === 'ar' ? 'rtl' : 'ltr'}
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={SEARCH_INPUT}
          />
        </form>
        <IconButton
          icon="search-toggle"
          className={cx('search-btn', searching && ACTIVE)}
          style={{ '--search': searching ? 1 : 0 }}
          onClick={onToggleSearch}
          aria-expanded={searching}
          aria-label={searching ? 'Close search' : 'Search'}
          data-ar-aria-label={searching ? 'إغلاق البحث' : 'بحث'}
        />
      </div>

      <span className="h-6 w-px bg-current" aria-hidden="true" />

      <div className="flex items-center gap-1">
        <IconButton
          icon="theme-toggle"
          onClick={onToggleTheme}
          aria-label="Switch theme"
          data-ar-aria-label="تغيير المظهر"
        />
        <IconButton
          icon="language-toggle"
          className="lang-btn"
          onClick={onToggleLang}
          aria-label="Switch language"
          data-ar-aria-label="تغيير اللغة"
        />
      </div>
    </div>
  );
}

export default function Header({ lang, base, pages, home, search, onSearch, searchPlaceholder, onToggleLang, onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const headerRef = useRef(null);
  const wasSearching = useRef(false);

  useEffect(() => {
    if (!menuOpen && !searching) return;

    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (searching) setSearching(false);
      else setMenuOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, searching]);

  useEffect(() => {
    if (searching) {
      findVisible(headerRef.current, 'input[type="search"]')?.focus({ preventScroll: true });
    } else {
      onSearch('');
      if (wasSearching.current) findVisible(headerRef.current, '.search-btn')?.focus({ preventScroll: true });
    }
    wasSearching.current = searching;
  }, [searching, onSearch]);

  const closeAll = () => {
    setMenuOpen(false);
    setSearching(false);
  };

  const toggleSearch = () => setSearching((value) => !value);

  const toggleMenu = () => {
    setMenuOpen((value) => !value);
    setSearching(false);
  };

  const navProps = { pages, base, lang, onNavigate: closeAll };
  const actionsProps = { lang, searching, search, onSearch, searchPlaceholder, onToggleSearch: toggleSearch, onToggleTheme, onToggleLang };

  return (
    <header ref={headerRef} dir="ltr" className={HEADER}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand to={home} />
        <NavLinks className="hidden md:block" {...navProps} />
        <Actions className="hidden md:flex" {...actionsProps} />
        <IconButton
          icon="menu-toggle"
          className={cx('md:hidden', menuOpen && ACTIVE)}
          style={{ '--menu': menuOpen ? 1 : 0 }}
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          aria-label="Menu"
          data-ar-aria-label="القائمة"
        />
      </div>

      <div
        id="primary-nav"
        className={cx(
          'grid transition-[grid-template-rows] duration-200 md:hidden',
          menuOpen ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 border-t border-emerald-950 px-4 py-3">
            <Actions className="flex justify-center" {...actionsProps} />
            <NavLinks {...navProps} />
          </div>
        </div>
      </div>
    </header>
  );
}
