# Backend — Google Apps Script

Container-bound script on the project spreadsheet. Files: `Code.gs` (router/auth/audit), `Endpoints.gs` (feature logic), `Scoring.gs` (v1 engine), `Setup.gs` (bootstrap/seed).

## Deploy

1. Create a Google Sheet (the project data layer), owned by the **script/service account**, not a personal admin account.
2. Extensions → Apps Script. Paste the four `.gs` files.
3. Script Properties (Project Settings → Script Properties):
   - `GIS_CLIENT_ID` — the OAuth client id used by the frontend (staff sign-in).
   - `AUDIT_SPREADSHEET_ID` — id of a **separate** spreadsheet for audit logs (spec v1.1 §15). Optional; falls back to an `Audit_Logs` tab in the bound sheet.
4. Run `setupSheets()` once to create all tabs. Optionally `seedDemo()` for fictional test data (student `S001`, PIN `1234`). **Never seed against real data.**
5. Deploy → New deployment → Web app → Execute as **me**, Access **Anyone**. Copy the `/exec` URL into the frontend's `VITE_GAS_URL`.

## Transport contract

All calls are `POST` with `Content-Type: text/plain` and a JSON body:

```json
{ "action": "getStudent", "token": "<session token>", "payload": { "student_id": "S001" } }
```

`login` is the only action that needs no token. `text/plain` keeps the request a CORS "simple request" (no preflight) **and** keeps student data out of the URL/logs.

## Roles enforced server-side

`admin, principal, bk, wali_kelas, teacher, student`. Each route declares allowed roles in `ROUTES` (Code.gs). The counselor approval gate lives in `getReport_`: a student only ever receives a plan that has an `approval_date`.
