/**
 * Endpoints.gs — feature endpoint implementations called from Code.gs ROUTES.
 * Read helpers (readTable_, appendRow_, updateRow_) and scoring functions
 * (computePerformance, etc.) live in Code.gs and Scoring.gs.
 */

function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }

// Canonical student id for matching. Sheets may store a NISN like 0095123969
// as the number 95123969 (leading zero stripped) while a freshly-parsed CSV
// keeps "0095123969"; this collapses both to the same key so joins/gates match
// regardless of how each side was stored.
function normId_(x) {
  var s = String(x == null ? '' : x).trim();
  return /^\d+$/.test(s) ? String(parseInt(s, 10)) : s;
}

function consentSet_() {
  var set = {};
  readTable_('Consent').forEach(function (c) {
    if (c.student_consent_date && !c.withdrawal_date) set[normId_(c.student_id)] = true;
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
      consent: !!consent[normId_(st.student_id)],
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

// Group a table's rows by canonical student_id in a single pass.
function indexByStudent_(table) {
  var idx = {};
  readTable_(table).forEach(function (r) {
    var k = normId_(r.student_id);
    (idx[k] = idx[k] || []).push(r);
  });
  return idx;
}

function runScoring_(p, s) {
  // Read every source table ONCE and index by student; per-student full-table
  // scans would time out at cohort scale (175 students x thousands of rows).
  var consent = consentSet_();
  var gradesIdx = indexByStudent_('Grades');
  var skillsIdx = indexByStudent_('Skills_Matrix');
  var reviewsIdx = indexByStudent_('Performance_Reviews');
  var counselor = {};
  readTable_('Counselor_Notes').forEach(function (n) { counselor[normId_(n.student_id)] = Number(n.potential_judgment); });

  var students = readTable_('Students').filter(function (st) {
    return st.status === 'active' && consent[normId_(st.student_id)];
  });
  var date = today_();

  var nbHeaders = ['student_id', 'date', 'performance_score', 'potential_score',
    'performance_band', 'potential_band', 'category', 'readiness_band', 'parameters_version'];
  var out = [];

  students.forEach(function (st) {
    var k = normId_(st.student_id);

    var reviews = reviewsIdx[k] || [];
    var rm = null;
    if (reviews.length) {
      var avg = function (f) { return mean_(reviews.map(function (r) { return Number(r[f]); })); };
      rm = {
        perf: mean_([avg('subject_mastery'), avg('assignment_completion'), avg('exam_readiness')]),
        pot: mean_([avg('learning_consistency'), avg('critical_thinking'), avg('motivation')]),
      };
    }

    var grades = gradesIdx[k] || [];
    var gradeAvg = grades.length ? normGrade(mean_(grades.map(function (g) { return Number(g.score); }))) : null;

    var skills = skillsIdx[k] || [];
    var byDate = {};
    skills.forEach(function (x) {
      if (String(x.source_reference).indexOf('Tryout') !== -1) (byDate[x.date] = byDate[x.date] || []).push(Number(x.level));
    });
    var mocks = Object.keys(byDate).sort().map(function (d) { return mean_(byDate[d]); });

    // Latest level per skill row 1-6 for the readiness index.
    var latest = {};
    skills.forEach(function (x) {
      var id = Number(x.skill_id);
      if (id >= 1 && id <= 6 && (!latest[id] || String(x.date) > String(latest[id].date))) latest[id] = { level: Number(x.level), date: x.date };
    });
    var levels = Object.keys(latest).map(function (id) { return latest[id].level; });

    var perf = computePerformance({
      grade_avg: gradeAvg,
      mock_composite: mocks.length ? mocks[mocks.length - 1] : null,
      teacher_perf: rm ? rm.perf : null,
    });
    var pot = computePotential({
      teacher_potential: rm ? rm.pot : null,
      counselor_judgment: counselor[k] != null ? counselor[k] : null,
      mock_composites: mocks,
    });
    var perfBand = whichBand(perf.score), potBand = whichBand(pot.score);
    var readiness = levels.length ? computeReadiness(levels) : null;

    out.push([st.student_id, date, perf.score, pot.score, perfBand, potBand,
      nineBoxCategory(perfBand, potBand), readiness != null ? whichBand(readiness) : '', PARAMS_VERSION]);
  });

  if (out.length) {
    var sh = sheet_('Nine_Box_Results');
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      sh.getRange(sh.getLastRow() + 1, 1, out.length, nbHeaders.length).setValues(out);
    } finally {
      lock.releaseLock();
    }
  }
  return { _audit: 'Nine_Box_Results (' + out.length + ')', scored: out.length, date: date };
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

// Student-safe readiness: only the band + movement, never the nine-box cell,
// category, or component scores (spec §9.3 — students don't see the grid).
function getMyReadiness_(p, s) {
  if (s.role === 'student' && s.user_id !== p.student_id) throw new Error('Tidak diizinkan');
  var rows = readTable_('Nine_Box_Results').filter(function (x) { return x.student_id === p.student_id; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  return {
    band: rows[0] ? rows[0].readiness_band : null,
    date: rows[0] ? rows[0].date : null,
    previous_band: rows[1] ? rows[1].readiness_band : null,
  };
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
    if (consent[normId_(st.student_id)]) withConsent++;
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
// Students & Subjects are reference data (roster, subject master); the rest
// are scoring inputs.
var IMPORTABLE = {
  Students: ['student_id', 'name', 'class', 'academic_year', 'status'],
  Subjects: ['subject_id', 'name', 'group'],
  Grades: ['student_id', 'subject_id', 'semester', 'score', 'source', 'import_date'],
  Mock_Tests: ['test_id', 'student_id', 'date', 'provider', 'subtest', 'score', 'percentile'],
  Skills_Matrix: ['student_id', 'skill_id', 'level', 'source_reference', 'date'],
  Counselor_Notes: ['note_id', 'student_id', 'counselor_id', 'date', 'note', 'potential_judgment'],
  Consent: ['student_id', 'student_consent_date', 'parent_consent_date', 'consent_scope', 'withdrawal_date'],
};

// Consent gate applies only to scoring-input tables. Reference data
// (Students, Subjects) and the consent records themselves are never gated —
// a roster must exist before consent can be recorded against it.
var CONSENT_GATED = { Grades: 1, Mock_Tests: 1, Skills_Matrix: 1, Counselor_Notes: 1 };

function importRows_(p, s) {
  var table = p.table;
  if (!IMPORTABLE[table]) throw new Error('Tabel tidak boleh diimpor: ' + table);
  var rows = p.rows || [];
  if (!rows.length) throw new Error('Tidak ada baris untuk diimpor');
  var gated = !!CONSENT_GATED[table];
  var consent = gated ? consentSet_() : null;
  var skipped = 0;

  // Build all accepted rows, then write them in ONE setValues call. Appending
  // row-by-row would issue thousands of writes and time out on large imports.
  var sh = sheet_(table);
  var headers = sh.getDataRange().getValues()[0];
  var matrix = [];
  rows.forEach(function (row) {
    if (gated && row.student_id && !consent[normId_(row.student_id)]) { skipped++; return; }
    if (table === 'Grades' || table === 'Mock_Tests') row.import_date = row.import_date || today_();
    matrix.push(headers.map(function (h) { return row[h] != null ? row[h] : ''; }));
  });

  if (matrix.length) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      sh.getRange(sh.getLastRow() + 1, 1, matrix.length, headers.length).setValues(matrix);
    } finally {
      lock.releaseLock();
    }
  }
  return { _audit: 'import ' + table + ' (' + matrix.length + ')', imported: matrix.length, skipped_no_consent: skipped };
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
      consent: !!consent[normId_(st.student_id)],
      readiness_band: nb ? nb.readiness_band : null,
      category: nb ? nb.category : null,
      at_risk: !!(nb && nb.readiness_band === 'Low'),
      intervention_status: pl ? (pl.approval_date ? pl.status || 'planned' : 'draft') : 'none',
    };
  });
}

/* --- Major recommendation (Blueprint Module D): cluster fit + readiness --- */

function latestSkillLevels_(studentId) {
  var skills = {};
  readTable_('Skills_Matrix').filter(function (x) { return x.student_id === studentId; })
    .forEach(function (x) {
      var k = String(x.skill_id);
      if (!skills[k] || String(x.date) > String(skills[k].date)) skills[k] = { level: Number(x.level), date: x.date };
    });
  return skills;
}

function gradesBySubject_(studentId) {
  var g = {};
  readTable_('Grades').filter(function (x) { return x.student_id === studentId; })
    .forEach(function (x) { (g[x.subject_id] = g[x.subject_id] || []).push(Number(x.score)); });
  return g;
}

function getRecommendation_(p, s) {
  var sid = p.student_id;
  if (s.role === 'wali_kelas') {
    var st = readTable_('Students').filter(function (x) { return x.student_id === sid; })[0];
    if (!st || st['class'] !== s['class']) throw new Error('Bukan kelas binaan Anda');
  }
  var clusters = readTable_('Major_Clusters').filter(function (c) { return String(c.is_active) === 'true'; });
  var grades = gradesBySubject_(sid);
  var skills = latestSkillLevels_(sid);
  var interests = readTable_('Career_Interests').filter(function (x) { return x.student_id === sid; });
  var interestMajors = interests.map(function (i) { return String(i.major).toLowerCase(); }).filter(Boolean);
  var hasAnyInterest = interestMajors.length > 0;
  var counselor = null;
  readTable_('Counselor_Notes').filter(function (n) { return n.student_id === sid; })
    .forEach(function (n) { counselor = Number(n.potential_judgment); });

  var results = clusters.map(function (c) {
    var primary = String(c.primary_subjects).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var domains = String(c.snbt_domains).split(',').map(function (x) { return x.trim(); }).filter(Boolean);

    var gv = [];
    primary.forEach(function (sub) {
      if (grades[sub] && grades[sub].length) { var lvl = normGrade(mean_(grades[sub])); if (lvl != null) gv.push(lvl); }
    });
    var academic = gv.length ? mean_(gv) : null;

    var sv = [];
    domains.forEach(function (d) { if (skills[d]) sv.push(skills[d].level); });
    var snbt = sv.length ? mean_(sv) : null;

    var related = String(c.related_majors).toLowerCase();
    var matched = interestMajors.some(function (m) {
      if (related.indexOf(m) !== -1) return true;
      return m.split(/\s+/).some(function (w) { return w.length > 3 && related.indexOf(w) !== -1; });
    });
    var interestScore = hasAnyInterest ? (matched ? 5 : 2) : null;

    var fit = computeMajorFit({ academic: academic, snbt: snbt, interest: interestScore, counselor: counselor });
    var ev = [];
    if (academic != null) ev.push('Akademik ' + academic.toFixed(1));
    if (snbt != null) ev.push('Kesiapan SNBT ' + snbt.toFixed(1));
    if (matched) ev.push('Minat sesuai');
    return {
      cluster_code: c.cluster_code, name_id: c.name_id, related_majors: c.related_majors,
      fit_score: fit.score, fit_level: fitLevel(fit.score, hasAnyInterest),
      readiness_level: readinessLevel(snbt), matched_interest: matched,
      evidence: ev.join('; '), interventions: c.interventions,
    };
  });

  results.sort(function (a, b) { return (b.fit_score || 0) - (a.fit_score || 0); });
  var top = results.slice(0, 3);
  var topCodes = {}; top.forEach(function (r) { topCodes[r.cluster_code] = 1; });
  var exploration = null;
  for (var i = 0; i < results.length; i++) {
    if (!topCodes[results[i].cluster_code] && results[i].matched_interest) { exploration = results[i]; break; }
  }
  return {
    top: top,
    backup: results[3] || null,
    exploration: exploration || results[4] || null,
    parameters_version: PARAMS_VERSION,
  };
}

/* --- Monthly intervention review / progress loop (Blueprint Module E) --- */

var BAND_ORDER = { Low: 1, Medium: 2, High: 3 };

function getMonthlyReviews_(p, s) {
  var sid = p.student_id;
  if (s.role === 'student' && s.user_id !== sid) throw new Error('Tidak diizinkan');
  if (s.role === 'wali_kelas') {
    var st = readTable_('Students').filter(function (x) { return x.student_id === sid; })[0];
    if (!st || st['class'] !== s['class']) throw new Error('Bukan kelas binaan Anda');
  }
  var rows = readTable_('Monthly_Reviews').filter(function (x) { return x.student_id === sid; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  // Students see a trimmed view (no raw counselor action text).
  if (s.role === 'student') {
    return rows.map(function (r) {
      return { date: r.date, academic_status: r.academic_status, readiness_update: r.readiness_update,
        assigned_drills: r.assigned_drills, next_target: r.next_target, progress_response: r.progress_response };
    });
  }
  return rows;
}

function saveMonthlyReview_(p, s) {
  var sid = p.student_id;
  if (s.role === 'wali_kelas') {
    var st = readTable_('Students').filter(function (x) { return x.student_id === sid; })[0];
    if (!st || st['class'] !== s['class']) throw new Error('Bukan kelas binaan Anda');
  }
  // Progress-Response derived from nine-box readiness movement (last two placements).
  var nb = readTable_('Nine_Box_Results').filter(function (x) { return x.student_id === sid; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  var progress = 'Belum ada data';
  if (nb[0] && nb[1]) {
    var d = (BAND_ORDER[nb[0].readiness_band] || 0) - (BAND_ORDER[nb[1].readiness_band] || 0);
    progress = d > 0 ? 'Naik' : d < 0 ? 'Turun' : 'Stabil';
  }
  appendRow_('Monthly_Reviews', {
    review_id: Utilities.getUuid(), student_id: sid, date: today_(),
    academic_status: p.academic_status || '', readiness_update: p.readiness_update || '',
    priority_weakness: p.priority_weakness || '', assigned_drills: p.assigned_drills || '',
    counselor_action: p.counselor_action || '', parent_note: p.parent_note || '',
    next_target: p.next_target || '', progress_response: progress,
  });
  return { _audit: 'Monthly_Reviews/' + sid, saved: true, progress_response: progress };
}
