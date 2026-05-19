import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || "3000";
const BASE_PATH = (process.env.BASE_PATH || "/").replace(/\/$/, "");

async function main() {
  const app = express();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let vite: any;

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      configFile: path.resolve(__dirname, "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      BASE_PATH || "/",
      express.static(path.join(__dirname, "dist/public"), { index: false })
    );
  }

  // Dynamic sitemap
  app.get(`${BASE_PATH}/sitemap.xml`, async (req, res) => {
    try {
      const internalApi = process.env.INTERNAL_API_URL || "http://localhost:8080";
      const host = req.headers.host || "";
      const proto = req.headers["x-forwarded-proto"] || "https";
      const siteUrl = process.env.SITE_URL || `${proto}://${host}`;

      const [productsRes, catsRes] = await Promise.all([
        fetch(`${internalApi}/api/products`),
        fetch(`${internalApi}/api/categories`),
      ]);
      const products: Array<{ id: number }> = productsRes.ok ? await productsRes.json() : [];
      const cats: Array<{ id: number }> = catsRes.ok ? await catsRes.json() : [];

      const base = BASE_PATH ? `${siteUrl}${BASE_PATH}` : siteUrl;
      const urls = [
        `  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
        ...cats.map(
          (c) =>
            `  <url><loc>${base}/category/${c.id}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
        ),
        ...products.map(
          (p) =>
            `  <url><loc>${base}/product/${p.id}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`
        ),
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

      res.set("Content-Type", "application/xml").send(xml);
    } catch (err) {
      console.error("Sitemap error:", err);
      res.status(500).send("Sitemap generation failed");
    }
  });

  // SSR catch-all (Express 5 requires no wildcard or named wildcard)
  app.use(async (req, res) => {
    try {
      const rawUrl = req.originalUrl;

      const routerUrl =
        BASE_PATH && rawUrl.startsWith(BASE_PATH)
          ? rawUrl.slice(BASE_PATH.length) || "/"
          : rawUrl;
      const cleanUrl = routerUrl.split("?")[0] || "/";

      // Serve plain SPA shell for all routes — no SSR to avoid hydration mismatches
      let template = fs.readFileSync(
        path.resolve(__dirname, isProd ? "dist/public/index.html" : "index.html"),
        "utf-8"
      );
      if (!isProd) template = await vite.transformIndexHtml(rawUrl, template);
      return res.status(200).set({ "Content-Type": "text/html" }).end(
        template.replace("<!--ssr-head-->", "")
      );
    } catch (e) {
      if (!isProd && vite) {
        vite.ssrFixStacktrace(e as Error);
      }
      console.error("SSR error:", e);
      // Fallback: send the plain template so the client can hydrate
      try {
        const template = fs.readFileSync(
          path.resolve(__dirname, isProd ? "dist/public/index.html" : "index.html"),
          "utf-8"
        );
        const transformed = isProd ? template : await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(
          transformed.replace("<!--ssr-head-->", "")
        );
      } catch {
        res.status(500).send((e as Error).stack || "Internal Server Error");
      }
    }
  });

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`SSR server running on port ${PORT}`);
  });
}

main().catch(console.error);
