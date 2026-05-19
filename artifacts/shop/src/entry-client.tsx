import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import { getAdminToken } from "./lib/auth";
import "./index.css";

// Attach the admin bearer token (if signed in) to every API request so
// /admin/* endpoints can be authenticated. Public endpoints simply ignore it.
setAuthTokenGetter(() => getAdminToken());

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
