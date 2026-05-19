import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import { getAdminToken } from "./lib/auth";
import "./index.css";

setAuthTokenGetter(() => getAdminToken());

createRoot(document.getElementById("root")!).render(<App />);
