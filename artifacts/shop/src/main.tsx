import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setUnauthorizedHandler } from "@workspace/api-client-react";
import App from "./App";
import { getAdminToken, removeAdminToken } from "./lib/auth";
import "./index.css";

setAuthTokenGetter(() => getAdminToken());

setUnauthorizedHandler(() => {
  if (typeof window === "undefined") return;
  if (!getAdminToken()) return;
  removeAdminToken();
  if (window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin") {
    window.location.replace("/admin");
  }
});

createRoot(document.getElementById("root")!).render(<App />);
