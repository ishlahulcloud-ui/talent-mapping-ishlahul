/**
 * Scoring.gs — v1 scoring engine, ported from scoring/engine.py.
 * Every constant here mirrors parameters/v1.md. Keep them in sync, and stamp
 * PARAMS_VERSION onto every computed result so past placements are reproducible.
 */

var PARAMS_VERSION = 'v1';

var PERF_WEIGHTS = { grade_avg: 0.35, mock_composite: 0.35, teacher_perf: 0.25, attendance: 0.05 };
var POT_WEIGHTS = { trend: 0.30, teacher_potential: 0.40, counselor_judgment: 0.30 };
var MAJOR_GROUP_WEIGHT = { priority: 1.5, normal: 1.0, low: 0.5 };

function clamp_(v, low, high) {
  low = (low === undefined) ? 1.0 : low;
  high = (high === undefined) ? 5.0 : high;
  return Math.max(low, Math.min(high, v));
}

function mean_(arr) {
  if (!arr.length) return 0;
  var s = 0;
  for (var i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

/** Rapor average (0-100) -> 1-5. parameters/v1.md "Grade Normalization".
 * Cut points are quintiles of the real 2025/2026 PAT distribution (rapor
 * grades cluster tightly ~80-90, so a flat 0-100 map collapses everyone into
 * one band). Recompute per cohort. */
function normGrade(avg100) {
  if (avg100 == null) return null;
  if (avg100 < 82.5) return 1.0;
  if (avg100 < 84.0) return 2.0;
  if (avg100 < 85.2) return 3.0;
  if (avg100 < 86.6) return 4.0;
  return 5.0;
}

/** Attendance percentage -> 1-5. parameters/v1.md "Attendance Normalization". */
function normAttendance(pct) {
  if (pct == null) return null;
  pct = clamp_(pct, 0.0, 100.0);
  if (pct >= 95) return 5.0;
  if (pct >= 90) return 4.0;
  if (pct >= 80) return 3.0;
  if (pct >= 70) return 2.0;
  return 1.0;
}

/**
 * Performance score, renormalizing weights over the available components.
 * grade_avg / mock_composite / teacher_perf are on the 1-5 scale already;
 * attendance is passed as a raw percentage and normalized here.
 */
function computePerformance(opts) {
  var available = {};
  if (opts.grade_avg != null) available.grade_avg = clamp_(opts.grade_avg);
  if (opts.mock_composite != null) available.mock_composite = clamp_(opts.mock_composite);
  if (opts.teacher_perf != null) available.teacher_perf = clamp_(opts.teacher_perf);
  if (opts.attendance_pct != null) available.attendance = normAttendance(opts.attendance_pct);

  var keys = Object.keys(available);
  if (!keys.length) throw new Error('At least one data source is required for performance score.');

  var totalWeight = 0, score = 0;
  keys.forEach(function (k) { totalWeight += PERF_WEIGHTS[k]; score += available[k] * PERF_WEIGHTS[k]; });
  score = score / totalWeight;

  return {
    score: Math.round(score * 1e4) / 1e4,
    renormalized: keys.length !== 4,
    available_inputs: keys,
    raw_parts: available,
  };
}

/** Mean of consecutive deltas over the last 3 mock composites -> 1-5. */
function computeTrend(mockComposites) {
  if (!mockComposites || mockComposites.length < 2) return null;
  var recent = mockComposites.slice(-3);
  var deltas = [];
  for (var i = 1; i < recent.length; i++) deltas.push(recent[i] - recent[i - 1]);
  var avg = mean_(deltas);
  if (avg >= 0.50) return 5.0;
  if (avg >= 0.25) return 4.0;
  if (avg > -0.25) return 3.0;
  if (avg > -0.50) return 2.0;
  return 1.0;
}

/** Potential score; omits trend and renormalizes when <3 mock composites. */
function computePotential(opts) {
  var hasTrend = opts.mock_composites && opts.mock_composites.length >= 3;
  var trend = hasTrend ? computeTrend(opts.mock_composites) : null;

  var available = {};
  if (trend != null) available.trend = clamp_(trend);
  if (opts.teacher_potential != null) available.teacher_potential = clamp_(opts.teacher_potential);
  if (opts.counselor_judgment != null) available.counselor_judgment = clamp_(opts.counselor_judgment);

  var keys = Object.keys(available);
  if (!keys.length) throw new Error('At least one data source is required for potential score.');

  var total = 0;
  keys.forEach(function (k) { total += POT_WEIGHTS[k]; });
  var score = 0;
  keys.forEach(function (k) { score += available[k] * (POT_WEIGHTS[k] / total); });

  return {
    score: Math.round(score * 1e4) / 1e4,
    trend_used: trend,
    renormalized: keys.length !== 3,
    raw_parts: available,
  };
}

/** Threshold bands (no gaps): >=3.75 High, >=2.50 Medium, else Low. */
function whichBand(score) {
  if (score >= 3.75) return 'High';
  if (score >= 2.50) return 'Medium';
  return 'Low';
}

var READINESS_LABELS = { High: 'High readiness', Medium: 'Developing readiness', Low: 'Needs support' };

function readinessLabel(index) {
  return READINESS_LABELS[whichBand(index)];
}

/** Weighted mean sum(w*level)/sum(w) over skills rows 1-6; falls back to mean. */
function computeReadiness(levels, weights) {
  var values = levels.map(function (v) { return clamp_(v); });
  if (!values.length) return 0.0;
  if (weights && weights.length === values.length) {
    var ws = 0; for (var i = 0; i < weights.length; i++) ws += weights[i];
    if (ws > 0) {
      var acc = 0;
      for (var j = 0; j < values.length; j++) acc += values[j] * weights[j];
      return Math.round((acc / ws) * 1e4) / 1e4;
    }
  }
  return Math.round(mean_(values) * 1e4) / 1e4;
}

/** Risk flags. parameters/v1.md "Risk Flag Triggers". */
function flagRisk(opts) {
  var flags = [];
  if (opts.readiness_band === 'Low' && opts.target_competitive) flags.push('R1: readiness low + competitive target');
  if (opts.trend_negative) flags.push('R2: negative mock trend across last two tryouts');
  if (opts.drop_ge_1) flags.push('R3: teacher consistency/motivation drop >= 1.0');
  if (opts.aspiration_mismatch) flags.push('R4: aspiration-profile mismatch >= 1.5 levels');
  return flags;
}

/** Nine-box category label for a (performance band, potential band) pair. */
var NINE_BOX = {
  'High|Low': 'Stable achiever',
  'High|Medium': 'Strong achiever',
  'High|High': 'Top UTBK candidate',
  'Medium|Low': 'Steady developing',
  'Medium|Medium': 'Developing',
  'Medium|High': 'Promising, not yet optimized',
  'Low|Low': 'Foundation building',
  'Low|Medium': 'Emerging',
  'Low|High': 'Hidden potential',
};

function nineBoxCategory(perfBand, potBand) {
  return NINE_BOX[perfBand + '|' + potBand] || 'Developing';
}
