import { useLocation } from "react-router-dom";
import { detectLanguage, detectTheme, splitPath } from "./utils";

import sprite from "./assets/icons.svg?raw";
document.body.insertAdjacentHTML("afterbegin", sprite);

import SystemUI from "./system/SystemUI";
import WebsiteUI from "./website/WebsiteUI";

export default function App() {
  const host = window.location.hostname;
  const location = useLocation();
  const { base, rest } = splitPath(location.pathname);
  const lang = detectLanguage(location);
  const theme = detectTheme();

  return host.startsWith("system.") || base === "/system"
    ? <SystemUI host={host} lang={lang} theme={theme} route={rest} />
    : <WebsiteUI host={host} lang={lang} theme={theme} route={rest} />;
}