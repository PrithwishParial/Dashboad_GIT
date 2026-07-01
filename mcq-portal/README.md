# BLUELIGHT ACADEMY — MCQ Exam Portal + Admin Dashboard

## What's in here

- `index.html` — the exam page students take. It now loads questions
  dynamically from the admin-managed store instead of a hardcoded list.
- `admin.html` — the admin dashboard. Log in, then add/edit/delete
  questions. Changes save instantly and show up on the exam page right away.
- `netlify/functions/`
  - `login.js` — checks the admin username/password and issues a session token.
  - `questions.js` — the CRUD API (`GET` list, `POST` create, `PUT` update, `DELETE` remove).
  - `_shared/auth.js` — signs/verifies session tokens (built-in Node crypto, no extra library).
- `netlify.toml` / `package.json` — deployment config and the one dependency (`@netlify/blobs`).

## 1. Set your admin username & password

Open `netlify/functions/login.js` and edit these two lines near the top:

```js
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';            // <-- change this
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';     // <-- change this
```

**More secure option (recommended once you're live):** instead of editing the
file, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` as environment variables in
Netlify (Site configuration → Environment variables). If those are set, they
override the hardcoded values automatically and your real password never sits
in your git history.

Also open `netlify/functions/_shared/auth.js` and change `SESSION_SECRET` to
your own long random string (or set a `SESSION_SECRET` environment variable
in Netlify) — this is what makes login tokens un-forgeable.

## 2. Where the data lives

Questions are stored in **Netlify Blobs** — a JSON storage layer built into
Netlify itself. There's no SQL, no separate database to provision, and no
extra account to create. It's created automatically the first time the
dashboard saves a question, and it persists across deploys.

## 3. Deploy to Netlify

**Option A — connect a Git repo (recommended):**
1. Push this folder to a GitHub/GitLab/Bitbucket repo.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Build settings: leave the build command empty, publish directory `.` (already set in `netlify.toml`).
4. Deploy. Netlify will detect `netlify/functions` automatically and install `@netlify/blobs` from `package.json`.

**Option B — Netlify CLI, no git required:**
```bash
npm install -g netlify-cli
netlify login
netlify init      # or: netlify link, if the site already exists
netlify deploy --prod
```
(Drag-and-drop deploy on the Netlify dashboard will **not** work here, because
that method skips building functions — use A or B instead.)

## 4. Using the dashboard

Visit `yoursite.netlify.app/admin.html`, log in, and add your questions. Each
question needs: question text, 2+ options, and which option is correct.
Image URL and caption are optional. The exam page (`index.html`) pulls the
live list every time someone opens it — no redeploy needed after edits.

## Known limitation — worth knowing

The exam is scored in the browser, so the correct answers are present in the
JSON the browser downloads before a student starts. This matches how the
original exam worked and is fine for practice quizzes or low-stakes
assessments. If this is ever used for a proctored/graded exam where students
must not be able to see answers by inspecting network traffic, the fix is to
move scoring into a serverless function (student submits answers, server
returns the score) — happy to build that version if you need it.
