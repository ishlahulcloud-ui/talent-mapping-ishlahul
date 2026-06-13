import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Compass } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { NAV, ROLE_LABELS } from '../../constants/roles.js';
import { dataService } from '../../services/dataService.js';

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-slate-800">AMANAH Readiness Map</span>
            {dataService.isMock && (
              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">MOCK</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">{user.name}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{ROLE_LABELS[user.role]}</span>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-1 text-slate-500 hover:text-rose-600">
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        {items.length > 1 && (
          <nav className="w-48 shrink-0 space-y-1">
            {items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
