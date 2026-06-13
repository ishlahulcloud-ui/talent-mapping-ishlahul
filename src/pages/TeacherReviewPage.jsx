import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { dataService } from '../services/dataService.js';
import { Card, Spinner, ErrorNote, Button, Field } from '../components/ui/index.jsx';

// Indicator order matches the rubric (forms/teacher-review-form.md).
const INDICATORS = [
  ['subject_mastery', 'Penguasaan materi'],
  ['learning_consistency', 'Konsistensi belajar'],
  ['assignment_completion', 'Penyelesaian tugas'],
  ['critical_thinking', 'Berpikir kritis'],
  ['motivation', 'Motivasi'],
  ['exam_readiness', 'Kesiapan ujian'],
];

export default function TeacherReviewPage() {
  const [students, setStudents] = useState(null);
  const [err, setErr] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [scores, setScores] = useState({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    dataService.myStudents().then(setStudents).catch((e) => setErr(e.message));
  }, []);

  const complete = studentId && INDICATORS.every(([k]) => scores[k]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await dataService.saveReview({ student_id: studentId, subject_id: subject, indicators: scores, evidence_note: note });
      setDone(true);
      setStudentId(''); setScores({}); setNote('');
      setTimeout(() => setDone(false), 2500);
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!students) return <Spinner />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Penilaian Siswa</h2>
        <p className="text-sm text-slate-500">Skala 1–5 per indikator. Target &lt; 3 menit per siswa. Catatan bebas opsional dan tidak ikut dihitung.</p>
      </div>

      {done && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Penilaian tersimpan.
        </div>
      )}

      <Card>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Siswa">
              <select required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">— pilih siswa —</option>
                {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name} ({s.class})</option>)}
              </select>
            </Field>
            <Field label="Mata pelajaran">
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="mis. Matematika" />
            </Field>
          </div>

          <div className="space-y-3">
            {INDICATORS.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700">{label}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button type="button" key={v} onClick={() => setScores({ ...scores, [key]: v })}
                      className={`h-9 w-9 rounded-lg border text-sm font-medium ${scores[key] === v ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Field label="Catatan bukti (opsional)">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </Field>

          <Button type="submit" disabled={!complete || busy}>{busy ? 'Menyimpan…' : 'Simpan penilaian'}</Button>
        </form>
      </Card>
    </div>
  );
}
