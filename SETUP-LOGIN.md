# Student Login & Progress — Setup Guide

This adds real student accounts and saved progress to the Tech4Good site using
**Supabase** (a free hosted database + auth service). The site stays on GitHub
Pages — Supabase is reached entirely from the browser, so there's no server to run.

Kids log in with just their **first name + last name + 4-digit PIN** — no email, no class code required.

You only have to do this **once**. Budget ~15 minutes.

> **Already set up an earlier version?** The class-code idea was removed, and the name
> field was split into **first name** and **last name**. Just re-run the updated
> `supabase-schema.sql` (Step 2) — it adds the `first_name` / `last_name` columns and
> drops the old `class_code` column and `classes` table for you.
>
> ⚠️ Because the login identity no longer includes a class code, **any accounts made
> before this change can't log in** and should be recreated (Authentication → Users →
> delete the old test users).

---

## What's already been built

| File | What it does |
|------|--------------|
| `supabase-schema.sql` | The database tables + security rules. You paste this into Supabase. |
| `js/t4g-auth.js` | The login/progress logic. **You paste 2 keys into the top of this file.** |
| `login.html` / `signup.html` | The student login + sign-up screens. |
| `profile.html` | A student's progress dashboard (badges earned, % complete). |
| `interactivelesson.html` | The Warm-Up — now saves each badge to the logged-in student. |

---

## Step 1 — Create a free Supabase project

1. Go to **https://supabase.com** and sign up (free tier is plenty for a class).
2. Click **New project**. Give it a name (e.g. `tech4good`), set a database password
   (save it somewhere), pick a region near Ghana (e.g. West EU), and create it.
3. Wait ~2 minutes for it to finish provisioning.

## Step 2 — Create the tables

1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase-schema.sql` from this repo, copy the **whole file**, paste it in.
3. Click **Run**. You should see "Success". This creates the `profiles` table (with
   `first_name` / `last_name`) and the security rules — and cleans up the old
   `classes` table / `class_code` column if you set up an earlier version.

## Step 3 — Turn OFF email confirmation ⚠️ (important)

Because students sign up with a made-up email (built from their name), Supabase must
not try to send confirmation emails — or logins will silently fail.

1. Go to **Authentication** → **Sign In / Providers** (or **Providers**) → **Email**.
2. Find **"Confirm email"** and **turn it OFF**. Save.

## Step 4 — Paste your keys into the site

1. Go to **Project Settings** (gear icon) → **API**.
2. Copy two values:
   - **Project URL** — looks like `https://abcdxyz.supabase.co`
   - **anon public** key — a long string under "Project API keys"
3. Open `js/t4g-auth.js` and replace the placeholders at the top:

   ```js
   const SUPABASE_URL      = 'https://abcdxyz.supabase.co';   // your Project URL
   const SUPABASE_ANON_KEY = 'eyJhbGciOi...';                 // your anon public key
   ```

   > The anon key is **safe to put in a public site** — it can only do what the
   > security rules (Row Level Security) allow, which is: read/write *your own*
   > profile row. Never paste the `service_role` key here.

## Step 5 — Publish

Commit and push as usual — GitHub Pages redeploys `tech4good.live`:

```bash
git add .
git commit -m "Add student login and progress tracking"
git push
```

## Step 6 — Test it

1. Visit `https://tech4good.live/signup.html`.
2. Enter your first and last name and a 4-digit PIN → **Create account**.
3. You land on your **profile** page. Open the **Warm-Up**, scroll through a couple
   of lessons — badges light up. Reload, or log in on another device → progress is
   still there.

---

## Running the Warm-Up

### See everyone's progress (teacher view)
In Supabase → **SQL Editor**, run:

```sql
select first_name, last_name,
       jsonb_array_length(badges) as badges_earned,
       badges, updated_at
from public.profiles
order by badges_earned desc, updated_at desc;
```

### Reset a student who forgot their PIN
In **Authentication → Users**, find the student (their email is
`firstname.lastname@students.tech4good.live`, e.g.
`ama.owusu@students.tech4good.live`) and delete them, then let them sign up again.
(Their old badges go with the deleted row.)

---

## How it works (for your own reference)

- **Login without email:** the student's first name + last name become a synthetic
  email (`ama.owusu@students.tech4good.live`) and the PIN becomes the password. The kid
  never sees this — they just type their first & last name and PIN. Because email
  confirmation is off, the synthetic email never needs to receive anything.
- **Progress:** each earned badge key (`l1`, `l2`, `l6`, `practice`, `careers`,
  `gallery`) is appended to a `badges` array on the student's `profiles` row.
- **Security:** Row Level Security means each logged-in student can only read and
  write their **own** row. Signed-out visitors can still read the lessons; they just
  can't save progress.

## Security notes & trade-offs

- This is scoped to a **kids' learning tracker**, not sensitive data. A 4-digit PIN
  plus a guessable name is *low* security — fine for badges, not for anything private.
  Don't store personal information beyond a display name.
- No student email addresses are collected (good for minors).
- If you later want stronger accounts (password reset, real email), switch
  `signup.html` / `login.html` to Supabase's built-in email/password flow — the
  `profiles` table and progress code stay the same.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Login is not set up yet" on submit | You haven't pasted your keys in `js/t4g-auth.js` (Step 4). |
| Sign-up says "…turn OFF Confirm email…" | Do Step 3, then try again. |
| "That first and last name is already taken" | Someone with that exact name already signed up — add a middle initial to the last name. |
| Nav still shows "Log in" after signing in | Hard-refresh the page; check the browser console for `[T4G]` errors. |
