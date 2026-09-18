import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CertificatePage from './pages/CertificatePage';
import { AdminAuthProvider } from './hooks/useAdminAuth';
import { RequireAdmin } from './components/RequireAdmin';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminCohortPage from './pages/admin/AdminCohortPage';
import AdminSubmissionReviewPage from './pages/admin/AdminSubmissionReviewPage';
import AdminUploadEmailsPage from './pages/admin/AdminUploadEmailsPage';
import FinishSignInPage from './pages/FinishSignInPage';

function RequireAuth({ children }) {
  const { student } = useAuth();
  if (!student) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/finishSignIn" element={<FinishSignInPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/certificate"
          element={
            <RequireAuth>
              <CertificatePage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/login"
          element={
            <AdminAuthProvider>
              <AdminLoginPage />
            </AdminAuthProvider>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminAuthProvider>
              <RequireAdmin>
                <AdminDashboardPage />
              </RequireAdmin>
            </AdminAuthProvider>
          }
        />
        <Route
          path="/admin/cohorts/:cohortId"
          element={
            <AdminAuthProvider>
              <RequireAdmin>
                <AdminCohortPage />
              </RequireAdmin>
            </AdminAuthProvider>
          }
        />
        <Route
          path="/admin/submissions/:submissionId"
          element={
            <AdminAuthProvider>
              <RequireAdmin>
                <AdminSubmissionReviewPage />
              </RequireAdmin>
            </AdminAuthProvider>
          }
        />
        <Route
          path="/admin/upload-emails"
          element={
            <AdminAuthProvider>
              <RequireAdmin>
                <AdminUploadEmailsPage />
              </RequireAdmin>
            </AdminAuthProvider>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
