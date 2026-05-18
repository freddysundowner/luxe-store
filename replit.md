# My Drop Shop

A WhatsApp-style ecommerce storefront for selling dropshipping and own products, with a full admin panel.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/shop run dev` — run the shop frontend (port 24349)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `ADMIN_PASSWORD` — Admin panel password (default: `admin123`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB schema (categories.ts, products.ts, settings.ts)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/shop/src/` — React frontend

## Architecture decisions

- WhatsApp-style green theme, mobile-first layout
- Cart is client-side state; checkout sends a WhatsApp message with the order
- Admin auth uses a simple password stored in `ADMIN_PASSWORD` env var (default: `admin123`)
- Products have `isDropship` flag to distinguish dropshipping vs own inventory
- Store settings (WhatsApp number, currency, store name) are managed via the admin panel

## Product

- **Customer store**: Browse products by category, search, view details, add to cart, checkout via WhatsApp
- **Admin panel**: `/admin` — manage products, categories, store settings, view dashboard stats

## User preferences

- Simple and easy, WhatsApp store style
- Mobile-friendly
- Admin section for product/category/price management

## Gotchas

- Change the admin password by setting the `ADMIN_PASSWORD` environment variable (default is `admin123`)
- WhatsApp checkout builds a `wa.me` URL — set the correct WhatsApp number in Admin > Settings
- Always run codegen after changing `openapi.yaml`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
