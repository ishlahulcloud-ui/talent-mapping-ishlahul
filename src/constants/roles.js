export const ROLE_LABELS = {
  admin: 'Admin',
  principal: 'Kepala Madrasah',
  bk: 'Guru BK',
  wali_kelas: 'Wali Kelas',
  teacher: 'Guru',
  student: 'Siswa',
};

export const STAFF_ROLES = ['admin', 'principal', 'bk', 'wali_kelas', 'teacher'];

// Which nav items each role sees. Routes also guard server-side.
export const NAV = [
  { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'principal', 'bk', 'wali_kelas'] },
  { to: '/students', label: 'Siswa', roles: ['admin', 'principal', 'bk', 'wali_kelas'] },
  { to: '/gaps', label: 'Gap Tersering', roles: ['admin', 'principal', 'bk', 'teacher'] },
  { to: '/at-risk', label: 'Perlu Perhatian', roles: ['bk', 'wali_kelas'] },
  { to: '/review', label: 'Penilaian Siswa', roles: ['teacher', 'wali_kelas'] },
  { to: '/import', label: 'Impor Data', roles: ['admin'] },
  { to: '/my-map', label: 'Peta Saya', roles: ['student'] },
  { to: '/interests', label: 'Minat Jurusan', roles: ['student'] },
];

export const READINESS_STYLE = {
  High: { label: 'Kesiapan tinggi', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  Medium: { label: 'Berkembang', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  Low: { label: 'Perlu dukungan', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
};
