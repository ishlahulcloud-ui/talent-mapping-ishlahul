import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { dataService } from '../services/dataService.js';
import { Card, Spinner, ErrorNote, Badge, Button, Field } from './ui/index.jsx';
import { PROGRESS_STYLE } from '../constants/recommendation.js';

// Monthly intervention review / progress loop (Blueprint Module E). BK and
// wali kelas record monthly status; progress_response is derived server-side
// from nine-box readiness movement.
export default function MonthlyReviewCard({ studentId, canEdit }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ academic_status: '', readiness_update: '', priority_weakness: '', assigned_drills: '', counselor_action: '', parent_note: '', next_target: '' });

  function load() { dataService.getMonthlyReviews(studentId).then(setRows).catch((e) => setErr(e.message)); }
  useEffect(load, [studentId]);

  async function submit() {
    setBusy(true);
    try { await dataService.saveMonthlyReview({ student_id: studentId, ...form }); setAdding(false); setForm({ academic_status: '', readiness_update: '', priority_weakness: '', assigned_drills: '', counselor_action: '', parent_note: '', next_target: '' }); load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Card title="Review bulanan & progres" action={canEdit && !adding ? <Button variant="secondary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Tambah</Button> : null}>
      {err && <ErrorNote>{err}</ErrorNote>}
      {adding && (
        <div className="mb-4 space-y-3 rounded-lg border border-slate-100 p-3">
          {[['academic_status', 'Status akademik'], ['readiness_update', 'Update kesiapan'], ['priority_weakness', 'Kelemahan prioritas'], ['assigned_drills', 'Drill yang ditugaskan'], ['counselor_action', 'Tindakan konselor'], ['parent_note', 'Catatan untuk ortu'], ['next_target', 'Target berikutnya']].map(([k, label]) => (
            <Field key={k} label={label}>
              <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </Field>
          ))}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan review'}</Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Batal</Button>
          </div>
        </div>
      )}
      {!rows ? <Spinner /> : !rows.length ? (
        <p className="text-sm text-slate-400">Belum ada review bulanan.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={i} className="rounded-lg border border-slate-100 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">{r.date}</span>
                {r.progress_response && <Badge className={PROGRESS_STYLE[r.progress_response] || 'bg-slate-100 text-slate-600 border-slate-200'}>Progres: {r.progress_response}</Badge>}
              </div>
              {r.academic_status && <p className="mt-1 text-slate-600">Akademik: {r.academic_status}</p>}
              {r.readiness_update && <p className="text-slate-600">Kesiapan: {r.readiness_update}</p>}
              {r.assigned_drills && <p className="text-slate-500">Drill: {r.assigned_drills}</p>}
              {r.next_target && <p className="text-slate-500">Target: {r.next_target}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
