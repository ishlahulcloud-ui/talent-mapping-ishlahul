import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { dataService } from '../services/dataService.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Card, Spinner, ErrorNote, Button, Badge } from '../components/ui/index.jsx';
import { READINESS_STYLE } from '../constants/roles.js';

const BANDS = ['High', 'Medium', 'Low'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [running, setRunning] = useState(false);

  function load() {
    dataService.cohortDashboard().then(setData).catch((e) => setErr(e.message));
  }
  useEffect(load, []);

  async function runScoring() {
    setRunning(true);
    try { await dataService.runScoring(); load(); }
    catch (e) { setErr(e.message); }
    finally { setRunning(false); }
  }

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!data) return <Spinner />;

  const total = data.total || 0;
  const canRun = user.role === 'admin' || user.role === 'bk';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Dashboard Kohort</h2>
          <p className="text-sm text-slate-500">Parameter {data.parameters_version} · {data.with_consent}/{total} siswa dengan consent</p>
        </div>
        {canRun && (
          <Button variant="secondary" onClick={runScoring} disabled={running}>
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} /> Jalankan skoring
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Distribusi kesiapan">
          <div className="space-y-3">
            {BANDS.map((b) => {
              const n = data.readiness_bands[b] || 0;
              const pct = total ? Math.round((n / total) * 100) : 0;
              const style = READINESS_STYLE[b];
              return (
                <div key={b}>
                  <div className="mb-1 flex justify-between text-sm">
                    <Badge className={style.cls}>{style.label}</Badge>
                    <span className="text-slate-500">{n} siswa</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {data.readiness_bands.none ? (
              <p className="pt-1 text-xs text-slate-400">{data.readiness_bands.none} siswa belum punya hasil skoring.</p>
            ) : null}
          </div>
        </Card>

        <Card title="Nine-box (staf saja)">
          <NineBoxHeatmap counts={data.nine_box} />
          <p className="mt-3 text-xs text-slate-400">Grid ini hanya untuk staf. Siswa tidak pernah melihat sel nine-box-nya.</p>
        </Card>
      </div>
    </div>
  );
}

function NineBoxHeatmap({ counts }) {
  const max = Math.max(1, ...Object.values(counts || {}));
  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1 text-center text-xs">
      <div />
      {BANDS.slice().map((p) => <div key={p} className="pb-1 font-medium text-slate-500">Potensi {p}</div>)}
      {BANDS.map((perf) => (
        <Row key={perf} perf={perf} counts={counts} max={max} />
      ))}
    </div>
  );
}

function Row({ perf, counts, max }) {
  return (
    <>
      <div className="flex items-center pr-2 font-medium text-slate-500">Perf {perf}</div>
      {BANDS.map((pot) => {
        const n = counts[`${perf}|${pot}`] || 0;
        const intensity = n / max;
        return (
          <div key={pot} className="flex h-14 items-center justify-center rounded"
            style={{ background: `rgba(79,70,229,${0.08 + intensity * 0.6})`, color: intensity > 0.5 ? 'white' : '#334155' }}>
            <span className="text-base font-semibold">{n || ''}</span>
          </div>
        );
      })}
    </>
  );
}
