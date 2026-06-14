// In-memory fixtures so the UI runs without a deployed backend.
// Enabled by VITE_USE_MOCK=true. Mirrors the GAS endpoint contracts.

const SKILL_NAMES = {
  1: 'Literasi B. Indonesia', 2: 'Literasi B. Inggris', 3: 'Pengetahuan Kuantitatif',
  4: 'Penalaran Matematika', 5: 'Penalaran Umum', 6: 'Pemahaman Bacaan & Menulis',
  7: 'Problem solving', 8: 'Disiplin belajar',
};

const users = {
  'admin@example.sch.id': { token: 't-admin', user: { user_id: 'U001', name: 'Admin Madrasah', role: 'admin', class: '' } },
  'kepala@example.sch.id': { token: 't-principal', user: { user_id: 'U002', name: 'Kepala Madrasah', role: 'principal', class: '' } },
  'bk@example.sch.id': { token: 't-bk', user: { user_id: 'U003', name: 'Bu Sari (BK)', role: 'bk', class: '' } },
  'hadi@example.sch.id': { token: 't-wali', user: { user_id: 'U004', name: 'Pak Hadi (Wali XII-A)', role: 'wali_kelas', class: 'XII-A' } },
  'rina@example.sch.id': { token: 't-teacher', user: { user_id: 'U005', name: 'Bu Rina (Matematika)', role: 'teacher', class: '' } },
};

const students = [
  { student_id: 'S001', name: 'Ahmad Fauzi', class: 'XII-A', consent: true, readiness_band: 'Medium', category: 'Developing' },
  { student_id: 'S002', name: 'Siti Aminah', class: 'XII-A', consent: true, readiness_band: 'High', category: 'Top UTBK candidate' },
  { student_id: 'S003', name: 'Budi Santoso', class: 'XII-B', consent: true, readiness_band: 'Low', category: 'Foundation building' },
  { student_id: 'S004', name: 'Dewi Lestari', class: 'XII-B', consent: false, readiness_band: null, category: null },
];

const matrices = {
  S001: [1, 2, 3, 4, 5, 6].map((id) => ({ skill_id: id, level: [3, 2, 4, 3, 3, 3][id - 1], source: `Tryout 2026-09-12 / subtes ${id}`, date: '2026-09-12' })),
  S002: [1, 2, 3, 4, 5, 6].map((id) => ({ skill_id: id, level: [4, 4, 5, 4, 4, 4][id - 1], source: `Tryout 2026-09-12 / subtes ${id}`, date: '2026-09-12' })),
  S003: [1, 2, 3, 4, 5, 6].map((id) => ({ skill_id: id, level: [2, 1, 2, 2, 2, 2][id - 1], source: `Tryout 2026-09-12 / subtes ${id}`, date: '2026-09-12' })),
};

const nineBox = {
  S001: { current: { student_id: 'S001', date: '2026-10-01', performance_score: 3.4, potential_score: 3.6, performance_band: 'Medium', potential_band: 'Medium', category: 'Developing', readiness_band: 'Medium', parameters_version: 'v1' }, previous: { date: '2026-09-01', performance_band: 'Medium', potential_band: 'Low', category: 'Steady developing', readiness_band: 'Low' } },
  S002: { current: { student_id: 'S002', date: '2026-10-01', performance_score: 4.2, potential_score: 4.0, performance_band: 'High', potential_band: 'High', category: 'Top UTBK candidate', readiness_band: 'High', parameters_version: 'v1' }, previous: null },
  S003: { current: { student_id: 'S003', date: '2026-10-01', performance_score: 2.1, potential_score: 2.8, performance_band: 'Low', potential_band: 'Medium', category: 'Emerging', readiness_band: 'Low', parameters_version: 'v1' }, previous: null },
};

const interests = {
  S001: [{ rank: 1, major: 'Manajemen', university: 'UNPAD', reason: 'Suka organisasi' }],
  S002: [{ rank: 1, major: 'Informatika', university: 'ITB', reason: 'Suka coding' }],
};

const plans = {
  S001: { plan_id: 'P001', student_id: 'S001', date: '2026-10-02', weekly_targets: '2× set latihan numerasi/minggu; rutin kosakata Inggris 15 menit/hari', materials: 'Bank soal tryout', responsible_teacher: 'Bu Rina', major_shortlist: 'Manajemen (sesuai minat); Akuntansi; Ekonomi Islam', narrative: 'Kesiapan berkembang; perkuat literasi Inggris.', approval_counselor_id: 'U003', approval_date: '2026-10-03' },
  S002: { plan_id: 'P002', student_id: 'S002', date: '2026-10-02', weekly_targets: 'Latihan soal HOTS; strategi PTN kompetitif', materials: 'Modul lanjutan', responsible_teacher: 'Bu Rina', major_shortlist: 'Informatika (sesuai minat); Statistika; Sistem Informasi', narrative: 'Kandidat UTBK kuat.', approval_counselor_id: '', approval_date: '' },
};

const dashboard = {
  total: 4, with_consent: 3,
  readiness_bands: { High: 1, Medium: 1, Low: 1, none: 1 },
  nine_box: { 'High|High': 1, 'Medium|Medium': 1, 'Low|Medium': 1 },
  parameters_version: 'v1',
};

function clone(x) { return JSON.parse(JSON.stringify(x)); }

export const SKILLS = SKILL_NAMES;

export function mockDispatch(action, payload, session) {
  switch (action) {
    case 'login': {
      if (payload.method === 'student') {
        if (payload.nisn === 'S001' && payload.pin === '1234') return clone({ token: 't-student-S001', user: { user_id: 'S001', name: 'Ahmad Fauzi', role: 'student', class: 'XII-A' } });
        throw new Error('NISN/PIN salah (coba S001 / 1234)');
      }
      const u = users[payload.email];
      if (!u) throw new Error('Email tidak terdaftar');
      return clone(u);
    }
    case 'listStudents': {
      let list = clone(students);
      if (session.role === 'wali_kelas') list = list.filter((s) => s.class === session.class);
      return list;
    }
    case 'myStudents': {
      let list = clone(students).map((s) => ({ student_id: s.student_id, name: s.name, class: s.class }));
      if (session.role === 'wali_kelas') list = list.filter((s) => s.class === session.class);
      return list;
    }
    case 'getStudent': {
      const st = students.find((s) => s.student_id === payload.student_id);
      if (!st) throw new Error('Siswa tidak ditemukan');
      return clone({ profile: st, interests: interests[payload.student_id] || [], grades: [] });
    }
    case 'getMatrix':
      return clone(matrices[payload.student_id] || []);
    case 'getNineBox':
      return clone(nineBox[payload.student_id] || { current: null, previous: null, history: [] });
    case 'getMyReadiness': {
      const nb = nineBox[payload.student_id];
      return { band: nb?.current?.readiness_band || null, date: nb?.current?.date || null, previous_band: nb?.previous?.readiness_band || null };
    }
    case 'cohortDashboard':
      return clone(dashboard);
    case 'classView': {
      let list = students.filter((s) => s.readiness_band !== undefined);
      if (session.role === 'wali_kelas') list = list.filter((s) => s.class === session.class);
      else if (payload.class) list = list.filter((s) => s.class === payload.class);
      return clone(list.map((s) => ({
        student_id: s.student_id, name: s.name, class: s.class, consent: s.consent,
        readiness_band: s.readiness_band, category: s.category,
        at_risk: s.readiness_band === 'Low',
        intervention_status: s.student_id === 'S001' ? 'planned' : s.student_id === 'S002' ? 'draft' : 'none',
      })));
    }
    case 'topGaps':
      return [{ skill_id: 2, count: 2 }, { skill_id: 4, count: 1 }, { skill_id: 1, count: 1 }];
    case 'atRisk': {
      let list = students.filter((s) => s.readiness_band === 'Low');
      if (session.role === 'wali_kelas') list = list.filter((s) => s.class === session.class);
      return clone(list.map((s) => ({ student_id: s.student_id, name: s.name, class: s.class, category: s.category, date: '2026-10-01', reason: 'Kesiapan rendah' })));
    }
    case 'importRows':
      return { imported: (payload.rows || []).length, skipped_no_consent: 0 };
    case 'getRecommendation': {
      const byStudent = {
        S001: {
          top: [
            { cluster_code: 'BUSN', name_id: 'Bisnis, Ekonomi & Manajemen', related_majors: 'Manajemen, Akuntansi, Ekonomi', fit_score: 3.6, fit_level: 'Medium Fit', readiness_level: 'Needs Strengthening', matched_interest: true, evidence: 'Akademik 3.5; Kesiapan SNBT 3.0; Minat sesuai', interventions: 'Drill interpretasi data, baca studi kasus bisnis' },
            { cluster_code: 'SOCI', name_id: 'Ilmu Sosial & Psikologi', related_majors: 'Psikologi, Sosiologi, Ilmu Komunikasi', fit_score: 3.2, fit_level: 'Medium Fit', readiness_level: 'Needs Strengthening', matched_interest: false, evidence: 'Akademik 3.4; Kesiapan SNBT 3.0', interventions: 'Analisis kasus sosial, tugas literasi riset' },
            { cluster_code: 'EDUC', name_id: 'Pendidikan & Keguruan', related_majors: 'PGSD, Pendidikan B.Inggris, PAI', fit_score: 3.0, fit_level: 'Medium Fit', readiness_level: 'Needs Strengthening', matched_interest: false, evidence: 'Akademik 3.2; Kesiapan SNBT 2.9', interventions: 'Simulasi mengajar, tutor sebaya' },
          ],
          backup: { cluster_code: 'LANG', name_id: 'Bahasa, Sastra & Komunikasi', related_majors: 'Sastra, Jurnalistik, Komunikasi', fit_score: 2.8, fit_level: 'Medium Fit', readiness_level: 'Needs Strengthening', matched_interest: false, evidence: 'Akademik 3.0', interventions: 'Drill menulis esai' },
          exploration: { cluster_code: 'HUMN', name_id: 'Humaniora, Budaya & Studi Agama', related_majors: 'Studi Islam, Sejarah, Filsafat', fit_score: 2.6, fit_level: 'Low Fit', readiness_level: 'Needs Strengthening', matched_interest: false, evidence: 'Akademik 2.9', interventions: 'Program baca terstruktur' },
          parameters_version: 'v1',
        },
        S002: {
          top: [
            { cluster_code: 'COMP', name_id: 'Ilmu Komputer & Teknologi Digital', related_majors: 'Informatika, Sistem Informasi, Data Science', fit_score: 4.3, fit_level: 'High Fit', readiness_level: 'Ready', matched_interest: true, evidence: 'Akademik 4.5; Kesiapan SNBT 4.2; Minat sesuai', interventions: 'Drill logika, proyek pemrograman dasar' },
            { cluster_code: 'ENGR', name_id: 'Teknik & Teknologi Terapan', related_majors: 'Teknik Sipil, Mesin, Elektro', fit_score: 4.0, fit_level: 'High Fit', readiness_level: 'Ready', matched_interest: false, evidence: 'Akademik 4.3; Kesiapan SNBT 4.0', interventions: 'Drill penalaran kuantitatif' },
            { cluster_code: 'BUSN', name_id: 'Bisnis, Ekonomi & Manajemen', related_majors: 'Manajemen, Akuntansi, Ekonomi', fit_score: 3.8, fit_level: 'High Fit', readiness_level: 'Ready', matched_interest: false, evidence: 'Akademik 4.0; Kesiapan SNBT 4.1', interventions: 'Mini-proyek wirausaha' },
          ],
          backup: { cluster_code: 'HLTH', name_id: 'Kesehatan & Kedokteran', related_majors: 'Kedokteran, Farmasi, Gizi', fit_score: 3.6, fit_level: 'Medium Fit', readiness_level: 'Ready', matched_interest: false, evidence: 'Akademik 4.2', interventions: 'Penguatan konsep sains' },
          exploration: null,
          parameters_version: 'v1',
        },
      };
      return clone(byStudent[payload.student_id] || { top: [], backup: null, exploration: null, parameters_version: 'v1' });
    }
    case 'getMonthlyReviews': {
      const m = {
        S001: [
          { date: '2026-10-05', academic_status: 'Stabil di 3.4', readiness_update: 'Berkembang', priority_weakness: 'Literasi Inggris', assigned_drills: 'Kosakata 15 menit/hari', counselor_action: 'Sesi konseling jurusan', parent_note: 'Dampingi rutinitas belajar', next_target: 'Naik ke level 3 Literasi Inggris', progress_response: 'Naik' },
        ],
      };
      const rows = m[payload.student_id] || [];
      return clone(session.role === 'student'
        ? rows.map(({ counselor_action, priority_weakness, ...r }) => r)
        : rows);
    }
    case 'saveMonthlyReview':
      return { saved: true, progress_response: 'Stabil' };
    case 'getReport': {
      const plan = plans[payload.student_id];
      if (session.role === 'student') {
        if (!plan || !plan.approval_date) return { plan: null, approved: false };
        return clone({ plan, approved: true });
      }
      return clone({ plan: plan || null, approved: !!(plan && plan.approval_date) });
    }
    case 'saveReview':
    case 'saveInterests':
    case 'saveReport':
    case 'runScoring':
      return { saved: true, scored: 3 };
    case 'approveReport': {
      if (plans[payload.student_id]) plans[payload.student_id].approval_date = new Date().toISOString().slice(0, 10);
      return { approved: true };
    }
    case 'me':
      return session;
    default:
      throw new Error('Mock: aksi tidak dikenal ' + action);
  }
}
