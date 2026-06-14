import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { dataService } from '../services/dataService.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card, Spinner, ErrorNote, Button, Field } from '../components/ui/index.jsx';
import { SKILLS } from '../services/mockData.js';

// In-app tryout score entry (Skills_Matrix rows 1-6), so tryout results no
// longer need CSV import. Level 1-5 per subtest; the operator maps the raw
// subtest score to a level using the season's cut points (parameters/v1.md).
const SUBTESTS = [1, 2, 3, 4, 5, 6];

export default function TryoutEntryPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState(null);
  const [err, setErr] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [provider, setProvider] = useState('');
  const [levels, setLevels] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const load = user.role === 'teacher' ? dataService.myStudents() : dataService.listStudents();
    load.then(setStudents).catch((e) => setErr(e.message));
  }, [user.role]);

  const anyLevel = SUBTESTS.some((i) => levels[i]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await dataService.saveTryout({ student_id: studentId, date, provider, levels });
      setDone(true); setStudentId(''); setLevels({});
      setTimeout(() => setDone(false), 2500);
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  if (err && !students) return <ErrorNote>{err}</ErrorNote>;
  if (!students) return <Spinner />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Input Skor Tryout</h2>
        <p className="text-sm text-slate-500">Level 1–5 per subtes SNBT. Pakai cut point musim ini untuk memetakan skor mentah ke level. Mengisi Skills Matrix yang dipakai readiness & nine-box.</p>
      </div>

      {done && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Skor tryout tersimpan.
        </div>
      )}
      {err && <ErrorNote>{err}</ErrorNote>}

      <Card>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Siswa">
              <select required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">— pilih siswa —</option>
                {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name} ({s.class})</option>)}
              </select>
            </Field>
            <Field label="Tanggal tryout">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </Field>
            <Field label="Penyelenggara">
              <input value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="mis. Tryout internal" />
            </Field>
          </div>

          <div className="space-y-3">
            {SUBTESTS.map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700">{i}. {SKILLS[i]}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button type="button" key={v} onClick={() => setLevels({ ...levels, [i]: v })}
                      className={`h-9 w-9 rounded-lg border text-sm font-medium ${levels[i] === v ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button type="submit" disabled={!studentId || !anyLevel || busy}>{busy ? 'Menyimpan…' : 'Simpan skor tryout'}</Button>
        </form>
      </Card>
    </div>
  );
}
