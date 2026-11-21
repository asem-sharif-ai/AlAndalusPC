import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "react-error-boundary";

import "./App.css";
import App from "./App.jsx";
import ErrorPage from "./shared/pages/ErrorPage.jsx";

// import sprite from "./assets/icons.svg?raw";
// document.body.insertAdjacentHTML("afterbegin", sprite);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <HelmetProvider>
        <BrowserRouter>
          <Suspense fallback={null}>
            <App />
          </Suspense>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);
