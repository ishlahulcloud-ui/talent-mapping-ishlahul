import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { dataService } from '../services/dataService.js';
import { defaultRoute } from '../components/layout/ProtectedRoute.jsx';
import { Button, Field, ErrorNote } from '../components/ui/index.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('staff');
  const [email, setEmail] = useState('');
  const [nisn, setNisn] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      // In mock mode staff "login" by email; in production this comes from a
      // verified Google id_token. Students authenticate with NISN + PIN.
      const creds = mode === 'staff' ? { method: 'staff', email } : { method: 'student', nisn, pin };
      const user = await login(creds);
      navigate(defaultRoute(user.role));
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Compass className="h-6 w-6 text-indigo-600" />
          <h1 className="text-lg font-semibold text-slate-800">AMANAH Readiness Map</h1>
        </div>

        <div className="mb-5 flex rounded-lg bg-slate-100 p-1 text-sm">
          {[['staff', 'Staf / Guru'], ['student', 'Siswa']].map(([m, label]) => (
            <button
              key={m}
              onClick={() => { setMode(m); setErr(null); }}
              className={`flex-1 rounded-md px-3 py-1.5 font-medium ${mode === m ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'staff' ? (
            <Field label="Email madrasah" hint={dataService.isMock ? 'Mock: bk@example.sch.id / hadi@example.sch.id / kepala@example.sch.id' : 'Masuk dengan akun Google madrasah'}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="nama@example.sch.id" />
            </Field>
          ) : (
            <>
              <Field label="NISN" hint={dataService.isMock ? 'Mock: S001' : undefined}>
                <input required value={nisn} onChange={(e) => setNisn(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="NISN" />
              </Field>
              <Field label="PIN" hint={dataService.isMock ? 'Mock: 1234' : undefined}>
                <input type="password" required value={pin} onChange={(e) => setPin(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="PIN" />
              </Field>
            </>
          )}

          {err && <ErrorNote>{err}</ErrorNote>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Memproses…' : 'Masuk'}</Button>
        </form>
      </div>
    </div>
  );
}
