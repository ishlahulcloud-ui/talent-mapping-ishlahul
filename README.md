# talent-mapping-ma

MVP for the **AMANAH Career & UTBK Readiness Map** (MA Ishlahul Amanah). Implements the five MVP features from the design spec: student profile, teacher review, skills matrix, nine-box classification, and the recommendation report with a counselor approval gate.

Design documents (spec v1.1, parameters, rubric, mapping, consent) live one level up in the `Ishlahul Student Talent Mapping` kit.

> **Not production yet.** Per spec §0/§14 and §15, live deployment is gated on leadership sign-off, consent collection, legal/data-protection review (UU PDP 27/2022), and snpmb.id verification. This repo is the build; deployment follows those gates.

## Stack

React 18 + Vite + Tailwind v4 (frontend, Vercel) · Google Apps Script + Google Sheets (backend). Patterns reused from the school's finance/teacher-admin apps; the one deliberate change is the request transport (see below).

## Run locally (mock mode — no backend needed)

```bash
npm install
cp .env.example .env   # VITE_USE_MOCK=true is the default
npm run dev
```

Mock logins:
- Staff: `bk@example.sch.id`, `hadi@example.sch.id` (wali XII-A), `kepala@example.sch.id`, `rina@example.sch.id` (guru)
- Student: NISN `S001`, PIN `1234`

## Connect to the real backend

1. Deploy `apps-script/` (see `apps-script/README.md`).
2. Set `VITE_GAS_URL` to the `/exec` URL, `VITE_GIS_CLIENT_ID` to the OAuth client id, and `VITE_USE_MOCK=false`.

## Architecture notes

- **Transport:** `src/api/client.js` POSTs `text/plain` JSON to GAS — a CORS simple request (no preflight) that keeps student data out of URLs/logs (spec v1.1 §13.2, §15). UI never calls it directly; everything goes through `src/services/dataService.js`.
- **Roles** (`admin, principal, bk, wali_kelas, teacher, student`) are guarded in the router *and* enforced server-side in every GAS route.
- **Counselor gate:** students only ever receive a plan that carries an `approval_date`; enforced in `getReport_`.
- **Scoring** is in `apps-script/Scoring.gs`, a direct port of `../scoring/engine.py` (the Python file plus `test_engine.py` is the reference of record).
