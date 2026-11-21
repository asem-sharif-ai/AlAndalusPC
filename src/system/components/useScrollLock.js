import { useLayoutEffect } from 'react';

let locks = 0;
let saved = null;

export default function useScrollLock() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (locks++ === 0) {
      const bar = window.innerWidth - html.clientWidth;
      saved = {
        htmlOverflow: html.style.overflow, htmlOverscroll: html.style.overscrollBehavior,
        bodyOverflow: body.style.overflow, bodyPad: body.style.paddingInlineEnd,
      };
      html.style.overflow = 'hidden';
      html.style.overscrollBehavior = 'none';
      body.style.overflow = 'hidden';
      if (bar > 0) body.style.paddingInlineEnd = `${bar}px`;
    }
    return () => {
      if (--locks === 0 && saved) {
        html.style.overflow = saved.htmlOverflow;
        html.style.overscrollBehavior = saved.htmlOverscroll;
        body.style.overflow = saved.bodyOverflow;
        body.style.paddingInlineEnd = saved.bodyPad;
        saved = null;
      }
    };
  }, []);
}
