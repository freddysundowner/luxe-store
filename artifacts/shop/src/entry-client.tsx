import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

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
      splash.classList.add("hidden");
      splash.addEventListener("transitionend", () => splash.remove(), { once: true });
    }
  });
});
