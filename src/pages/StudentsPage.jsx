import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';
import { dataService } from '../services/dataService.js';
import { Card, Spinner, ErrorNote, Badge } from '../components/ui/index.jsx';
import { READINESS_STYLE } from '../constants/roles.js';

const INTERVENTION = {
  none: { label: '—', cls: 'text-slate-400' },
  draft: { label: 'Draf', cls: 'text-amber-600' },
  planned: { label: 'Direncanakan', cls: 'text-indigo-600' },
  in_progress: { label: 'Berjalan', cls: 'text-indigo-600' },
  done: { label: 'Selesai', cls: 'text-emerald-600' },
  stalled: { label: 'Macet', cls: 'text-rose-600' },
};

export default function StudentsPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    dataService.classView().then(setRows).catch((e) => setErr(e.message));
  }, []);

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!rows) return <Spinner />;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Siswa</h2>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-500">
              <th className="pb-2 font-medium">Nama</th>
              <th className="pb-2 font-medium">Kelas</th>
              <th className="pb-2 font-medium">Kesiapan</th>
              <th className="pb-2 font-medium">Intervensi</th>
              <th className="pb-2 font-medium">Consent</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const style = s.readiness_band ? READINESS_STYLE[s.readiness_band] : null;
              const iv = INTERVENTION[s.intervention_status] || INTERVENTION.none;
              return (
                <tr key={s.student_id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 font-medium text-slate-700">
                    <span className="inline-flex items-center gap-1.5">
                      {s.at_risk && <AlertTriangle className="h-4 w-4 text-rose-500" title="Perlu perhatian" />}
                      {s.name}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">{s.class}</td>
                  <td className="py-3">{style ? <Badge className={style.cls}>{style.label}</Badge> : <span className="text-slate-400">—</span>}</td>
                  <td className={`py-3 ${iv.cls}`}>{iv.label}</td>
                  <td className="py-3">
                    {s.consent ? <span className="text-emerald-600">Ada</span>
                      : <span className="flex items-center gap-1 text-rose-500"><AlertCircle className="h-4 w-4" /> Belum</span>}
                  </td>
                  <td className="py-3 text-right">
                    <Link to={`/students/${s.student_id}`} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
                      Detail <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
