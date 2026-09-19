import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import PmDashboard from './pages/PmDashboard';
import DeveloperDashboard from './pages/DeveloperDashboard';
import TaskListPage from './pages/TaskListPage';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
        <Routes>
          {/* Default: redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public — login page redirects away if already authenticated */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected role dashboards */}
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/pm"
            element={
              <ProtectedRoute allowedRoles={['PM']}>
                <PmDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/developer"
            element={
              <ProtectedRoute allowedRoles={['DEVELOPER']}>
                <DeveloperDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'PM', 'DEVELOPER']}>
                <TaskListPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
