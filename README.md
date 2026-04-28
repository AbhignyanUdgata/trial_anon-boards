# Anon Boards — Source Code

## Project Structure

```
anon-boards/
├── index.html                        # App entry point
├── package.json                      # Dependencies
├── vite.config.ts                    # Vite build config
├── postcss.config.mjs                # PostCSS config
├── default_shadcn_theme.css          # shadcn theme variables
│
├── src/
│   ├── main.tsx                      # React root mount
│   ├── styles/                       # Global CSS files
│   ├── imports/                      # Static assets (logo etc.)
│   │
│   └── app/
│       ├── App.tsx                   # ⭐ Main app layout & routing
│       │
│       ├── components/
│       │   ├── BoardCard.tsx         # ⭐ Post card (like, report, delete)
│       │   ├── Sidebar.tsx           # Board navigation sidebar
│       │   ├── ThreadModal.tsx       # Post thread + replies modal
│       │   ├── CreatePostDialog.tsx  # New post form
│       │   ├── AuthModals.tsx        # Login / register forms
│       │   ├── ModeratorPanel.tsx    # ⭐ Mod dashboard (reports, delete)
│       │   ├── figma/                # Figma-generated helpers
│       │   └── ui/                  # shadcn/ui primitives (don't edit)
│       │
│       ├── contexts/
│       │   └── AuthContext.tsx       # ⭐ User auth state + refreshProfile
│       │
│       └── utils/
│           └── api.ts                # ⭐ All Supabase API calls
│
└── supabase/
    └── functions/
        └── make-server-d620122a/
            ├── index.ts              # Entry point — imports all routes
            ├── app.ts                # Hono app setup + helper functions
            ├── kv_store.ts           # Database read/write helpers
            ├── auth.ts               # ⭐ Register, login, profile routes
            ├── posts.ts              # ⭐ Get/create/like/delete posts
            ├── replies.ts            # ⭐ Get/create/delete replies
            ├── boards.ts             # Board list + seed data
            ├── reports.ts            # ⭐ User report submission
            └── moderation.ts         # ⭐ Mod review, remove, dismiss
```

Files marked ⭐ are the ones you'll most likely want to edit.

---

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## Building for production

```bash
npm run build
```

Output goes to `dist/` — push its contents to GitHub Pages.

---

## Deploying the backend

```bash
supabase login
supabase functions deploy make-server-d620122a --project-ref cwhrkfkghiiamasbohdn
```

---

## Making changes

### Add a new board
Edit `boards.ts` → find the `boards/init` route → add your board to the array.

### Change who is a moderator
Edit `moderation.ts` → find the `isMod()` function → add usernames to the list.

### Change like/report limits
Edit `posts.ts` → `REPORT_THRESHOLD` constant controls auto-hide at 50 reports.

### Edit the UI layout
Edit `App.tsx` for the main layout, `BoardCard.tsx` for post cards.

### Edit API calls
All calls to Supabase live in `src/app/utils/api.ts`.
