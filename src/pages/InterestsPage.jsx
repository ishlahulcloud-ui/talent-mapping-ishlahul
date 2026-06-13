import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { dataService } from '../services/dataService.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card, Spinner, ErrorNote, Button, Field } from '../components/ui/index.jsx';

const EMPTY = { major: '', university: '', reason: '' };
const THREE = () => [{ ...EMPTY }, { ...EMPTY }, { ...EMPTY }];
const padTo3 = (arr) => { const r = THREE(); arr.forEach((x, i) => { if (i < 3) r[i] = { major: x.major, university: x.university || '', reason: x.reason || '' }; }); return r; };

// Student self-report of up to 3 ranked major/PTN interests (spec §4).
// Aspirations are data, not commitments.
export default function InterestsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState(THREE());
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    dataService.getStudent(user.user_id)
      .then((d) => { if (d.interests?.length) setRows(padTo3(d.interests)); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [user.user_id]);

  function update(i, key, val) { setRows(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r))); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await dataService.saveInterests(user.user_id, rows.filter((r) => r.major.trim()));
      setDone(true); setTimeout(() => setDone(false), 2500);
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Minat Jurusan Saya</h2>
        <p className="text-sm text-slate-500">Isi hingga 3 pilihan terurut. Ini bahan diskusi dengan guru BK, bukan keputusan akhir.</p>
      </div>
      {done && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Minat tersimpan.
        </div>
      )}
      {err && <ErrorNote>{err}</ErrorNote>}
      <Card>
        <form onSubmit={submit} className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-slate-100 p-4">
              <div className="mb-3 text-sm font-medium text-slate-600">Pilihan {i + 1}{i === 0 ? '' : ' (opsional)'}</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Jurusan">
                  <input value={rows[i]?.major || ''} onChange={(e) => update(i, 'major', e.target.value)} required={i === 0}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="mis. Manajemen" />
                </Field>
                <Field label="Perguruan tinggi">
                  <input value={rows[i]?.university || ''} onChange={(e) => update(i, 'university', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="mis. UNPAD" />
                </Field>
                <Field label="Alasan singkat">
                  <input value={rows[i]?.reason || ''} onChange={(e) => update(i, 'reason', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </Field>
              </div>
            </div>
          ))}
          <Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan minat'}</Button>
        </form>
      </Card>
    </div>
  );
}
