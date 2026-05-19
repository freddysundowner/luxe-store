import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { setAuthTokenGetter, setUnauthorizedHandler } from "@workspace/api-client-react";
import App from "./App";
import { getAdminToken, removeAdminToken } from "./lib/auth";
import "./index.css";

// Attach the admin bearer token (if signed in) to every API request so
// /admin/* endpoints can be authenticated. Public endpoints simply ignore it.
setAuthTokenGetter(() => getAdminToken());

// When any API call returns 401, the admin session has expired (e.g. the API
// restarted and rotated its signing secret). Clear the stale token and bounce
// the user to the login screen so admin pages don't render a misleading
// "no data" state.
setUnauthorizedHandler(() => {
  if (typeof window === "undefined") return;
  if (!getAdminToken()) return;
  removeAdminToken();
  if (window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin") {
    window.location.replace("/admin");
  }
});

const root = createRoot(document.getElementById("root")!);

root.render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Dismiss the branded splash once React has painted
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("splash-out");
      splash.addEventListener("transitionend", () => splash.remove(), { once: true });
    }
  });
});
