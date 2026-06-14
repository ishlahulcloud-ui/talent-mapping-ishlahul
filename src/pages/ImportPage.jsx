import { useState } from 'react';
import { CheckCircle2, Upload } from 'lucide-react';
import { dataService } from '../services/dataService.js';
import { Card, ErrorNote, Button, Field } from '../components/ui/index.jsx';

// Admin bulk import (spec §4: import grades/tryouts/consent; do not rebuild
// grade management). Paste CSV with a header row; the backend whitelists which
// tables may be imported and enforces the consent gate.
const TABLES = {
  Students: 'student_id,name,class,academic_year,status',
  Subjects: 'subject_id,name,group',
  Grades: 'student_id,subject_id,semester,score,source',
  Mock_Tests: 'test_id,student_id,date,provider,subtest,score,percentile',
  Skills_Matrix: 'student_id,skill_id,level,source_reference,date',
  Counselor_Notes: 'note_id,student_id,counselor_id,date,note,potential_judgment',
  Consent: 'student_id,student_consent_date,parent_consent_date,consent_scope,withdrawal_date',
};

// Tables not subject to the consent gate (reference data + consent itself).
const UNGATED = new Set(['Students', 'Subjects', 'Consent']);

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
    return obj;
  });
}

export default function ImportPage() {
  const [table, setTable] = useState('Grades');
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = parseCsv(csv);

  async function submit() {
    setBusy(true); setErr(null); setResult(null);
    try {
      const res = await dataService.importRows(table, rows);
      setResult(res); setCsv('');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Impor Data</h2>
        <p className="text-sm text-slate-500">
          Tempel CSV (baris pertama = header).{' '}
          {UNGATED.has(table)
            ? 'Tabel ini data referensi — tidak terkena gerbang consent.'
            : 'Baris siswa tanpa consent akan dilewati otomatis.'}
        </p>
      </div>

      {err && <ErrorNote>{err}</ErrorNote>}
      {result && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {result.imported} baris diimpor{result.skipped_no_consent ? `, ${result.skipped_no_consent} dilewati (tanpa consent)` : ''}.
        </div>
      )}

      <Card>
        <div className="space-y-4">
          <Field label="Tabel tujuan">
            <select value={table} onChange={(e) => { setTable(e.target.value); setResult(null); }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {Object.keys(TABLES).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Data CSV" hint={`Header yang diharapkan: ${TABLES[table]}`}>
            <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              placeholder={TABLES[table] + '\n…'} />
          </Field>
          <div className="flex items-center gap-3">
            <Button onClick={submit} disabled={busy || !rows.length}><Upload className="h-4 w-4" /> {busy ? 'Mengimpor…' : `Impor ${rows.length} baris`}</Button>
            {csv && <span className="text-xs text-slate-400">{rows.length} baris terdeteksi</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
