import { Outlet } from 'react-router';
import GalaxyBackdrop from '../ui/GalaxyBackdrop';
import AdminNav from './AdminNav';

// Shell for the admin console: its own nav on top, the admin tab below. It
// sits outside the pilot shell (AppLayout), so none of the pilot's progress
// is loaded here and an admin doesn't need to have enlisted in a sector.
export default function AdminLayout() {
  return (
    <div className="relative isolate min-h-screen text-slate-100">
      <GalaxyBackdrop deep />
      <AdminNav />
      <Outlet />
    </div>
  );
}
