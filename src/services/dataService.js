// THE single entry point between UI and backend. UI components must import
// from here, never from api/client.js directly (mirrors the finance-app rule).

import { gasPost, getToken, setToken } from '../api/client.js';
import { mockDispatch } from './mockData.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// The mock needs the caller's session to enforce role-shaped responses.
let mockSession = null;
try {
  mockSession = JSON.parse(localStorage.getItem('amanah_session') || 'null');
} catch (e) { /* ignore */ }

async function call(action, payload = {}) {
  if (USE_MOCK) return mockDispatch(action, payload, mockSession);
  return gasPost(action, payload);
}

export const dataService = {
  isMock: USE_MOCK,

  async login(creds) {
    const res = await call('login', creds);
    setToken(res.token);
    mockSession = res.user;
    localStorage.setItem('amanah_session', JSON.stringify(res.user));
    return res.user;
  },
  logout() {
    setToken(null);
    mockSession = null;
    localStorage.removeItem('amanah_session');
  },
  currentUser() {
    if (!getToken()) return null;
    try { return JSON.parse(localStorage.getItem('amanah_session') || 'null'); } catch (e) { return null; }
  },

  // Feature 1
  listStudents: () => call('listStudents'),
  getStudent: (student_id) => call('getStudent', { student_id }),
  saveInterests: (student_id, interests) => call('saveInterests', { student_id, interests }),
  // Feature 2
  myStudents: () => call('myStudents'),
  saveReview: (payload) => call('saveReview', payload),
  // Feature 3
  getMatrix: (student_id) => call('getMatrix', { student_id }),
  // Feature 1 feeder
  importRows: (table, rows) => call('importRows', { table, rows }),
  // Feature 4
  runScoring: () => call('runScoring'),
  getNineBox: (student_id) => call('getNineBox', { student_id }),
  getMyReadiness: (student_id) => call('getMyReadiness', { student_id }),
  cohortDashboard: () => call('cohortDashboard'),
  classView: (klass) => call('classView', klass ? { class: klass } : {}),
  topGaps: () => call('topGaps'),
  atRisk: () => call('atRisk'),
  // Feature 5
  getReport: (student_id) => call('getReport', { student_id }),
  saveReport: (payload) => call('saveReport', payload),
  approveReport: (payload) => call('approveReport', payload),
  // Major recommendation (cluster fit) + monthly review loop
  getRecommendation: (student_id) => call('getRecommendation', { student_id }),
  getMonthlyReviews: (student_id) => call('getMonthlyReviews', { student_id }),
  saveMonthlyReview: (payload) => call('saveMonthlyReview', payload),
};
