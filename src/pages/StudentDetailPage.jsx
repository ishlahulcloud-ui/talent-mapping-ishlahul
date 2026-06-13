import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Printer } from 'lucide-react';
import { dataService } from '../services/dataService.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card, Spinner, ErrorNote, Badge, Button, Field } from '../components/ui/index.jsx';
import { READINESS_STYLE } from '../constants/roles.js';
import SkillMatrixTable from '../components/SkillMatrixTable.jsx';

export default function StudentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [bundle, setBundle] = useState(null);
  const [err, setErr] = useState(null);

  function load() {
    Promise.all([
      dataService.getStudent(id),
      dataService.getMatrix(id),
      dataService.getNineBox(id),
      dataService.getReport(id),
    ]).then(([student, matrix, nineBox, report]) => setBundle({ student, matrix, nineBox, report }))
      .catch((e) => setErr(e.message));
  }
  useEffect(load, [id]);

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!bundle) return <Spinner />;

  const { student, matrix, nineBox, report } = bundle;
  const nb = nineBox.current;
  const isBK = user.role === 'bk';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/students" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <Link to={`/students/${id}/report`} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
          <Printer className="h-4 w-4" /> Cetak laporan
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{student.profile.name}</h2>
          <p className="text-sm text-slate-500">Kelas {student.profile.class} · {student.profile.academic_year}</p>
        </div>
        {nb?.readiness_band && (
          <Badge className={READINESS_STYLE[nb.readiness_band].cls}>{READINESS_STYLE[nb.readiness_band].label}</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Skills matrix">
          <SkillMatrixTable rows={matrix} />
        </Card>

        <Card title="Nine-box (staf)">
          {nb ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-lg font-semibold text-slate-800">{nb.category}</div>
                <div className="text-slate-500">Perf {nb.performance_band} ({nb.performance_score}) · Potensi {nb.potential_band} ({nb.potential_score})</div>
              </div>
              {nineBox.previous && (
                <p className="text-slate-500">Sebelumnya ({nineBox.previous.date}): {nineBox.previous.category}</p>
              )}
              <p className="text-xs text-slate-400">Parameter {nb.parameters_version} · {nb.date}</p>
            </div>
          ) : <p className="text-sm text-slate-400">Belum ada penempatan. Jalankan skoring dari Dashboard.</p>}
        </Card>

        <Card title="Minat jurusan" className="lg:col-span-2">
          {student.interests.length ? (
            <ol className="space-y-1 text-sm">
              {student.interests.map((it) => (
                <li key={it.rank}><span className="font-medium">{it.rank}. {it.major}</span> {it.university && <span className="text-slate-500">— {it.university}</span>} {it.reason && <span className="text-slate-400">({it.reason})</span>}</li>
              ))}
            </ol>
          ) : <p className="text-sm text-slate-400">Belum ada minat tercatat.</p>}
        </Card>

        <div className="lg:col-span-2">
          <ReportCard report={report} isBK={isBK} studentId={id} gaps={matrix.filter((r) => r.level <= 2)} onChange={load} />
        </div>
      </div>
    </div>
  );
}

function ReportCard({ report, isBK, studentId, gaps = [], onChange }) {
  const plan = report.plan;
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(() => ({
    weekly_targets: plan?.weekly_targets || '',
    major_shortlist: plan?.major_shortlist || '',
    narrative: plan?.narrative || '',
  }));
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    try { await dataService.approveReport({ plan_id: plan.plan_id, student_id: studentId, ...form }); onChange(); setEditing(false); }
    finally { setBusy(false); }
  }

  async function createDraft() {
    setBusy(true);
    try { await dataService.saveReport({ student_id: studentId, ...form }); onChange(); setCreating(false); }
    finally { setBusy(false); }
  }

  function startCreate() {
    // Seed the draft from computed gaps so BK edits rather than starts blank.
    const gapNames = gaps.map((g) => `skill ${g.skill_id}`).join(', ');
    setForm({
      weekly_targets: gaps.length ? `Latihan terarah pada gap: ${gapNames}` : '',
      major_shortlist: '',
      narrative: '',
    });
    setCreating(true);
  }

  return (
    <Card
      title="Laporan rekomendasi"
      action={report.approved
        ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Disetujui</Badge>
        : plan
          ? <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="mr-1 h-3.5 w-3.5" /> Draf — belum disetujui</Badge>
          : null}
    >
      {!plan ? (
        isBK && creating ? (
          <div className="space-y-3">
            <Field label="Target mingguan">
              <textarea value={form.weekly_targets} onChange={(e) => setForm({ ...form, weekly_targets: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </Field>
            <Field label="Shortlist jurusan">
              <textarea value={form.major_shortlist} onChange={(e) => setForm({ ...form, major_shortlist: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </Field>
            <Field label="Narasi">
              <textarea value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </Field>
            <div className="flex gap-2">
              <Button onClick={createDraft} disabled={busy}>Simpan draf</Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>Batal</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Belum ada draf rencana.</p>
            {isBK && <Button onClick={startCreate}>Buat draf dari gap</Button>}
          </div>
        )
      ) : isBK && editing ? (
        <div className="space-y-3">
          <Field label="Target mingguan">
            <textarea value={form.weekly_targets} onChange={(e) => setForm({ ...form, weekly_targets: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </Field>
          <Field label="Shortlist jurusan">
            <textarea value={form.major_shortlist} onChange={(e) => setForm({ ...form, major_shortlist: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </Field>
          <Field label="Narasi">
            <textarea value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </Field>
          <div className="flex gap-2">
            <Button variant="success" onClick={approve} disabled={busy}>Setujui & rilis</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Batal</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-slate-700">
          <p><span className="font-medium">Target mingguan:</span> {plan.weekly_targets}</p>
          <p><span className="font-medium">Shortlist jurusan:</span> {plan.major_shortlist}</p>
          <p><span className="font-medium">Narasi:</span> {plan.narrative}</p>
          <p className="text-xs text-slate-400">Ini adalah opsi untuk didiskusikan dengan guru BK, bukan prediksi kelulusan.</p>
          {isBK && !report.approved && (
            <Button className="mt-2" onClick={() => setEditing(true)}>Review & setujui</Button>
          )}
        </div>
      )}
    </Card>
  );
}
