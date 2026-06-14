// Styling + text for the major-recommendation layer (Blueprint Module D/E).

export const FIT_STYLE = {
  'High Fit': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Medium Fit': 'bg-amber-100 text-amber-800 border-amber-200',
  'Low Fit': 'bg-rose-100 text-rose-800 border-rose-200',
  'Needs Exploration': 'bg-slate-100 text-slate-600 border-slate-200',
};

export const READINESS_LEVEL_STYLE = {
  Ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Needs Strengthening': 'bg-amber-100 text-amber-800 border-amber-200',
  'High-Risk': 'bg-rose-100 text-rose-800 border-rose-200',
};

export const PROGRESS_STYLE = {
  Naik: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Stabil: 'bg-slate-100 text-slate-600 border-slate-200',
  Turun: 'bg-rose-100 text-rose-800 border-rose-200',
};

// Counselor validation checklist (mapping/major-clusters.md). All must be
// acknowledged before a counselor releases a recommendation.
export const COUNSELOR_CHECKLIST = [
  'Siswa benar-benar memahami jurusan yang direkomendasikan',
  'Pilihan berdasar minat siswa, bukan semata tekanan orang tua',
  'Sinyal akademik konsisten dengan jurusan',
  'Gap kesiapan SNBT realistis untuk diperbaiki',
  'Sudah mempertimbangkan alternatif jurusan yang lebih aman',
  'Status review kepala madrasah (high-risk) sudah dinilai',
];

// Parent report narrative (Blueprint "Parent Report Language Template").
export function parentReportText({ cluster, majors, gaps, duration = '3 bulan', interventions }) {
  return (
    `Berdasarkan data akademik, pilihan mata pelajaran, minat siswa, dan hasil pemantauan kesiapan SNBT, ` +
    `Ananda menunjukkan kecenderungan yang cukup kuat pada bidang ${cluster || '—'}. ` +
    `Beberapa jurusan yang dapat dieksplorasi adalah ${majors || '—'}. ` +
    `Namun, kesiapan saat ini masih perlu diperkuat pada ${gaps || '—'}. ` +
    `Sekolah merekomendasikan program intervensi selama ${duration} dengan fokus pada ${interventions || '—'}. ` +
    `Rekomendasi ini akan ditinjau kembali pada evaluasi bulanan berikutnya.`
  );
}
