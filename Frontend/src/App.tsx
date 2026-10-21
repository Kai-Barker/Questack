import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import AdminLayout from './components/admin/AdminLayout';
import AuthShell from './components/auth/AuthShell';
import GuestOnly from './components/auth/GuestOnly';
import RequireAdmin from './components/auth/RequireAdmin';
import BootGate from './components/boot/BootGate';
import RequireAuth from './components/auth/RequireAuth';
import RequireEnlisted from './components/auth/RequireEnlisted';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider } from './context/AuthProvider';
import AuthInfoPage from './pages/AuthInfoPage';
import DashboardPage from './pages/DashboardPage';
import DecoderPage from './pages/DecoderPage';
import EnlistPage from './pages/EnlistPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ProfilePage from './pages/ProfilePage';
import RouteErrorPage from './pages/RouteErrorPage';
import SectorPage from './pages/SectorPage';
import SettingsPage from './pages/SettingsPage';
import AdminAiPage from './pages/admin/AdminAiPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

// Session first, then the splash/boot sequence, then whichever page was asked for
function AuthRoot() {
  return (
    <AuthProvider>
      <BootGate />
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <AuthRoot />,
    // Last resort: anything that crashes outside the layouts below
    errorElement: <RouteErrorPage />,
    children: [
      // Signed-out screens
      {
        element: <AuthShell />,
        children: [
          {
            element: <GuestOnly />,
            children: [
              { path: 'login', element: <LoginPage /> },
              { path: 'enlist', element: <EnlistPage /> },
            ],
          },
          { path: 'recover', element: <AuthInfoPage page="recover" /> },
          { path: 'terms', element: <AuthInfoPage page="terms" /> },
          { path: 'privacy', element: <AuthInfoPage page="privacy" /> },
        ],
      },
      // Everything else needs a signed-in pilot
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              // Enlistment steps 02-03: picking a first sector, class and concept
              { path: 'onboarding', element: <OnboardingPage /> },
              // Pilots who haven't enlisted in a sector yet are sent to onboarding first
              {
                element: <RequireEnlisted />,
                // A crashed screen keeps the nav bar, so the pilot can fly elsewhere
                errorElement: <RouteErrorPage />,
                children: [
                  { index: true, element: <DashboardPage /> },
                  { path: 'profile', element: <ProfilePage /> },
                  { path: 'settings', element: <SettingsPage /> },
                  { path: 'sector/:sectorId', element: <SectorPage /> },
                  // Loaded on demand: the code editor is big, and only this screen needs it
                  { path: 'quest/:questId', lazy: async () => ({ Component: (await import('./pages/QuestPage')).default }) },
                  { path: 'decoder', element: <DecoderPage /> },
                  { path: '*', element: <PlaceholderPage title="Uncharted space" /> },
                ],
              },
            ],
          },
          // Admin console: its own shell and nav, and no sector enlistment
          // needed. RequireAdmin confirms the role with the backend on entry
          // and on every tab change; the backend checks it on every request too.
          {
            path: 'admin',
            element: <RequireAdmin />,
            children: [
              {
                element: <AdminLayout />,
                errorElement: <RouteErrorPage />,
                children: [
                  { index: true, element: <Navigate to="quests" replace /> },
                  // Loaded on demand, like the Quest screen: it uses the code editor too
                  {
                    path: 'quests',
                    lazy: async () => ({ Component: (await import('./pages/admin/QuestEditorPage')).default }),
                  },
                  { path: 'users', element: <AdminUsersPage /> },
                  { path: 'ai', element: <AdminAiPage /> },
                  { path: '*', element: <Navigate to="/admin/quests" replace /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
