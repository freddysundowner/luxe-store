import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";

export async function render(url: string) {
  const helmetContext: Record<string, unknown> = {};

  let appHtml = "";
  try {
    appHtml = renderToString(
      <HelmetProvider context={helmetContext}>
        <App ssrUrl={url} />
      </HelmetProvider>
    );
  } catch {
    appHtml = "";
  }

  const { helmet } = helmetContext as {
    helmet?: {
      title: { toString(): string };
      meta: { toString(): string };
      link: { toString(): string };
    };
  };

  const head = helmet
    ? `${helmet.title.toString()}\n${helmet.meta.toString()}\n${helmet.link.toString()}`
    : "";

  return { html: appHtml, head };
}
