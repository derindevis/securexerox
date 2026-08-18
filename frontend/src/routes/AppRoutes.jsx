import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// Pages
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import OAuthCallback from '../pages/OAuthCallback';

// Customer pages
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import UploadDocument from '../pages/customer/UploadDocument';
import PrintIDPage from '../pages/customer/PrintIDPage';
import CustomerJobs from '../pages/customer/CustomerJobs';
import JobDetails from '../pages/customer/JobDetails';

// Shop pages
import ShopDashboard from '../pages/shop/ShopDashboard';
import PrintDocument from '../pages/shop/PrintDocument';
import SecurePrint from '../pages/shop/SecurePrint';
import PrintQueuePage from '../pages/shop/PrintQueuePage';
import PrintHistory from '../pages/shop/PrintHistory';

// Auth guard
function ProtectedRoute({ children, role }) {
  const { isAuthenticated, currentUser } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && currentUser?.role !== role) {
    return <Navigate to={currentUser?.role === 'customer' ? '/customer/dashboard' : '/shop/dashboard'} replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />

      {/* Customer */}
      <Route
        path="/customer/dashboard"
        element={<ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>}
      />
      <Route
        path="/customer/upload"
        element={<ProtectedRoute role="customer"><UploadDocument /></ProtectedRoute>}
      />
      <Route
        path="/customer/print-id/:jobId"
        element={<ProtectedRoute role="customer"><PrintIDPage /></ProtectedRoute>}
      />
      <Route
        path="/customer/jobs"
        element={<ProtectedRoute role="customer"><CustomerJobs /></ProtectedRoute>}
      />
      <Route
        path="/customer/jobs/:jobId"
        element={<ProtectedRoute role="customer"><JobDetails /></ProtectedRoute>}
      />

      {/* Shop */}
      <Route
        path="/shop/dashboard"
        element={<ProtectedRoute role="shop"><ShopDashboard /></ProtectedRoute>}
      />
      <Route
        path="/shop/print"
        element={<ProtectedRoute role="shop"><PrintDocument /></ProtectedRoute>}
      />
      <Route
        path="/shop/secure-print/:jobId"
        element={<ProtectedRoute role="shop"><SecurePrint /></ProtectedRoute>}
      />
      <Route
        path="/shop/queue"
        element={<ProtectedRoute role="shop"><PrintQueuePage /></ProtectedRoute>}
      />
      <Route
        path="/shop/history"
        element={<ProtectedRoute role="shop"><PrintHistory /></ProtectedRoute>}
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
