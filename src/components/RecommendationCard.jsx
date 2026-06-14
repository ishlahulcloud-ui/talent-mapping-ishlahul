import { useEffect, useState } from 'react';
import { dataService } from '../services/dataService.js';
import { Card, Spinner, ErrorNote, Badge } from './ui/index.jsx';
import { FIT_STYLE, READINESS_LEVEL_STYLE } from '../constants/recommendation.js';

// Cluster fit + readiness recommendation (Blueprint Module D). Staff-facing
// advisory: the BK reads it and turns it into a draft plan that still goes
// through the approval gate. Output follows the "Top 3 + backup + exploration"
// rule so the system never overclaims a single major.
export default function RecommendationCard({ studentId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    dataService.getRecommendation(studentId).then(setData).catch((e) => setErr(e.message));
  }, [studentId]);

  if (err) return <Card title="Rekomendasi jurusan (cluster fit)"><ErrorNote>{err}</ErrorNote></Card>;
  if (!data) return <Card title="Rekomendasi jurusan (cluster fit)"><Spinner /></Card>;

  return (
    <Card title="Rekomendasi jurusan (cluster fit)">
      {!data.top?.length ? (
        <p className="text-sm text-slate-400">Belum cukup data untuk menghitung. Pastikan nilai & skoring sudah ada.</p>
      ) : (
        <div className="space-y-4">
          <Section label="Top 3 cluster" items={data.top} />
          {data.backup && <Section label="Backup" items={[data.backup]} />}
          {data.exploration && <Section label="Eksplorasi" items={[data.exploration]} />}
          <p className="text-xs text-slate-400">Advisory untuk guru BK — bukan keputusan. Parameter {data.parameters_version}.</p>
        </div>
      )}
    </Card>
  );
}

function Section({ label, items }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.cluster_code} className="rounded-lg border border-slate-100 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-800">{c.name_id}</span>
              <div className="flex gap-1.5">
                {c.matched_interest && <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">Sesuai minat</Badge>}
                <Badge className={FIT_STYLE[c.fit_level] || FIT_STYLE['Needs Exploration']}>{c.fit_level}{c.fit_score != null ? ` (${c.fit_score})` : ''}</Badge>
                <Badge className={READINESS_LEVEL_STYLE[c.readiness_level] || ''}>{c.readiness_level}</Badge>
              </div>
            </div>
            <div className="mt-1 text-sm text-slate-500">{c.related_majors}</div>
            {c.evidence && <div className="mt-1 text-xs text-slate-400">Bukti: {c.evidence}</div>}
            {c.interventions && <div className="mt-1 text-xs text-slate-400">Intervensi: {c.interventions}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
