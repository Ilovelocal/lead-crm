# Lead CRM — AI screenshot import

Single-user CRM for tracking business leads, active subscribers, and
communication history. Upload a screenshot of a Facebook **About** page or a
**Messenger** chat log; Gemini Vision extracts the details and you approve them
before they hit Postgres. Protected by a single password-based admin account.
Installable to your phone's home screen (PWA) and fully mobile-responsive.

## Stack

| Concern   | Choice                                          |
| --------- | ----------------------------------------------- |
| Framework | Next.js 15 (App Router, Server Actions)         |
| Styling   | Tailwind CSS 3 + lucide-react icons             |
| Database  | Postgres via Prisma 6                           |
| AI        | `@google/genai` v2 · `gemini-2.5-flash`         |
| Auth      | Cookie session (JWT via `jose`) + `bcryptjs`    |
| Install   | Web app manifest + apple-touch-icon (PWA)       |

---

## Deployment (web UIs only — no command line)

Flow: **download zip → GitHub (web) → Vercel + Neon**.

### 1. Database — Neon

1. Sign up at https://neon.tech, create a project.
2. Open **SQL Editor**.
3. Open `schema.sql` from this project. **Edit the email and password** at the
   bottom (the `INSERT INTO "users"` block), paste the whole file in, and click
   **Run**. This creates the tables *and* your admin account in one go.
   - The password is hashed inside Postgres with `crypt(... gen_salt('bf'))`,
     which produces a bcrypt hash the app verifies directly — so you pick your
     own password in plain SQL, no CLI or hashing tool needed.
4. Click **Connect**, choose **Prisma** (or "Pooled connection"), copy the
   `DATABASE_URL` (it already has `?sslmode=require`). Save it for step 3.

### 2. Code — GitHub

1. Download the zip from this chat and unzip it.
2. Create a new empty repo on https://github.com.
3. **Add file → Upload files**, drag in everything from the unzipped folder,
   commit. (`.gitignore` keeps junk out.)

### 3. Hosting — Vercel

1. **Add New → Project**, import the repo. Next.js is auto-detected; leave build
   settings at defaults.
2. Add three **Environment Variables**:

   | Name             | Value                                                       |
   | ---------------- | ----------------------------------------------------------- |
   | `DATABASE_URL`   | the Neon string from step 1                                 |
   | `GEMINI_API_KEY` | from https://aistudio.google.com/apikey                     |
   | `AUTH_SECRET`    | any long random string, 32+ chars                           |

3. **Deploy**, then open the URL and sign in with the email/password you set in
   `schema.sql`. Change them anytime from the **Account** button (top-right).

> **About `prisma db push` in the build:** you were right — it *can* run during
> the Vercel build. Set the build command (or `package.json` "build") to
> `prisma generate && prisma db push && next build` and it will sync the schema
> on each deploy. One caveat with Neon: `db push` uses advisory locks and wants
> a **direct (unpooled)** connection, so add a `DIRECT_URL` env (Neon's
> non-`-pooler` host) and `directUrl = env("DIRECT_URL")` to the datasource,
> otherwise it can hang on the pooled URL. Because you're already in Neon's SQL
> editor creating the admin user, running `schema.sql` once is simpler and skips
> that caveat — so that's the default here. Either approach works.

### Install on your phone (Add to Home Screen)

- **iOS (Safari):** open the site → Share → **Add to Home Screen**. Launches
  full-screen with the app icon.
- **Android (Chrome):** open the site → ⋮ menu → **Add to Home screen** /
  **Install app**.

This is a lightweight PWA (manifest + icons, standalone launch). It is **not**
offline-capable — there's no service worker — which matches "just add to home
screen is enough."

---

## Local development (optional, needs Node)

```bash
npm install
cp .env.example .env        # set DATABASE_URL, GEMINI_API_KEY, AUTH_SECRET
# Create tables + admin: run schema.sql against your DB,
# or for an empty schema only: npx prisma db push
npm run dev                 # http://localhost:3000
```

---

## Auth model

- **One admin account, no registration/setup flow.** You create the row directly
  in the database (`schema.sql`). There is no `/setup` route.
- **Sessions** are a signed JWT (`jose`, HS256) in an httpOnly cookie, verified
  in `middleware.ts` on every request. Passwords are hashed with `bcryptjs`
  ($2a$), compatible with the `pgcrypto` hash created in SQL.
- **Middleware** protects every route except `/login` (and the PWA manifest/
  icons), and bounces a signed-in user off `/login`.
- **Account page** (`/account`) edits your email and/or password — current
  password required. The Gemini API route also re-checks the session server-side.
- Rotating `AUTH_SECRET` invalidates existing sessions (you'll sign in again).

## How it works

```
  Sign in (/login)  ──►  middleware verifies cookie on every request
        │
        ▼
  app/page.tsx (server) ── getLeads() ──►  <Dashboard>
        │
   UploadZone ── base64 ──► /api/process-screenshot ── Gemini (JSON schema)
        │                                                     │
        ▼                                                     ▼
   ConfirmModal  ◄──────────────  parsed JSON you review/edit ┘
        │
        ├─ "Facebook About Page" (profile) → createLead()        (new lead)
        └─ "Messenger Chat Log"  (chat)    → createInteraction() (on a lead)
```

A chat screenshot attaches to an existing lead you pick in the modal, so import
an About page first, then log chats against it. The full Gemini response is
saved to `interactions.raw_ai_analysis` (JSONB) for auditing.

## Project layout

```
middleware.ts                       Auth gate (Edge); allows PWA assets
schema.sql                          Paste-into-Neon: tables + admin user
public/                             PWA icons (192 / 512 / maskable / apple)
app/
  manifest.ts                       Web app manifest (/manifest.webmanifest)
  layout.tsx                        Metadata, iOS PWA tags, theme color, viewport
  login/ account/                   Auth pages (no setup)
  api/process-screenshot/route.ts   Gemini Vision endpoint (session-checked)
  actions/auth.ts                   login / logout / updateAccount
  actions/leads.ts                  Lead CRUD (+ Decimal serialization)
  actions/interactions.ts           Interaction create/delete
  page.tsx                          Dashboard (server component)
components/
  LoginForm / AccountForm / UserMenu
  Dashboard / UploadZone / ConfirmModal / PipelineBoard / LeadCard
  LeadSlideOver / StatusBadge
lib/
  session.ts (Edge JWT) · auth.ts (Node hashing/cookies)
  prisma.ts · gemini.ts · constants.ts · types.ts
prisma/schema.prisma                users + leads + interactions
```

## Notes

- **Edge vs Node split:** `lib/session.ts` (jose only) is used by middleware on
  the Edge runtime; `lib/auth.ts` holds the Node-only bcrypt + cookie helpers.
- **Mobile:** the pipeline stacks to one column, the slide-over and modal go
  full-width, inputs are 16px on phones (no iOS zoom-on-focus), and safe-area
  insets keep content clear of the notch/home indicator in standalone mode.
- **Reliable JSON from Gemini:** the route sets `responseMimeType` *and* a
  `responseSchema` — the schema is the bigger lever for clean output.
