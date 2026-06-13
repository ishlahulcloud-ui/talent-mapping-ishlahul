import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import ProtectedRoute, { defaultRoute } from './components/layout/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import StudentsPage from './pages/StudentsPage.jsx';
import StudentDetailPage from './pages/StudentDetailPage.jsx';
import ReportPrintPage from './pages/ReportPrintPage.jsx';
import TeacherReviewPage from './pages/TeacherReviewPage.jsx';
import MyMapPage from './pages/MyMapPage.jsx';
import InterestsPage from './pages/InterestsPage.jsx';
import ImportPage from './pages/ImportPage.jsx';
import TopGapsPage from './pages/TopGapsPage.jsx';
import AtRiskPage from './pages/AtRiskPage.jsx';

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? defaultRoute(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute roles={['admin', 'principal', 'bk', 'wali_kelas']}><DashboardPage /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute roles={['admin', 'principal', 'bk', 'wali_kelas']}><StudentsPage /></ProtectedRoute>} />
          <Route path="/students/:id" element={<ProtectedRoute roles={['admin', 'principal', 'bk', 'wali_kelas']}><StudentDetailPage /></ProtectedRoute>} />
          <Route path="/students/:id/report" element={<ProtectedRoute roles={['admin', 'principal', 'bk', 'wali_kelas']}><ReportPrintPage /></ProtectedRoute>} />
          <Route path="/gaps" element={<ProtectedRoute roles={['admin', 'principal', 'bk', 'teacher']}><TopGapsPage /></ProtectedRoute>} />
          <Route path="/at-risk" element={<ProtectedRoute roles={['bk', 'wali_kelas']}><AtRiskPage /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute roles={['admin']}><ImportPage /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute roles={['teacher', 'wali_kelas']}><TeacherReviewPage /></ProtectedRoute>} />
          <Route path="/my-map" element={<ProtectedRoute roles={['student']}><MyMapPage /></ProtectedRoute>} />
          <Route path="/interests" element={<ProtectedRoute roles={['student']}><InterestsPage /></ProtectedRoute>} />
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
