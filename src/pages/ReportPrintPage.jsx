import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { dataService } from '../services/dataService.js';
import { Spinner, ErrorNote, Button } from '../components/ui/index.jsx';
import { SKILLS } from '../services/mockData.js';
import { READINESS_STYLE } from '../constants/roles.js';
import { parentReportText } from '../constants/recommendation.js';

// Printable student report (spec §11). Uses window.print(); the toolbar is
// hidden on print. Only renders the plan content if it has been approved.
export default function ReportPrintPage() {
  const { id } = useParams();
  const [bundle, setBundle] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([
      dataService.getStudent(id), dataService.getMatrix(id),
      dataService.getNineBox(id), dataService.getReport(id),
    ]).then(([student, matrix, nineBox, report]) => setBundle({ student, matrix, nineBox, report }))
      .catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!bundle) return <Spinner />;

  const { student, matrix, nineBox, report } = bundle;
  const nb = nineBox.current;
  const band = nb?.readiness_band;
  const strengths = matrix.filter((r) => r.level >= 4);
  const gaps = matrix.filter((r) => r.level <= 2);
  const plan = report.approved ? report.plan : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link to={`/students/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Kembali</Link>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Cetak / PDF</Button>
      </div>

      <article className="mx-auto max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:shadow-none">
        <header className="border-b border-slate-200 pb-3">
          <h1 className="text-lg font-bold text-slate-800">Peta Talenta Siswa</h1>
          <p className="text-sm text-slate-600">{student.profile.name} · Kelas {student.profile.class} · {nb?.date || '—'} · parameter {nb?.parameters_version || 'v1'}</p>
        </header>

        <Section n="1" title="Kesiapan UTBK saat ini">
          {band ? <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-sm ${READINESS_STYLE[band].cls}`}>{READINESS_STYLE[band].label}</span> : <span className="text-slate-400">Belum dihitung</span>}
        </Section>

        {nineBox.previous && (
          <Section n="2" title="Pergerakan sejak siklus lalu">
            <p className="text-sm text-slate-700">{nineBox.previous.category} ({nineBox.previous.date}) → {nb.category} ({nb.date})</p>
          </Section>
        )}

        <Section n="3" title="Kekuatan utama">
          {strengths.length ? <ul className="list-disc pl-5 text-sm text-slate-700">{strengths.map((r) => <li key={r.skill_id} title={r.source}>{SKILLS[r.skill_id]} — level {r.level}</li>)}</ul> : <p className="text-sm text-slate-400">—</p>}
        </Section>

        <Section n="4" title="Yang perlu diperbaiki">
          {gaps.length ? <ul className="list-disc pl-5 text-sm text-slate-700">{gaps.map((r) => <li key={r.skill_id} title={r.source}>{SKILLS[r.skill_id]} — level {r.level}</li>)}</ul> : <p className="text-sm text-slate-400">—</p>}
        </Section>

        <Section n="5" title="Shortlist jurusan">
          {plan ? <p className="text-sm text-slate-700">{plan.major_shortlist}</p> : <p className="text-sm text-slate-400">Menunggu persetujuan BK.</p>}
          <p className="mt-1 text-xs italic text-slate-400">Ini opsi untuk didiskusikan dengan guru BK, bukan prediksi atau keputusan kelulusan.</p>
        </Section>

        <Section n="6" title="Tindakan yang disarankan">
          {plan ? <p className="text-sm text-slate-700">{plan.weekly_targets}</p> : <p className="text-sm text-slate-400">Menunggu persetujuan BK.</p>}
        </Section>

        {plan && (
          <Section n="7" title="Ringkasan untuk Orang Tua">
            <p className="text-sm leading-relaxed text-slate-700">
              {parentReportText({
                cluster: 'pilihan yang sesuai minat dan profil Ananda',
                majors: plan.major_shortlist,
                gaps: gaps.length ? gaps.map((r) => SKILLS[r.skill_id]).join(', ') : 'beberapa kompetensi dasar',
                interventions: plan.weekly_targets,
              })}
            </p>
          </Section>
        )}

        {plan && (
          <footer className="border-t border-slate-200 pt-3 text-sm text-slate-600">
            Direview dan disetujui guru BK · {plan.approval_date}
          </footer>
        )}
        {!plan && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Laporan belum disetujui guru BK; bagian rencana belum final.</p>}
      </article>
    </div>
  );
}

function Section({ n, title, children }) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold text-slate-800">{n}. {title}</h2>
      {children}
    </section>
  );
}
