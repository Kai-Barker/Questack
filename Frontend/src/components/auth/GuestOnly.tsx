import { Navigate, Outlet, useSearchParams } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { safeNextPath } from '../../utils/redirect';

// Login and Enlist are for signed-out pilots; anyone signed in goes on to the app
export default function GuestOnly() {
  const { status } = useAuth();
  const [params] = useSearchParams();

  if (status === 'authenticated') return <Navigate to={safeNextPath(params.get('next'))} replace />;
  return <Outlet />;
}
