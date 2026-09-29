import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';
import SectorPage from './pages/SectorPage';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'profile', element: <PlaceholderPage title="Profile" /> },
      { path: 'settings', element: <PlaceholderPage title="Settings" /> },
      { path: 'sector/:sectorId', element: <SectorPage /> },
      // Loaded on demand: the code editor is big, and only this screen needs it
      { path: 'quest/:questId', lazy: async () => ({ Component: (await import('./pages/QuestPage')).default }) },
      { path: 'decoder', element: <PlaceholderPage title="Decode a transmission" /> },
      { path: '*', element: <PlaceholderPage title="Uncharted space" /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
