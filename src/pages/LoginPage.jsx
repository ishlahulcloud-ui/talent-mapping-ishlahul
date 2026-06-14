import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { dataService } from '../services/dataService.js';
import { defaultRoute } from '../components/layout/ProtectedRoute.jsx';
import { Button, Field, ErrorNote } from '../components/ui/index.jsx';

const GIS_CLIENT_ID = import.meta.env.VITE_GIS_CLIENT_ID;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('staff');
  const [email, setEmail] = useState('');
  const [nisn, setNisn] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const gisButtonRef = useRef(null);

  // Real staff sign-in uses Google Identity Services: load the GSI client,
  // render the official button, and send the returned id_token JWT to the
  // backend (which verifies its audience against GIS_CLIENT_ID). Mock mode
  // skips GIS and accepts a known demo email instead.
  const useGis = !dataService.isMock && mode === 'staff';

  useEffect(() => {
    if (!useGis) return;
    let cancelled = false;

    async function onCredential(resp) {
      setErr(null); setBusy(true);
      try {
        const user = await login({ method: 'staff', id_token: resp.credential });
        navigate(defaultRoute(user.role));
      } catch (e) { setErr(e.message); }
      finally { setBusy(false); }
    }

    function init() {
      if (cancelled || !window.google?.accounts?.id || !gisButtonRef.current) return;
      if (!GIS_CLIENT_ID) { setErr('VITE_GIS_CLIENT_ID belum diset.'); return; }
      window.google.accounts.id.initialize({ client_id: GIS_CLIENT_ID, callback: onCredential });
      window.google.accounts.id.renderButton(gisButtonRef.current, { theme: 'outline', size: 'large', width: 280, text: 'signin_with' });
    }

    const existing = document.getElementById('gsi-client');
    if (existing) { init(); return () => { cancelled = true; }; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true; s.id = 'gsi-client';
    s.onload = init;
    document.body.appendChild(s);
    return () => { cancelled = true; };
  }, [useGis, login, navigate]);

  async function submit(e) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      // Mock staff login by email; students always use NISN + PIN.
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

        {useGis ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Masuk dengan akun Google madrasah:</p>
            <div ref={gisButtonRef} className="flex justify-center" />
            {busy && <p className="text-sm text-slate-400">Memverifikasi…</p>}
            {err && <ErrorNote>{err}</ErrorNote>}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {mode === 'staff' ? (
              <Field label="Email madrasah" hint="Mock: bk@example.sch.id / hadi@example.sch.id / kepala@example.sch.id">
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
        )}
      </div>
    </div>
  );
}
