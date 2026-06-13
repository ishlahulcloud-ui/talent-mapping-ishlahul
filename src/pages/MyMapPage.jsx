import { useEffect, useState } from 'react';
import { dataService } from '../services/dataService.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card, Spinner, ErrorNote, Badge } from '../components/ui/index.jsx';
import { READINESS_STYLE } from '../constants/roles.js';
import SkillMatrixTable from '../components/SkillMatrixTable.jsx';

// Student-facing view (spec §11/§12). No nine-box, no raw teacher scores,
// no other students. Only an approved plan is ever shown.
export default function MyMapPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([
      dataService.getMatrix(user.user_id),
      dataService.getNineBox(user.user_id),
      dataService.getReport(user.user_id),
    ]).then(([matrix, nineBox, report]) => setData({ matrix, nineBox, report }))
      .catch((e) => setErr(e.message));
  }, [user.user_id]);

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!data) return <Spinner />;

  const band = data.nineBox.current?.readiness_band;
  const style = band ? READINESS_STYLE[band] : null;
  const strengths = data.matrix.filter((r) => r.level >= 4);
  const gaps = data.matrix.filter((r) => r.level <= 2);
  const plan = data.report.approved ? data.report.plan : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Peta Saya</h2>
        {style && <Badge className={style.cls}>{style.label}</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Kekuatan utama">
          {strengths.length ? <SkillMatrixTable rows={strengths} /> : <p className="text-sm text-slate-400">Belum ada level ≥ 4.</p>}
        </Card>
        <Card title="Perlu diperbaiki">
          {gaps.length ? <SkillMatrixTable rows={gaps} /> : <p className="text-sm text-slate-400">Tidak ada level ≤ 2 — bagus!</p>}
        </Card>
      </div>

      <Card title="Rencana belajar saya">
        {plan ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p><span className="font-medium">Target mingguan:</span> {plan.weekly_targets}</p>
            <p><span className="font-medium">Pilihan jurusan untuk didiskusikan:</span> {plan.major_shortlist}</p>
            {plan.responsible_teacher && <p><span className="font-medium">Pendamping:</span> {plan.responsible_teacher}</p>}
            <p className="text-xs text-slate-400">Ini opsi untuk didiskusikan dengan guru BK, bukan prediksi atau keputusan kelulusan. Disetujui {plan.approval_date}.</p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Rencana belajarmu sedang disiapkan dan akan tampil setelah disetujui guru BK.</p>
        )}
      </Card>
    </div>
  );
}
