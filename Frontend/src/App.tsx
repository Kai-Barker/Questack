import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import AuthShell from './components/auth/AuthShell';
import GuestOnly from './components/auth/GuestOnly';
import BootGate from './components/boot/BootGate';
import RequireAuth from './components/auth/RequireAuth';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider } from './context/AuthProvider';
import AuthInfoPage from './pages/AuthInfoPage';
import DashboardPage from './pages/DashboardPage';
import EnlistPage from './pages/EnlistPage';
import LoginPage from './pages/LoginPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ProfilePage from './pages/ProfilePage';
import SectorPage from './pages/SectorPage';

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
              { index: true, element: <DashboardPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'settings', element: <PlaceholderPage title="Settings" /> },
              { path: 'sector/:sectorId', element: <SectorPage /> },
              // Loaded on demand: the code editor is big, and only this screen needs it
              { path: 'quest/:questId', lazy: async () => ({ Component: (await import('./pages/QuestPage')).default }) },
              { path: 'decoder', element: <PlaceholderPage title="Decode a transmission" /> },
              { path: '*', element: <PlaceholderPage title="Uncharted space" /> },
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
