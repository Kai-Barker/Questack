import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

// Wraps admin-only screens, inside RequireAuth. Pilots without the admin role
// are sent back to the Galaxy Map. This only hides the screen: the backend
// checks the role again on every admin request.
export default function RequireAdmin() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
