import { Outlet, RouterProvider, ScrollRestoration, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute, { HomeRedirect, PublicOnlyRoute } from './components/layout/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import ServerWakeBanner from './components/layout/ServerWakeBanner';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import OnboardingPage from './pages/student/OnboardingPage';
import AdminLoginPage from './pages/auth/AdminLoginPage';
import DashboardPage from './pages/student/DashboardPage';
import DrivesPage from './pages/student/DrivesPage';
import DriveDetailsPage from './pages/student/DriveDetailsPage';
import ApplicationsPage from './pages/student/ApplicationsPage';
import JobsPage from './pages/student/JobsPage';
import ProfilePage from './pages/student/ProfilePage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import ManageDrivesPage from './pages/admin/ManageDrivesPage';
import DriveFormPage from './pages/admin/DriveFormPage';
import ApplicantsPage from './pages/admin/ApplicantsPage';
import AnnouncementsPage from './pages/admin/AnnouncementsPage';
import StudentsPage from './pages/admin/StudentsPage';
import NotFoundPage from './pages/NotFoundPage';
import RouteError from './pages/RouteError';

function Root() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ServerWakeBanner />
          <Outlet />
          <ScrollRestoration />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

// Route table: docs/architecture.md section 5.1
const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <SignupPage /> },
          { path: '/admin/login', element: <AdminLoginPage /> },
        ],
      },
      {
        element: <ProtectedRoute role="student" />,
        children: [
          { path: '/onboarding', element: <OnboardingPage /> },
          {
            element: <AppShell variant="student" />,
            children: [
              { path: '/student', element: <DashboardPage /> },
              { path: '/student/drives', element: <DrivesPage /> },
              { path: '/student/drives/:id', element: <DriveDetailsPage /> },
              { path: '/student/applications', element: <ApplicationsPage /> },
              { path: '/student/jobs', element: <JobsPage /> },
              { path: '/student/profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute role="admin" />,
        children: [
          {
            element: <AppShell variant="admin" />,
            children: [
              { path: '/admin', element: <AdminDashboardPage /> },
              { path: '/admin/drives', element: <ManageDrivesPage /> },
              { path: '/admin/drives/new', element: <DriveFormPage /> },
              { path: '/admin/drives/:id/edit', element: <DriveFormPage key="edit" /> },
              { path: '/admin/drives/:id/applicants', element: <ApplicantsPage /> },
              { path: '/admin/students', element: <StudentsPage /> },
              { path: '/admin/announcements', element: <AnnouncementsPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

export default function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
