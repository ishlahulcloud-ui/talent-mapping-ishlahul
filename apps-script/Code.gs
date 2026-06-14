/**
 * Code.gs — request router, auth, role checks, audit, and feature endpoints.
 *
 * Transport: the frontend POSTs a text/plain body containing JSON
 * { action, token, payload }. text/plain is a CORS "simple request" so no
 * preflight is triggered, and — unlike the finance apps' GET pattern — no
 * student data is placed in the URL or server logs (spec v1.1 §13.2, §15).
 *
 * doGet only serves a health check; it never returns student data.
 */

function doGet() {
  return jsonOut_({ status: 'ok', service: 'talent-mapping-ma', params_version: PARAMS_VERSION });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = req.action;
    if (!action) return jsonOut_({ status: 'error', message: 'Missing action' });

    var handler = ROUTES[action];
    if (!handler) return jsonOut_({ status: 'error', message: 'Unknown action: ' + action });

    // login is the only unauthenticated route.
    var session = null;
    if (action !== 'login') {
      session = resolveSession_(req.token);
      if (!session) return jsonOut_({ status: 'error', code: 'UNAUTHENTICATED', message: 'Invalid or expired session' });
      if (handler.roles && handler.roles.indexOf(session.role) === -1) {
        return jsonOut_({ status: 'error', code: 'FORBIDDEN', message: 'Role not allowed for ' + action });
      }
    }

    var result = handler.fn(req.payload || {}, session);
    if (handler.write) audit_(session, action, result && result._audit, req.payload);
    if (result && result._audit) delete result._audit;
    return jsonOut_({ status: 'ok', data: result });
  } catch (err) {
    return jsonOut_({ status: 'error', message: String(err && err.message || err) });
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ----------------------------- Auth ----------------------------- */

function hashPin_(pin, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(pin) + '::' + String(salt));
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function login_(payload) {
  if (payload.method === 'student') {
    var u = findUserByStudent_(payload.nisn);
    if (!u || u.auth_method !== 'pin' || u.status !== 'active') throw new Error('NISN tidak ditemukan');
    if (u.credential_ref !== hashPin_(payload.pin, u.user_id)) throw new Error('PIN salah');
    return issueSession_(u);
  }
  // Staff: verify the Google id_token audience + email, then match Users.
  var info = verifyGoogleToken_(payload.id_token);
  var staff = findUserByEmail_(info.email);
  if (!staff || staff.status !== 'active') throw new Error('Akun tidak terdaftar: ' + info.email);
  return issueSession_(staff);
}

function verifyGoogleToken_(idToken) {
  var clientId = PropertiesService.getScriptProperties().getProperty('GIS_CLIENT_ID');
  var resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  var info = JSON.parse(resp.getContentText());
  if (info.error_description) throw new Error('Token tidak valid');
  if (clientId && info.aud !== clientId) throw new Error('Audience token tidak cocok');
  return info;
}

function issueSession_(user) {
  var token = Utilities.getUuid();
  var session = { token: token, user_id: user.user_id, role: user.role, name: user.name, class: user['class'] || '' };
  CacheService.getScriptCache().put('sess_' + token, JSON.stringify(session), 6 * 60 * 60);
  return { token: token, user: { user_id: user.user_id, name: user.name, role: user.role, class: user['class'] || '' } };
}

function resolveSession_(token) {
  if (!token) return null;
  var raw = CacheService.getScriptCache().get('sess_' + token);
  return raw ? JSON.parse(raw) : null;
}

/* ----------------------------- Sheet helpers ----------------------------- */

function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function readTable_(name) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function appendRow_(name, obj) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_(name);
    var headers = sh.getDataRange().getValues()[0];
    sh.appendRow(headers.map(function (h) { return obj[h] != null ? obj[h] : ''; }));
  } finally {
    lock.releaseLock();
  }
}

function updateRow_(name, keyField, keyValue, patch) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_(name);
    var values = sh.getDataRange().getValues();
    var headers = values[0];
    var keyCol = headers.indexOf(keyField);
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][keyCol]) === String(keyValue)) {
        headers.forEach(function (h, c) { if (patch[h] != null) sh.getRange(r + 1, c + 1).setValue(patch[h]); });
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}

function findUserByEmail_(email) {
  var rows = readTable_('Users');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].credential_ref).toLowerCase() === String(email).toLowerCase() && rows[i].auth_method === 'gis') return rows[i];
  return null;
}
function findUserByStudent_(nisn) {
  var rows = readTable_('Users');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].user_id) === String(nisn) && rows[i].role === 'student') return rows[i];
  return null;
}

function audit_(session, action, recordAffected, payload) {
  var auditId = PropertiesService.getScriptProperties().getProperty('AUDIT_SPREADSHEET_ID');
  var ss = auditId ? SpreadsheetApp.openById(auditId) : SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Audit_Logs');
  if (!sh) return;
  var detail = '';
  try { detail = JSON.stringify(payload).slice(0, 500); } catch (e) {}
  sh.appendRow([new Date(), session ? session.user_id : '', session ? session.role : '', action, recordAffected || '', detail]);
}

/* ----------------------------- Routes ----------------------------- */

var STAFF = ['admin', 'principal', 'bk', 'wali_kelas', 'teacher'];

var ROUTES = {
  login: { fn: function (p) { return login_(p); } },

  me: { fn: function (p, s) { return { user_id: s.user_id, name: s.name, role: s.role, class: s['class'] }; } },

  // Feature 1 — Student profile + completeness
  listStudents: { roles: ['admin', 'principal', 'bk', 'wali_kelas'], fn: function (p, s) { return listStudents_(p, s); } },
  getStudent: { roles: STAFF.concat(['student']), fn: function (p, s) { return getStudent_(p, s); } },
  saveInterests: { roles: ['student', 'bk', 'admin'], write: true, fn: function (p, s) { return saveInterests_(p, s); } },

  // Feature 2 — Teacher review
  myStudents: { roles: ['teacher', 'wali_kelas'], fn: function (p, s) { return myStudents_(p, s); } },
  saveReview: { roles: ['teacher', 'wali_kelas'], write: true, fn: function (p, s) { return saveReview_(p, s); } },

  // Feature 3 — Skills matrix
  getMatrix: { roles: STAFF.concat(['student']), fn: function (p, s) { return getMatrix_(p, s); } },

  // Feature 1 feeder — admin bulk import
  importRows: { roles: ['admin'], write: true, fn: function (p, s) { return importRows_(p, s); } },

  // Feature 4 — Nine-box + scoring run
  runScoring: { roles: ['admin', 'bk'], write: true, fn: function (p, s) { return runScoring_(p, s); } },
  getNineBox: { roles: STAFF, fn: function (p, s) { return getNineBox_(p, s); } },
  getMyReadiness: { roles: ['student'], fn: function (p, s) { return getMyReadiness_(p, s); } },
  cohortDashboard: { roles: ['admin', 'principal', 'bk', 'wali_kelas'], fn: function (p, s) { return cohortDashboard_(p, s); } },
  classView: { roles: ['admin', 'principal', 'bk', 'wali_kelas'], fn: function (p, s) { return classView_(p, s); } },
  topGaps: { roles: ['admin', 'principal', 'bk', 'teacher'], fn: function (p, s) { return topGaps_(p, s); } },
  atRisk: { roles: ['bk', 'wali_kelas'], fn: function (p, s) { return atRisk_(p, s); } },

  // Feature 5 — Recommendation report + counselor approval gate
  getReport: { roles: STAFF.concat(['student']), fn: function (p, s) { return getReport_(p, s); } },
  saveReport: { roles: ['bk'], write: true, fn: function (p, s) { return saveReport_(p, s); } },
  approveReport: { roles: ['bk'], write: true, fn: function (p, s) { return approveReport_(p, s); } },
};

/* See Endpoints.gs for the endpoint implementations. */
