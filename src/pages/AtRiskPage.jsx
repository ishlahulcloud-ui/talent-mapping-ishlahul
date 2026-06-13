import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { dataService } from '../services/dataService.js';
import { Card, Spinner, ErrorNote, Badge } from '../components/ui/index.jsx';

// At-risk list (spec §12). v1 trigger: latest readiness band Low. Flags are
// prompts for a counselor conversation — never automatic messages.
export default function AtRiskPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { dataService.atRisk().then(setRows).catch((e) => setErr(e.message)); }, []);

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!rows) return <Spinner />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Perlu Perhatian</h2>
        <p className="text-sm text-slate-500">Daftar ini adalah pengingat untuk percakapan dengan guru BK, bukan pesan otomatis ke siswa.</p>
      </div>
      <Card>
        {rows.length ? (
          <ul className="divide-y divide-slate-100">
            {rows.map((s) => (
              <li key={s.student_id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  <div>
                    <div className="font-medium text-slate-700">{s.name} <span className="text-slate-400">({s.class})</span></div>
                    <div className="text-xs text-slate-500">{s.category} · {s.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-rose-100 text-rose-700 border-rose-200">{s.reason}</Badge>
                  <Link to={`/students/${s.student_id}`} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800">Detail <ChevronRight className="h-4 w-4" /></Link>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-400">Tidak ada siswa berstatus perlu perhatian saat ini.</p>}
      </Card>
    </div>
  );
}
