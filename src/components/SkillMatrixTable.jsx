import { SKILLS } from '../services/mockData.js';

const LEVEL_CLR = ['', 'bg-rose-500', 'bg-orange-400', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-600'];

// Source-on-hover is the explainability requirement (spec §7): every cell
// reveals its source and date via title attribute.
export default function SkillMatrixTable({ rows }) {
  if (!rows || !rows.length) return <p className="text-sm text-slate-400">Belum ada data skills matrix.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.skill_id} className="flex items-center gap-3" title={r.source || 'Tanpa sumber'}>
          <div className="w-44 shrink-0 text-sm text-slate-600">{SKILLS[r.skill_id] || `Skill ${r.skill_id}`}</div>
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <div key={lvl} className={`h-5 flex-1 rounded ${lvl <= r.level ? LEVEL_CLR[r.level] : 'bg-slate-100'}`} />
            ))}
          </div>
          <div className="w-8 text-right text-sm font-semibold text-slate-700">{r.level}</div>
        </div>
      ))}
      <p className="pt-1 text-xs text-slate-400">Arahkan kursor ke baris untuk melihat sumber & tanggal level.</p>
    </div>
  );
}
