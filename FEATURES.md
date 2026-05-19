# Luxe Store — Feature Overview

A luxury-themed, WhatsApp-and-TikTok-inspired e-commerce platform. Customers discover products through a vertical full-screen feed or classic grid, send gifts that recipients "unwrap" on a custom claim page, and pay via M-Pesa STK-push or finalise on WhatsApp. Admins run the entire shop — products, bundles, orders, gifts, payments, email — from a single dashboard.

---

## Customer-Facing Features

### Discovery & Browsing
- **TikTok-style discovery feed** — vertically scrollable, full-screen product cards with scrims, gold accents and a "drop" favouriting icon.
  - Hold-to-pause (WhatsApp-Status style)
  - Segmented progress bars for multi-image products
  - Keyboard navigation (↑ / ↓)
- **Classic grid browsing** with sidebar filters: categories, price tiers, availability tags ("In Stock", "New Arrival", "Bestseller", "Sale", "Gifts only" …).
- **Instant search** across the catalogue.
- **Product detail page** with image gallery, variant picker (size / colour with independent pricing & stock), Instagram-style auto-rotating gallery progress bar, and "Related Products" suggestions.
- **Favourites / Saved list** — bookmark products to a personal list (kept in a global context).

### Gift Bundles ("Hampers")
- Bundle products (`kind="bundle"`) are first-class catalogue items — they appear in the grid, swiper and feed alongside regular products.
- When a bundle has no cover image, a **stylised gold gift-box graphic** renders on every surface, with component-item photos peeking out of the box.
- Dedicated **"What's in this bundle"** section on the product detail page, listing every component product with its image, name and quantity.

### Cart & Checkout
- **Cart drawer** with quantity controls and variant breakdown.
- **WhatsApp checkout** — generates a pre-filled order summary and opens it directly in WhatsApp to message the shop.
- **M-Pesa STK-push** — native mobile payment via SunPay.
  - Live "Global M-Pesa Modal" shows phone input → pending PIN → success / failure, auto-clears the cart on completion.
- **Quick Buy** — skip the cart: pick variant + quantity in a dialog and jump straight to M-Pesa or WhatsApp.

### Gifting Flow
- **Surprise Concierge (AI Gift Finder)** — chat-based assistant that recommends products based on occasion, relationship and budget.
  - "Build a Hamper" mode lets the customer bundle several items into one gift during the chat.
- **Gift Sheet** — send any product (or a multi-item gift) with recipient name, sender name and a personal note.
- **Gift Reveal page** (`/gifts/:token`) — a polished, branded experience for the recipient:
  - Wrapped-gift state with a tap-to-open gold gift box and animated unwrap (rising gold bubbles, particles, twinkling stars).
  - Revealed state with staggered "reveal-step" animations on every block — header, product card, item list, note, paid badge and footer.
  - Ornate gold corner brackets around the product card, serif typography, gold glow shadow.
  - "A note for you" callout with the sender's personal message.
  - "Paid in full · Luxe will be in touch" badge — the recipient never re-checks-out.
  - **Self-healing claim links** — the page recovers gracefully from expired or malformed tokens.

---

## Admin Features

### Dashboard
- High-level KPIs: total products, active vs draft, out of stock, revenue, recent orders.

### Catalogue Management
- **Products** — full CRUD with rich form (multi-image gallery, image-fit settings, SEO fields, availability tags, categories).
- **Variants** — independent pricing and stock per option (size / colour / etc).
- **Bundles** — toggle a product to `kind="bundle"` and pick its component products and quantities; bundle stock is **auto-derived** from the availability of its components (no manual sync).
- **Bulk actions** — multi-select products to update stock, activate/draft, feature/unfeature in one click.
- **Categories** — create, edit, reorder.
- **Availability tags** — manage badges like "New Arrival", "Limited Edition", "Bestseller" that appear on storefront cards.

### Orders & Payments
- **Orders log** — every M-Pesa transaction and WhatsApp checkout attempt, with status, amount, customer phone and timestamp.
- **Gift management** — list of all sent gifts, status (pending / paid / claimed), manual "mark as paid" override, and copy/open claim links for sharing outside the normal flow.

### Settings & Integrations
- **Store identity** — store name, description, logo, currency.
- **Localisation** — custom price tiers for the "Budget" filter.
- **WhatsApp checkout** — target phone number for incoming orders.
- **M-Pesa (SunPay)** — API credentials for STK-push integration.
- **Email (Brevo)** — automated order receipts to customers and sales notifications to staff.
- **AI Gift Finder** — powered server-side via OpenAI / Anthropic.

---

## Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TailwindCSS (`artifacts/shop`) |
| Backend | Express 5 + Drizzle ORM (`artifacts/api-server`) |
| Database | PostgreSQL |
| API contract | OpenAPI + Orval-generated typed client |
| Payments | M-Pesa STK-push (SunPay), WhatsApp manual |
| Messaging | WhatsApp deep links (`wa.me`) |
| Email | Brevo transactional API |
| AI | OpenAI / Anthropic (server-side) |
| Monorepo | pnpm workspaces |
