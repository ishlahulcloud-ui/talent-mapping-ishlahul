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
  var def = ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0) ss.deleteSheet(def);
  SpreadsheetApp.getUi && Logger.log('setupSheets complete: ' + Object.keys(SHEETS).join(', '));
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
