# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint via next lint
```

There are no tests. No test runner is configured.

## Environment Variables

Required in `.env.local` for local dev, and set in Vercel for production:

```
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD=          # plain text or bcrypt hash
CLOUDINARY_CLOUD_NAME=djctexvnr
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=           # from resend.com dashboard
EMAIL_FROM=              # e.g. Marcaclub <orders@yourdomain.com>
EMAIL_USER=              # used as replyTo on customer emails (optional)
```

## Architecture

Next.js 14 App Router, TypeScript, MongoDB via Mongoose, deployed on Vercel.

### Route Groups

- `src/app/(store)/` — public storefront with its own `layout.tsx` that fetches Settings from DB server-side and passes them to Navbar, Footer, AnnouncementBar, LiveBanner, and WhatsAppButton. The header is a single `fixed` container stacking AnnouncementBar + LiveBanner + Navbar, with a spacer div below whose height is calculated dynamically.
- `src/app/admin/` — admin panel, all pages are client components. Auth is checked via NextAuth session. Layout handled by `src/components/admin/AdminLayoutClient.tsx` which renders the sidebar nav.
- `src/app/api/` — REST API routes: `orders`, `orders/[id]`, `products`, `products/[id]`, `settings`, `upload`, `live`, `reports`, `auth/[...nextauth]`.

### Data Models (`src/lib/models/`)

- **Product** — name, description, price, images (Cloudinary URLs), sizes (array of `{size, stock}`), category, featured flag
- **Order** — orderNumber, customer (`{name, phone, city, address, email}`), items, total, status (`pending | confirmed | shipped | delivered | cancelled`), createdAt
- **Settings** — singleton document (always `findOne()`): liveStatus, liveUrl, heroTitle, heroSubtitle, announcementBar, announcementActive, instagramUrl, tiktokUrl, whatsappNumber, emailNote, contactEmail, contactPhone

Settings are saved with find + `Object.assign` + `.save()` pattern, never `findOneAndUpdate`, to avoid Mongoose deprecation issues.

### Auth

Single admin user only. Credentials (email + password) stored in env vars. Supports plain-text password or bcrypt hash. Session strategy is JWT. All admin API routes check `getServerSession(authOptions)` and return 401 if missing.

### Image Uploads

Images upload via `POST /api/upload` to Cloudinary (cloud: `djctexvnr`). The upload route uses the Cloudinary Node SDK directly, not the upload widget.

### Cart

Zustand store with `persist` middleware, stored in localStorage under key `marcaclub-cart`. Always select `items` from the store and compute count reactively — never select `count` (a function reference) directly, as it won't trigger re-renders.

### Email (`src/lib/utils/email.ts`)

Uses the **Resend** SDK (`resend` npm package). Set `RESEND_API_KEY` in env. `EMAIL_FROM` must be a sender address on a domain verified in the Resend dashboard (e.g. `Marcaclub <orders@yourdomain.com>`). `EMAIL_USER` is used as `replyTo` on customer emails.

Three exported functions:
- `sendOrderConfirmationEmail(order, emailNote?)` — sent when order is placed; tells customer an agent will call to confirm
- `sendOrderStatusEmail(order, status)` — sent when admin changes status; handles confirmed/shipped/delivered/cancelled. Delivered email includes an Arabic thank-you block.
- `sendAdminOrderNotification(order)` — sent to `ADMIN_EMAIL` on new order

All email sends should be `await`ed (or at minimum `.catch`ed) — do not fire-and-forget silently.

### Revenue Calculation

Only orders with status `confirmed`, `shipped`, or `delivered` count toward chiffre d'affaires. `pending` and `cancelled` are excluded everywhere (dashboard, reports page).

### Key Patterns

- Pages that must not be cached: add `export const dynamic = 'force-dynamic'`
- Admin settings page uses stable `onChange` handlers defined via a `set(key)` factory outside the JSX — never define input components inside the render function or inputs will lose focus on every keystroke
- Image slider uses `[[imgIdx, dir], setImg]` state tuple with Framer Motion `AnimatePresence` — no `mode` prop
