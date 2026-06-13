# Deployment Guide

> **Gate first.** Do not point the live app at real student data until the Stage 0 sign-off (`../docs/stage0-signoff.md`) is complete: leadership approval, consent collected, legal/UU-PDP review, and snpmb.id verification. The steps below are safe to do earlier against an empty or demo-seeded spreadsheet.

## Order of operations

```
1. Backend (Sheets + Apps Script)  →  2. Frontend (Vercel)  →  3. Smoke test  →  4. Go-live with real data (after gates)
```

## 1. Backend — Google Sheets + Apps Script

1. Create the data spreadsheet, owned by a **dedicated/service account**, not a personal admin login.
2. (Recommended) Create a **second** spreadsheet for audit logs; copy its id.
3. Push the script. Either paste the four `.gs` files + `appsscript.json` in the Apps Script editor, or use clasp:
   ```bash
   npm i -g @google/clasp
   clasp login
   cp apps-script/.clasp.json.example apps-script/.clasp.json   # set scriptId
   clasp push                                                   # from apps-script/
   ```
4. Project Settings → **Script Properties**:
   - `GIS_CLIENT_ID` = OAuth client id used by the frontend.
   - `AUDIT_SPREADSHEET_ID` = id from step 2 (optional but recommended).
5. Run `setupSheets()` once. For a demo, also run `seedDemo()` (fictional data only).
6. Deploy → New deployment → **Web app** → Execute as **me**, Access **Anyone**. Copy the `/exec` URL.

## 2. Frontend — Vercel

1. Push `talent-mapping-ma/` to a Git repo and import it in Vercel (framework auto-detected as Vite; `vercel.json` handles SPA rewrites).
2. Environment variables (Production):
   - `VITE_GAS_URL` = the `/exec` URL from step 1.6
   - `VITE_GIS_CLIENT_ID` = same client id as `GIS_CLIENT_ID`
   - `VITE_USE_MOCK` = `false`
3. Deploy.

## 3. Smoke test (against demo data)

- Staff login (Google) reaches the dashboard; `runScoring` populates nine-box.
- Student login (NISN + PIN) reaches My Map and sees **only an approved** plan.
- Admin import accepts a small CSV and reports skipped-no-consent correctly.
- Audit rows appear in the audit spreadsheet.

## 4. Go-live checklist (after Stage 0 gates)

- [ ] Stage 0 sign-off complete (`../docs/stage0-signoff.md`)
- [ ] `seedDemo()` data removed; spreadsheet holds only consented real students
- [ ] `VITE_USE_MOCK=false` confirmed in Production
- [ ] Backup routine for the spreadsheet confirmed
- [ ] First monthly cycle dates scheduled

## Notes

- Reference scoring implementation is `../scoring/engine.py` (+ `test_engine.py`). `apps-script/Scoring.gs` must stay in sync with it and with `../parameters/v1.md`.
- Transport is POST `text/plain` (no preflight, no student data in URLs) — see `apps-script/README.md`.
