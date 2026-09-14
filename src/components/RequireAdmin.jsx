import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';

export function RequireAdmin({ children }) {
  const { admin, adminLoading } = useAdminAuth();
  if (adminLoading) return null; // useAdminAuth already shows its own loading screen
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}
