/**
 * Endpoints.gs — feature endpoint implementations called from Code.gs ROUTES.
 * Read helpers (readTable_, appendRow_, updateRow_) and scoring functions
 * (computePerformance, etc.) live in Code.gs and Scoring.gs.
 */

function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }

function consentSet_() {
  var set = {};
  readTable_('Consent').forEach(function (c) {
    if (c.student_consent_date && !c.withdrawal_date) set[c.student_id] = true;
  });
  return set;
}

/* --- Feature 1: Student profile --- */

function listStudents_(p, s) {
  var students = readTable_('Students').filter(function (st) { return st.status === 'active'; });
  if (s.role === 'wali_kelas') students = students.filter(function (st) { return st['class'] === s['class']; });
  var consent = consentSet_();
  var latest = latestNineBoxByStudent_();
  return students.map(function (st) {
    var nb = latest[st.student_id];
    return {
      student_id: st.student_id, name: st.name, class: st['class'],
      consent: !!consent[st.student_id],
      readiness_band: nb ? nb.readiness_band : null,
      category: nb ? nb.category : null,
    };
  });
}

function getStudent_(p, s) {
  if (s.role === 'student' && s.user_id !== p.student_id) throw new Error('Tidak diizinkan');
  var st = readTable_('Students').filter(function (x) { return x.student_id === p.student_id; })[0];
  if (!st) throw new Error('Siswa tidak ditemukan');
  if (s.role === 'wali_kelas' && st['class'] !== s['class']) throw new Error('Bukan kelas binaan Anda');
  var interests = readTable_('Career_Interests').filter(function (x) { return x.student_id === p.student_id; })
    .sort(function (a, b) { return a.rank - b.rank; });
  var grades = readTable_('Grades').filter(function (x) { return x.student_id === p.student_id; });
  return { profile: st, interests: interests, grades: grades };
}

function saveInterests_(p, s) {
  if (s.role === 'student' && s.user_id !== p.student_id) throw new Error('Tidak diizinkan');
  // Replace the student's interest rows (up to 3).
  var sh = sheet_('Career_Interests');
  var lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    var values = sh.getDataRange().getValues();
    for (var r = values.length - 1; r >= 1; r--) if (String(values[r][1]) === String(p.student_id)) sh.deleteRow(r + 1);
  } finally { lock.releaseLock(); }
  (p.interests || []).slice(0, 3).forEach(function (it, i) {
    appendRow_('Career_Interests', {
      interest_id: Utilities.getUuid(), student_id: p.student_id, rank: i + 1,
      major: it.major, university: it.university || '', reason: it.reason || '', date: today_(),
    });
  });
  return { _audit: 'Career_Interests/' + p.student_id, saved: (p.interests || []).length };
}

/* --- Feature 2: Teacher review --- */

function myStudents_(p, s) {
  // MVP: a teacher reviews students in the classes they're assigned to.
  // Without a full Jadwal table, wali_kelas -> own class; teacher -> all active XII.
  var students = readTable_('Students').filter(function (st) { return st.status === 'active'; });
  if (s.role === 'wali_kelas') students = students.filter(function (st) { return st['class'] === s['class']; });
  return students.map(function (st) { return { student_id: st.student_id, name: st.name, class: st['class'] }; });
}

function saveReview_(p, s) {
  var ind = p.indicators || {};
  ['subject_mastery', 'learning_consistency', 'assignment_completion', 'critical_thinking', 'motivation', 'exam_readiness'].forEach(function (k) {
    var v = Number(ind[k]);
    if (!(v >= 1 && v <= 5)) throw new Error('Skor ' + k + ' harus 1-5');
  });
  appendRow_('Performance_Reviews', {
    review_id: Utilities.getUuid(), student_id: p.student_id, teacher_id: s.user_id,
    subject_id: p.subject_id || '', date: today_(),
    subject_mastery: ind.subject_mastery, learning_consistency: ind.learning_consistency,
    assignment_completion: ind.assignment_completion, critical_thinking: ind.critical_thinking,
    motivation: ind.motivation, exam_readiness: ind.exam_readiness, evidence_note: p.evidence_note || '',
  });
  return { _audit: 'Performance_Reviews/' + p.student_id, saved: true };
}

/* --- Feature 3: Skills matrix --- */

function getMatrix_(p, s) {
  if (s.role === 'student' && s.user_id !== p.student_id) throw new Error('Tidak diizinkan');
  var rows = readTable_('Skills_Matrix').filter(function (x) { return x.student_id === p.student_id; });
  return rows.map(function (x) { return { skill_id: x.skill_id, level: x.level, source: x.source_reference, date: x.date }; });
}

/* --- Feature 4: Scoring run + nine-box --- */

function reviewMeans_(studentId) {
  var rows = readTable_('Performance_Reviews').filter(function (x) { return x.student_id === studentId; });
  if (!rows.length) return null;
  function avg(field) { return mean_(rows.map(function (r) { return Number(r[field]); })); }
  // Performance indicators: 1,3,6 ; Potential indicators: 2,4,5 (see rubric.md).
  return {
    perf: mean_([avg('subject_mastery'), avg('assignment_completion'), avg('exam_readiness')]),
    pot: mean_([avg('learning_consistency'), avg('critical_thinking'), avg('motivation')]),
  };
}

function gradeAvg5_(studentId) {
  var rows = readTable_('Grades').filter(function (x) { return x.student_id === studentId; });
  if (!rows.length) return null;
  return normGrade(mean_(rows.map(function (r) { return Number(r.score); })));
}

function mockComposites_(studentId) {
  // Group mock subtest levels by date, composite = mean of subtest levels.
  var rows = readTable_('Skills_Matrix').filter(function (x) {
    return x.student_id === studentId && String(x.source_reference).indexOf('Tryout') !== -1;
  });
  var byDate = {};
  rows.forEach(function (r) { (byDate[r.date] = byDate[r.date] || []).push(Number(r.level)); });
  return Object.keys(byDate).sort().map(function (d) { return mean_(byDate[d]); });
}

function runScoring_(p, s) {
  var consent = consentSet_();
  var students = readTable_('Students').filter(function (st) { return st.status === 'active' && consent[st.student_id]; });
  var counselor = {};
  readTable_('Counselor_Notes').forEach(function (n) { counselor[n.student_id] = Number(n.potential_judgment); });
  var date = today_();
  var count = 0;

  students.forEach(function (st) {
    var rm = reviewMeans_(st.student_id);
    var skills = readTable_('Skills_Matrix').filter(function (x) { return x.student_id === st.student_id; })
      .sort(function (a, b) { return a.skill_id - b.skill_id; });
    var levels = skills.filter(function (x) { return Number(x.skill_id) >= 1 && Number(x.skill_id) <= 6; })
      .map(function (x) { return Number(x.level); });
    var mocks = mockComposites_(st.student_id);

    var perf = computePerformance({
      grade_avg: gradeAvg5_(st.student_id),
      mock_composite: mocks.length ? mocks[mocks.length - 1] : null,
      teacher_perf: rm ? rm.perf : null,
    });
    var pot = computePotential({
      teacher_potential: rm ? rm.pot : null,
      counselor_judgment: counselor[st.student_id] != null ? counselor[st.student_id] : null,
      mock_composites: mocks,
    });
    var perfBand = whichBand(perf.score), potBand = whichBand(pot.score);
    var readiness = levels.length ? computeReadiness(levels) : null;

    appendRow_('Nine_Box_Results', {
      student_id: st.student_id, date: date,
      performance_score: perf.score, potential_score: pot.score,
      performance_band: perfBand, potential_band: potBand,
      category: nineBoxCategory(perfBand, potBand),
      parameters_version: PARAMS_VERSION,
      readiness_band: readiness != null ? whichBand(readiness) : '',
    });
    count++;
  });
  return { _audit: 'Nine_Box_Results (' + count + ')', scored: count, date: date };
}

function latestNineBoxByStudent_() {
  var rows = readTable_('Nine_Box_Results');
  var latest = {};
  rows.forEach(function (r) {
    var cur = latest[r.student_id];
    if (!cur || String(r.date) > String(cur.date)) latest[r.student_id] = r;
  });
  return latest;
}

function getNineBox_(p, s) {
  var rows = readTable_('Nine_Box_Results').filter(function (x) { return x.student_id === p.student_id; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  if (s.role === 'wali_kelas') {
    var st = readTable_('Students').filter(function (x) { return x.student_id === p.student_id; })[0];
    if (!st || st['class'] !== s['class']) throw new Error('Bukan kelas binaan Anda');
  }
  return { current: rows[0] || null, previous: rows[1] || null, history: rows };
}

function cohortDashboard_(p, s) {
  var latest = latestNineBoxByStudent_();
  var students = readTable_('Students').filter(function (st) { return st.status === 'active'; });
  if (s.role === 'wali_kelas') students = students.filter(function (st) { return st['class'] === s['class']; });
  var consent = consentSet_();
  var bands = { High: 0, Medium: 0, Low: 0, none: 0 };
  var nineBox = {};
  var withConsent = 0;
  students.forEach(function (st) {
    if (consent[st.student_id]) withConsent++;
    var nb = latest[st.student_id];
    if (nb && nb.performance_band && nb.potential_band) {
      var key = nb.performance_band + '|' + nb.potential_band;
      nineBox[key] = (nineBox[key] || 0) + 1;
    }
    var rb = nb && nb.readiness_band ? nb.readiness_band : 'none';
    bands[rb] = (bands[rb] || 0) + 1;
  });
  return {
    total: students.length, with_consent: withConsent,
    readiness_bands: bands, nine_box: nineBox, parameters_version: PARAMS_VERSION,
  };
}

/* --- Feature 5: Recommendation report + approval gate --- */

function getReport_(p, s) {
  var rows = readTable_('Study_Plans').filter(function (x) { return x.student_id === p.student_id; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  var plan = rows[0] || null;
  // Counselor approval gate: students only ever see an approved plan.
  if (s.role === 'student') {
    if (s.user_id !== p.student_id) throw new Error('Tidak diizinkan');
    if (!plan || !plan.approval_date) return { plan: null, approved: false };
    return { plan: stripForStudent_(plan), approved: true };
  }
  if (s.role === 'wali_kelas') {
    var st = readTable_('Students').filter(function (x) { return x.student_id === p.student_id; })[0];
    if (!st || st['class'] !== s['class']) throw new Error('Bukan kelas binaan Anda');
  }
  return { plan: plan, approved: !!(plan && plan.approval_date) };
}

function stripForStudent_(plan) {
  return {
    student_id: plan.student_id, date: plan.date, weekly_targets: plan.weekly_targets,
    materials: plan.materials, responsible_teacher: plan.responsible_teacher,
    major_shortlist: plan.major_shortlist, narrative: plan.narrative,
    approval_date: plan.approval_date,
  };
}

function saveReport_(p, s) {
  // BK creates/edits a draft plan (unapproved until approveReport_).
  appendRow_('Study_Plans', {
    plan_id: Utilities.getUuid(), student_id: p.student_id, date: today_(),
    weekly_targets: p.weekly_targets || '', materials: p.materials || '',
    responsible_teacher: p.responsible_teacher || '', status: 'planned',
    major_shortlist: p.major_shortlist || '', narrative: p.narrative || '',
    approval_counselor_id: '', approval_date: '',
  });
  return { _audit: 'Study_Plans/' + p.student_id, saved: true };
}

function approveReport_(p, s) {
  var ok = updateRow_('Study_Plans', 'plan_id', p.plan_id, {
    approval_counselor_id: s.user_id, approval_date: today_(),
    weekly_targets: p.weekly_targets, major_shortlist: p.major_shortlist, narrative: p.narrative,
  });
  if (!ok) throw new Error('Rencana tidak ditemukan');
  return { _audit: 'Study_Plans approve/' + p.plan_id, approved: true };
}

/* --- Admin data import (Feature 1 feeder) --- */

// Tables an admin may bulk-import into. Generated/scored tables are excluded.
var IMPORTABLE = {
  Grades: ['student_id', 'subject_id', 'semester', 'score', 'source', 'import_date'],
  Mock_Tests: ['test_id', 'student_id', 'date', 'provider', 'subtest', 'score', 'percentile'],
  Skills_Matrix: ['student_id', 'skill_id', 'level', 'source_reference', 'date'],
  Counselor_Notes: ['note_id', 'student_id', 'counselor_id', 'date', 'note', 'potential_judgment'],
  Consent: ['student_id', 'student_consent_date', 'parent_consent_date', 'consent_scope', 'withdrawal_date'],
};

function importRows_(p, s) {
  var table = p.table;
  if (!IMPORTABLE[table]) throw new Error('Tabel tidak boleh diimpor: ' + table);
  var rows = p.rows || [];
  if (!rows.length) throw new Error('Tidak ada baris untuk diimpor');
  var consent = consentSet_();
  var skipped = 0, imported = 0;
  rows.forEach(function (row) {
    // Consent gate: no student data enters scoring tables without consent on file.
    if (table !== 'Consent' && row.student_id && !consent[row.student_id]) { skipped++; return; }
    if (table === 'Grades' || table === 'Mock_Tests') row.import_date = row.import_date || today_();
    appendRow_(table, row);
    imported++;
  });
  return { _audit: 'import ' + table + ' (' + imported + ')', imported: imported, skipped_no_consent: skipped };
}

/* --- Dashboard views --- */

function topGaps_(p, s) {
  var rows = readTable_('Skills_Matrix');
  var counts = {};
  rows.forEach(function (r) {
    if (Number(r.level) <= 2 && Number(r.skill_id) >= 1 && Number(r.skill_id) <= 6) {
      counts[r.skill_id] = (counts[r.skill_id] || 0) + 1;
    }
  });
  return Object.keys(counts).map(function (id) { return { skill_id: Number(id), count: counts[id] }; })
    .sort(function (a, b) { return b.count - a.count; });
}

function atRisk_(p, s) {
  // MVP rule: a student is at-risk when the latest placement reads readiness
  // band Low. Stored risk-flag rules (R1-R4) come post-pilot; this is the
  // simple, honest v1 trigger.
  var latest = latestNineBoxByStudent_();
  var students = readTable_('Students').filter(function (st) { return st.status === 'active'; });
  if (s.role === 'wali_kelas') students = students.filter(function (st) { return st['class'] === s['class']; });
  var out = [];
  students.forEach(function (st) {
    var nb = latest[st.student_id];
    if (nb && nb.readiness_band === 'Low') {
      out.push({ student_id: st.student_id, name: st.name, class: st['class'], category: nb.category, date: nb.date, reason: 'Kesiapan rendah' });
    }
  });
  return out;
}

function classView_(p, s) {
  var latest = latestNineBoxByStudent_();
  var students = readTable_('Students').filter(function (st) { return st.status === 'active'; });
  if (s.role === 'wali_kelas') students = students.filter(function (st) { return st['class'] === s['class']; });
  else if (p.class) students = students.filter(function (st) { return st['class'] === p.class; });
  var plans = {};
  readTable_('Study_Plans').forEach(function (pl) {
    var cur = plans[pl.student_id];
    if (!cur || String(pl.date) > String(cur.date)) plans[pl.student_id] = pl;
  });
  var consent = consentSet_();
  return students.map(function (st) {
    var nb = latest[st.student_id];
    var pl = plans[st.student_id];
    return {
      student_id: st.student_id, name: st.name, class: st['class'],
      consent: !!consent[st.student_id],
      readiness_band: nb ? nb.readiness_band : null,
      category: nb ? nb.category : null,
      at_risk: !!(nb && nb.readiness_band === 'Low'),
      intervention_status: pl ? (pl.approval_date ? pl.status || 'planned' : 'draft') : 'none',
    };
  });
}
