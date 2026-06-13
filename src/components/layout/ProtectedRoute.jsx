import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import AppLayout from './AppLayout.jsx';

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={defaultRoute(user.role)} replace />;
  return <AppLayout>{children}</AppLayout>;
}

export function defaultRoute(role) {
  if (role === 'student') return '/my-map';
  if (role === 'teacher') return '/review';
  return '/dashboard';
}
