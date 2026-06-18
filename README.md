# Lead CRM — OCR screenshot import

Single-user CRM for tracking business leads, active subscribers, and
communication history. Upload a screenshot of a Facebook **About** page or a
**Messenger** chat log; the app reads the text **on your device** with OCR
(Tesseract.js) and pre-fills the form, which you review before saving to
Postgres. No AI service, no API keys. Installable to your phone's home screen
(PWA) and fully mobile-responsive.

## Stack

| Concern   | Choice                                          |
| --------- | ----------------------------------------------- |
| Framework | Next.js 15 (App Router, Server Actions)         |
| Styling   | Tailwind CSS 3 + lucide-react icons             |
| Database  | Postgres via Prisma 6                           |
| OCR       | Tesseract.js (in-browser, free, no key)         |
| Auth      | Cookie session (JWT via `jose`) + `bcryptjs`    |
| Install   | Web app manifest + apple-touch-icon (PWA)       |

> Newer majors exist (Tailwind 4, Prisma 7, Next 16). This scaffold pins the
> previous, fully-coherent majors so it runs without config rewrites.

---

## Deployment (web UIs only — no command line)

Flow: **download zip → GitHub (web) → Vercel + Neon**.

### 1. Database — Neon

1. Sign up at https://neon.tech, create a project.
2. Open **SQL Editor**.
3. Open `schema.sql`. **Edit the email and password** at the bottom (the
   `INSERT INTO "users"` block), paste the whole file in, **Run**. This creates
   the tables *and* your admin account.
   - The password is hashed inside Postgres with `crypt(... gen_salt('bf'))`,
     producing a bcrypt hash the app verifies directly — so you pick your own
     password in plain SQL, no hashing tool needed.
4. **Connect** → choose **Prisma** (or "Pooled connection"), copy the
   `DATABASE_URL` (already has `?sslmode=require`). Save it for step 3.

### 2. Code — GitHub

1. Download the zip and unzip it.
2. Create a new empty repo on https://github.com.
3. **Add file → Upload files**, drag in everything from the unzipped folder,
   commit.

### 3. Hosting — Vercel

1. **Add New → Project**, import the repo. Next.js auto-detected; defaults are
   fine.
2. Add **two** Environment Variables (that's all — there is no AI key):

   | Name           | Value                                  |
   | -------------- | -------------------------------------- |
   | `DATABASE_URL` | the Neon string from step 1            |
   | `AUTH_SECRET`  | any long random string, 32+ chars      |

3. **Deploy**, open the URL, sign in with the email/password from `schema.sql`.
   Change them anytime from the **Account** button (top-right).

> **`prisma db push` in the build?** It can run via the build command
> (`prisma generate && prisma db push && next build`). With Neon, `db push`
> wants a **direct (unpooled)** connection — add a `DIRECT_URL` env and
> `directUrl = env("DIRECT_URL")` to the datasource, or it can hang on the
> pooled URL. Since you're already in Neon's SQL editor for the admin user,
> running `schema.sql` once is simpler, so that's the default.

### Install on your phone (Add to Home Screen)

- **iOS (Safari):** Share → **Add to Home Screen**.
- **Android (Chrome):** ⋮ menu → **Add to Home screen** / **Install app**.

Lightweight PWA (manifest + icons, standalone launch). Not offline-capable
(no service worker), which matches "just add to home screen is enough."

---

## Local development (optional, needs Node)

```bash
npm install
cp .env.example .env        # set DATABASE_URL and AUTH_SECRET
# Create tables + admin: run schema.sql against your DB,
# or for an empty schema only: npx prisma db push
npm run dev                 # http://localhost:3000
```

---

## How it works

```
  Sign in (/login)  ──►  middleware verifies cookie on every request
        │
        ▼
  app/page.tsx (server) ── getLeads() ──►  <Dashboard>
        │
   UploadZone ── reads text in your browser (Tesseract.js) ──► parsed fields
        │
        ▼
   ConfirmModal  ◄── you review/edit the parsed fields
        │
        ├─ "Facebook About Page" → createLead()        (new lead)
        └─ "Messenger Chat Log"  → createInteraction() (logged on a lead)
```

OCR runs entirely on the device — the image never leaves the browser. The first
scan downloads Tesseract's language data (~a few MB), then it's cached.

### The two screenshot types

| Dropdown label      | What OCR does                                              |
| ------------------- | --------------------------------------------------------- |
| Facebook About Page | Reads the text, then pulls out email / phone / website by |
|                     | pattern; you confirm the business name. → **new lead**    |
| Messenger Chat Log  | Reads the conversation text into the summary box for you  |
|                     | to trim/rewrite. → **new interaction** on a chosen lead   |

OCR has no understanding of meaning, so: it does **not** summarize chats (you
edit the raw text), and the business name often needs a quick correction (OCR
can't tell which line is the name). Email, phone, and website are usually
caught because they have recognizable patterns. You review everything before it
saves, so imperfect reads are easy to fix.

A chat screenshot attaches to an existing lead you pick in the modal, so import
an About page first, then log chats against it. The raw OCR text is also stored
in `interactions.raw_ai_analysis` (JSONB) for reference.

## Project layout

```
middleware.ts                       Auth gate (Edge); allows PWA assets
schema.sql                          Paste-into-Neon: tables + admin user
public/                             PWA icons (192 / 512 / maskable / apple)
app/
  manifest.ts                       Web app manifest (/manifest.webmanifest)
  layout.tsx                        Metadata, iOS PWA tags, theme color, viewport
  login/ account/                   Auth pages
  actions/auth.ts                   login / logout / updateAccount
  actions/leads.ts                  Lead CRUD (+ Decimal serialization)
  actions/interactions.ts           Interaction create/delete
  page.tsx                          Dashboard (server component)
components/
  UploadZone.tsx                    Browser OCR + image downscaling
  ConfirmModal.tsx                  Review/edit parsed fields before saving
  LoginForm / AccountForm / UserMenu
  Dashboard / PipelineBoard / LeadCard / LeadSlideOver / StatusBadge
lib/
  ocr.ts                            Tesseract OCR + field parsing (client)
  session.ts (Edge JWT) · auth.ts (Node hashing/cookies)
  prisma.ts · constants.ts · types.ts
prisma/schema.prisma                users + leads + interactions
```

## Notes

- **No keys / no AI:** there is no `GEMINI_API_KEY` or any AI credential. Removing
  the AI also removed the `/api/process-screenshot` route — OCR is client-side.
- **Mobile:** the pipeline stacks to one column, slide-over and modal go
  full-width, inputs are 16px on phones (no iOS zoom), and safe-area insets keep
  content clear of the notch/home indicator in standalone mode.
- **Improving OCR accuracy:** clear, high-contrast, zoomed-in screenshots read
  best. If you later want smarter extraction or chat summaries back, the OCR
  step in `lib/ocr.ts` / `UploadZone.tsx` is the only thing that would change.
