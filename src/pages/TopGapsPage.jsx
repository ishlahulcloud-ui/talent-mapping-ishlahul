import { useEffect, useState } from 'react';
import { dataService } from '../services/dataService.js';
import { SKILLS } from '../services/mockData.js';
import { Card, Spinner, ErrorNote } from '../components/ui/index.jsx';

// Most common level ≤ 2 skills across the cohort (spec §12). Points
// remediation hours and tryout-review sessions at the right topics.
export default function TopGapsPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { dataService.topGaps().then(setRows).catch((e) => setErr(e.message)); }, []);

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!rows) return <Spinner />;

  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Gap Tersering</h2>
        <p className="text-sm text-slate-500">Skill dengan level ≤ 2 terbanyak di kohort. Arahkan jam remediasi ke sini.</p>
      </div>
      <Card>
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.skill_id} className="flex items-center gap-3">
                <div className="w-48 shrink-0 text-sm text-slate-600">{SKILLS[r.skill_id] || `Skill ${r.skill_id}`}</div>
                <div className="h-3 flex-1 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-rose-400" style={{ width: `${(r.count / max) * 100}%` }} />
                </div>
                <div className="w-10 text-right text-sm font-semibold text-slate-700">{r.count}</div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">Belum ada gap level ≤ 2 tercatat.</p>}
      </Card>
    </div>
  );
}
