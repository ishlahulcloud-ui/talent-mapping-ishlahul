/**
 * Setup.gs — one-time spreadsheet bootstrap and optional demo seed.
 *
 * Run setupSheets() once from the Apps Script editor against the bound
 * spreadsheet. It creates every tab from dictionary/data-model.md with header
 * rows. seedDemo() adds a small fictional cohort for testing — never run it
 * against a spreadsheet holding real student data.
 */

var SHEETS = {
  Users: ['user_id', 'name', 'role', 'status', 'auth_method', 'credential_ref', 'class'],
  Students: ['student_id', 'name', 'class', 'academic_year', 'status'],
  Subjects: ['subject_id', 'name', 'group'],
  Grades: ['student_id', 'subject_id', 'semester', 'score', 'source', 'import_date'],
  Performance_Reviews: ['review_id', 'student_id', 'teacher_id', 'subject_id', 'date',
    'subject_mastery', 'learning_consistency', 'assignment_completion',
    'critical_thinking', 'motivation', 'exam_readiness', 'evidence_note'],
  Mock_Tests: ['test_id', 'student_id', 'date', 'provider', 'subtest', 'score', 'percentile'],
  Career_Interests: ['interest_id', 'student_id', 'rank', 'major', 'university', 'reason', 'date'],
  Counselor_Notes: ['note_id', 'student_id', 'counselor_id', 'date', 'note', 'potential_judgment'],
  Skills_Matrix: ['student_id', 'skill_id', 'level', 'source_reference', 'date'],
  Nine_Box_Results: ['student_id', 'date', 'performance_score', 'potential_score',
    'performance_band', 'potential_band', 'category', 'readiness_band', 'parameters_version'],
  Skill_Gap_Results: ['student_id', 'date', 'weak_skills', 'priority', 'recommended_intervention'],
  Study_Plans: ['plan_id', 'student_id', 'date', 'weekly_targets', 'materials',
    'responsible_teacher', 'status', 'major_shortlist', 'narrative',
    'approval_counselor_id', 'approval_date'],
  Consent: ['student_id', 'student_consent_date', 'parent_consent_date', 'consent_scope', 'withdrawal_date'],
  Parameters: ['version', 'key', 'value', 'note'],
  // Major-cluster taxonomy (reference data; seeded by seedClusters()).
  Major_Clusters: ['cluster_code', 'name_id', 'related_majors', 'primary_subjects',
    'snbt_domains', 'strong_signals', 'risk_signals', 'interventions', 'is_active'],
  // Monthly intervention review / progress loop (Blueprint Module E).
  Monthly_Reviews: ['review_id', 'student_id', 'date', 'academic_status', 'readiness_update',
    'priority_weakness', 'assigned_drills', 'counselor_action', 'parent_note',
    'next_target', 'progress_response'],
};

// Audit logs live in a SEPARATE spreadsheet owned by the script account
// (spec v1.1 §15). Set AUDIT_SPREADSHEET_ID in Script Properties; if unset,
// audit rows fall back to an "Audit_Logs" tab in the bound spreadsheet.
var AUDIT_HEADERS = ['timestamp', 'user_id', 'role', 'action', 'record_affected', 'detail'];

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(SHEETS[name]);
      sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  ensureAuditSheet_();
  seedParameters_();
  seedClusters_();
  var def = ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0) ss.deleteSheet(def);
  SpreadsheetApp.getUi && Logger.log('setupSheets complete: ' + Object.keys(SHEETS).join(', '));
}

// Seed the major-cluster taxonomy (mapping/major-clusters.md). Reference data,
// safe to ship. snbt_domains are skills-matrix row numbers (1-6).
function seedClusters_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Major_Clusters');
  if (sh.getLastRow() > 1) return;
  var rows = [
    ['HLTH', 'Kesehatan & Kedokteran', 'Kedokteran, Farmasi, Keperawatan, Gizi, Kesehatan Masyarakat', 'BIO,KIM,MTK', '3,4,1,2', 'Nilai sains kuat, tren Biologi/Kimia naik, disiplin tinggi', 'Kimia/Biologi lemah, penalaran matematika lemah', 'Penguatan konsep sains, drill penalaran matematika, baca teks ilmiah, review tryout mingguan', 'true'],
    ['ENGR', 'Teknik & Teknologi Terapan', 'Teknik Sipil, Teknik Mesin, Teknik Elektro, Teknik Industri', 'MTK,KIM,IPAT', '4,3,5', 'Matematika kuat, suka problem-solving, tren kuantitatif baik', 'Fondasi matematika lemah, menghindari soal kompleks', 'Drill penalaran kuantitatif, tugas problem-solving terapan, remediasi MTK/sains', 'true'],
    ['COMP', 'Ilmu Komputer & Teknologi Digital', 'Informatika, Sistem Informasi, Data Science, Teknologi Informasi', 'MTK,INFO,BING', '4,3,5,2', 'Logika kuat, kesiapan MTK, bukti proyek/koding, baca Inggris', 'Suka gadget tapi hindari logika/MTK, tanpa bukti proyek', 'Drill logika, proyek pemrograman dasar, rencana penalaran matematika, portofolio digital', 'true'],
    ['BUSN', 'Bisnis, Ekonomi & Manajemen', 'Manajemen, Akuntansi, Ekonomi, Bisnis Digital, Kewirausahaan', 'EKO,MTK,BINDO,BING', '3,1,2,5', 'Ekonomi kuat, numerasi, komunikasi, jiwa wirausaha', 'Numerasi lemah, minat bisnis kabur, baca data lemah', 'Drill interpretasi data, baca studi kasus bisnis, penguatan akuntansi/ekonomi, mini-proyek wirausaha', 'true'],
    ['LAWG', 'Hukum, Pemerintahan & Kebijakan', 'Hukum, Administrasi Publik, Ilmu Politik, Hubungan Internasional', 'BINDO,PP,SEJ,SOS,BING', '1,6,2', 'Membaca & argumentasi kuat, sadar isu sosial, menulis', 'Literasi lemah, daya baca rendah, hukum demi prestise', 'Drill membaca & menulis argumen, debat/analisis kasus, refleksi isu publik, wawancara konselor', 'true'],
    ['SOCI', 'Ilmu Sosial & Psikologi', 'Psikologi, Sosiologi, Ilmu Komunikasi, Kesejahteraan Sosial', 'SOS,BINDO,BING', '1,6,2', 'Observasi sosial, komunikasi, empati, baca reflektif', 'Mengira Psikologi = memberi nasihat, baca ilmiah lemah', 'Analisis kasus sosial, tugas literasi riset, portofolio komunikasi, klarifikasi jurusan oleh konselor', 'true'],
    ['EDUC', 'Pendidikan & Keguruan', 'PGSD, Pendidikan B.Inggris/Matematika, Bimbingan Konseling, PAI', 'BINDO,BING,MTK,QH', '1,2,4', 'Minat mengajar, sabar, komunikasi, kuat di mapel target', 'Pendidikan hanya pilihan terakhir, komunikasi lemah', 'Simulasi mengajar, tutor sebaya, penguatan mapel, refleksi motivasi mengajar', 'true'],
    ['LANG', 'Bahasa, Sastra & Komunikasi', 'Sastra Indonesia/Inggris, Linguistik, Jurnalistik, Komunikasi', 'BINDO,BING,BAR', '1,2,6', 'Baca/tulis kuat, minat bahasa, portofolio tulisan', 'Suka bahasa tapi tata bahasa/baca lemah, disiplin nulis rendah', 'Catatan baca, drill menulis esai, tugas terjemahan/jurnalistik, portofolio bahasa', 'true'],
    ['HUMN', 'Humaniora, Budaya & Studi Agama', 'Ilmu Al-Quran/Tafsir, Studi Islam, Sejarah, Filsafat, Antropologi', 'QH,FIK,SEJ,BINDO,SOS', '1,6', 'Baca kuat, ingin tahu budaya/agama, penjelasan tertulis kuat', 'Daya baca rendah, motivasi tak jelas', 'Program baca terstruktur, esai reflektif, studi kasus sejarah/budaya, diskusi konselor', 'true'],
    ['NATSCI', 'Sains Alam & Riset', 'Matematika, Statistika, Fisika, Kimia, Biologi, Aktuaria', 'MTK,KIM,BIO,IPAT', '4,3,5,2', 'Minat teori kuat, konsistensi MTK/sains tinggi', 'Nilai bagus tapi rasa ingin tahu rendah', 'Drill problem-solving lanjutan, mini-riset, baca ilmiah, review mentor', 'false'],
    ['ARTS', 'Seni, Desain & Media Kreatif', 'DKV, Film, Seni Rupa, Desain Produk, Musik', 'SB,BINDO,BING', '1,2,5', 'Bukti portofolio, kreativitas, konsistensi karya', 'Tanpa portofolio, hanya suka menggambar, disiplin rendah', 'Rencana membangun portofolio, review proyek kreatif, literasi desain/media', 'false'],
    ['AGRI', 'Pertanian, Lingkungan & Keberlanjutan', 'Agribisnis, Agroteknologi, Ilmu Lingkungan, Teknologi Pangan', 'BIO,KIM,IPST,EKO', '1,4,3,2', 'Minat lingkungan/pertanian, kuat Biologi, pola pikir sains terapan', 'Minat sains rendah, dipilih karena dianggap mudah', 'Baca kasus lingkungan, proyek Biologi/Geografi terapan, mini-proyek agribisnis', 'false'],
  ];
  rows.forEach(function (r) { sh.appendRow(r); });
}

function ensureAuditSheet_() {
  var auditId = PropertiesService.getScriptProperties().getProperty('AUDIT_SPREADSHEET_ID');
  var ss = auditId ? SpreadsheetApp.openById(auditId) : SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Audit_Logs') || ss.insertSheet('Audit_Logs');
  if (sh.getLastRow() === 0) {
    sh.appendRow(AUDIT_HEADERS);
    sh.getRange(1, 1, 1, AUDIT_HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
}

function seedParameters_() {
  var rows = [
    ['v1', 'perf_weight_grade', '0.35', ''],
    ['v1', 'perf_weight_mock', '0.35', ''],
    ['v1', 'perf_weight_teacher', '0.25', ''],
    ['v1', 'perf_weight_attendance', '0.05', ''],
    ['v1', 'pot_weight_trend', '0.30', ''],
    ['v1', 'pot_weight_teacher', '0.40', ''],
    ['v1', 'pot_weight_counselor', '0.30', ''],
    ['v1', 'band_high_min', '3.75', 'threshold-based, no gaps'],
    ['v1', 'band_medium_min', '2.50', ''],
    ['v1', 'major_weight_priority', '1.5', ''],
    ['v1', 'major_weight_low', '0.5', ''],
  ];
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Parameters');
  if (sh.getLastRow() <= 1) rows.forEach(function (r) { sh.appendRow(r); });
}

/** Fictional demo cohort. Do NOT run against real data. */
// A believable single class (XII-A) so that setupSheets() + seedDemo() +
// runScoring() yields a fully populated dashboard with a spread across
// nine-box cells. Fictional data only — never run against real students.
var DEMO_STUDENTS = [
  // id,   name,            skills levels [1..6],          grade_avg, teacher_perf, teacher_pot, counselor
  ['S001', 'Ahmad Fauzi',   [3, 2, 4, 3, 3, 3], 84, [4, 3, 4, 3, 4, 3], 4],
  ['S002', 'Siti Aminah',   [4, 4, 5, 4, 4, 4], 91, [5, 5, 5, 4, 5, 4], 5],
  ['S003', 'Budi Santoso',  [2, 1, 2, 2, 2, 2], 70, [2, 2, 2, 2, 1, 2], 3],
  ['S004', 'Dewi Lestari',  [3, 3, 3, 3, 4, 3], 82, [3, 4, 4, 4, 4, 3], 4],
  ['S005', 'Rizki Pratama', [2, 2, 3, 2, 3, 2], 76, [2, 3, 3, 3, 3, 4], 4],
  ['S006', 'Nur Halizah',   [4, 5, 3, 3, 4, 4], 88, [4, 4, 4, 5, 4, 4], 4],
  ['S007', 'Fajar Ramadan', [3, 2, 4, 4, 3, 3], 80, [3, 3, 4, 3, 4, 3], 3],
  ['S008', 'Aisyah Putri',  [1, 2, 2, 1, 2, 2], 68, [2, 2, 2, 2, 2, 3], 3],
];

function seedDemo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  appendRows_(ss, 'Users', [
    ['U001', 'Admin Madrasah', 'admin', 'active', 'gis', 'admin@example.sch.id', ''],
    ['U002', 'Kepala Madrasah', 'principal', 'active', 'gis', 'kepala@example.sch.id', ''],
    ['U003', 'Bu Sari (BK)', 'bk', 'active', 'gis', 'bk@example.sch.id', ''],
    ['U004', 'Pak Hadi (Wali XII-A)', 'wali_kelas', 'active', 'gis', 'hadi@example.sch.id', 'XII-A'],
    ['U005', 'Bu Rina (Matematika)', 'teacher', 'active', 'gis', 'rina@example.sch.id', ''],
  ]);

  var tryoutA = 'Tryout 2026-08-15', tryoutB = 'Tryout 2026-09-12';
  DEMO_STUDENTS.forEach(function (d) {
    var id = d[0], name = d[1], skills = d[2], grade = d[3], rev = d[5], counselor = d[6];
    var revIndic = d[4]; // 6 rubric scores

    // Student login account (PIN 1234, hashed with the student id as salt).
    appendRows_(ss, 'Users', [[id, name, 'student', 'active', 'pin', hashPin_('1234', id), 'XII-A']]);
    appendRows_(ss, 'Students', [[id, name, 'XII-A', '2026/2027', 'active']]);
    appendRows_(ss, 'Consent', [[id, '2026-08-01', '2026-08-02', 'full', '']]);
    appendRows_(ss, 'Grades', [
      [id, 'MTK', 1, grade, 'rapor', '2026-08-01'],
      [id, 'BIN', 1, grade - 2, 'rapor', '2026-08-01'],
      [id, 'BIG', 1, grade - 4, 'rapor', '2026-08-01'],
    ]);
    // Two tryouts so the trend component has data; earlier tryout 1 level lower.
    for (var i = 0; i < 6; i++) {
      appendRows_(ss, 'Skills_Matrix', [
        [id, i + 1, Math.max(1, skills[i] - 1), tryoutA + ' / subtes ' + (i + 1), '2026-08-15'],
        [id, i + 1, skills[i], tryoutB + ' / subtes ' + (i + 1), '2026-09-12'],
      ]);
    }
    appendRows_(ss, 'Performance_Reviews', [[
      Utilities.getUuid(), id, 'U005', 'MTK', '2026-09-01',
      revIndic[0], revIndic[1], revIndic[2], revIndic[3], revIndic[4], revIndic[5], '',
    ]]);
    appendRows_(ss, 'Counselor_Notes', [[
      Utilities.getUuid(), id, 'U003', '2026-09-05', 'Catatan konseling awal.', counselor,
    ]]);
  });
  Logger.log('seedDemo complete: ' + DEMO_STUDENTS.length + ' students (XII-A). Student PIN = 1234. Now run runScoring (or click "Jalankan skoring" as admin/BK).');
}

function appendRows_(ss, name, rows) {
  var sh = ss.getSheetByName(name);
  rows.forEach(function (r) { sh.appendRow(r); });
}

/**
 * Create NISN + PIN login accounts for every Students row that doesn't yet
 * have a Users account. Generates a random 6-digit PIN per student, stores
 * only its hash (hashPin_ from Code.gs), and writes the plaintext NISN→PIN
 * list to a temporary "PIN_Distribution" sheet for the admin to print and
 * hand out, then DELETE. Re-running only provisions students still missing
 * an account, so it is safe to run again after importing more students.
 */
function provisionStudentLogins() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var students = readTable_('Students');
  var existing = {};
  readTable_('Users').forEach(function (u) { existing[String(u.user_id)] = true; });

  var dist = ss.getSheetByName('PIN_Distribution') || ss.insertSheet('PIN_Distribution');
  if (dist.getLastRow() === 0) dist.appendRow(['student_id', 'name', 'class', 'PIN']);

  var created = 0;
  students.forEach(function (st) {
    var id = String(st.student_id);
    if (!id || existing[id]) return;
    var pin = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    appendRow_('Users', {
      user_id: id, name: st.name, role: 'student', status: 'active',
      auth_method: 'pin', credential_ref: hashPin_(pin, id), 'class': st['class'],
    });
    dist.appendRow([id, st.name, st['class'], pin]);
    existing[id] = true;
    created++;
  });
  Logger.log('provisionStudentLogins: ' + created + ' akun siswa dibuat. PIN ada di sheet "PIN_Distribution" — cetak, bagikan, lalu HAPUS sheet itu.');
  return created;
}
