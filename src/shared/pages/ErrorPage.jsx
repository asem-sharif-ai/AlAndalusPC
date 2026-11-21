import { useEffect, useRef, useState } from "react";
import "./ErrorPage.css";

const PHONE_DISPLAY = "+20 101 005 7162";
const PHONE_HREF = "+201010057162";

function makeIncident() {
  const now = new Date();
  return {
    ref: now.getTime().toString(36).toUpperCase().slice(-6),
    time: now.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

export default function ErrorPage({ error, resetErrorBoundary }) {
  const [incident] = useState(makeIncident);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="fault">
      <header className="fault__bar">
        <span className="fault__brand">Al Andalus Center</span>
        <span className="fault__tag">Service notice</span>
      </header>

      <main className="fault__main">
        <section className="fault__frame" role="alert">
          <span
            className="fault__corner fault__corner--tl"
            aria-hidden="true"
          />
          <span
            className="fault__corner fault__corner--tr"
            aria-hidden="true"
          />
          <span
            className="fault__corner fault__corner--bl"
            aria-hidden="true"
          />
          <span
            className="fault__corner fault__corner--br"
            aria-hidden="true"
          />

          <p className="eyebrow fault__eyebrow">
            <span className="fault__dot" aria-hidden="true" />
            Unexpected error
          </p>

          <h1 className="fault__title" ref={titleRef} tabIndex={-1}>
            This page couldn’t be displayed.
          </h1>

          <p className="fault__lead">
            Something failed while loading this page. Try again, or return to
            the home page. If the problem continues, contact us and quote the
            reference below.
          </p>

          <div className="fault__actions">
            <button type="button" className="btn" onClick={resetErrorBoundary}>
              Try again
            </button>
            <a href="/" className="btn btn-outline">
              Home page
            </a>
          </div>

          <dl className="fault__meta">
            <div>
              <dt>Reference</dt>
              <dd>{incident.ref}</dd>
            </div>
            <div>
              <dt>Logged</dt>
              <dd>{incident.time}</dd>
            </div>
            <div>
              <dt>Support</dt>
              <dd>
                <a href={`tel:${PHONE_HREF}`} dir="ltr">
                  {PHONE_DISPLAY}
                </a>
              </dd>
            </div>
          </dl>

          {import.meta.env.DEV && error?.message && (
            <details className="fault__dev">
              <summary>Technical details (development only)</summary>
              <pre>{error.message}</pre>
            </details>
          )}
        </section>
      </main>

      <footer className="fault__foot">
        <span>Computer &amp; CCTV Services · El-Shohada</span>
        <span>Sat–Thu · 10:00–00:00</span>
      </footer>
    </div>
  );
}
