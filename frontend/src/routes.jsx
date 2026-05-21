// src/routes.jsx — all route definitions
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute, { PublicOnlyRoute } from './components/Layout/ProtectedRoute.jsx';
import LoginPage        from './features/auth/LoginPage.jsx';
import RaiseIssuePage   from './features/public/RaiseIssuePage.jsx';
import SuccessPage      from './features/public/SuccessPage.jsx';

// Lazy-load heavier feature pages
import { lazy, Suspense } from 'react';
import Loader from './components/Loader';

const AdminDashboard  = lazy(() => import('./features/admin/Dashboard.jsx'));
const Roles           = lazy(() => import('./features/admin/Roles.jsx'));
const Team            = lazy(() => import('./features/admin/Team.jsx'));
const Customers       = lazy(() => import('./features/admin/Customers.jsx'));
const Reports         = lazy(() => import('./features/admin/Reports.jsx'));
const AuditTrails     = lazy(() => import('./features/admin/AuditTrails.jsx'));
const Pipeline        = lazy(() => import('./features/admin/Pipeline.jsx'));
const Broadcasts      = lazy(() => import('./features/admin/Broadcasts.jsx'));
const SupportDashboard= lazy(() => import('./features/support/Dashboard.jsx'));
const IssuesList      = lazy(() => import('./features/support/IssuesList.jsx'));
const SearchIssues    = lazy(() => import('./features/support/SearchIssues.jsx'));
const CannedResponses = lazy(() => import('./features/support/CannedResponses.jsx'));

const wrap = (el) => <Suspense fallback={<Loader />}>{el}</Suspense>;
const P    = (props) => <ProtectedRoute {...props} />;
const A    = (props) => <ProtectedRoute allowedRoles={['admin']} {...props} />;

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public — no login */}
      <Route path="/support"          element={<RaiseIssuePage />} />
      <Route path="/support/success"  element={<SuccessPage />} />

      {/* Auth */}
      <Route path="/login"  element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

      {/* Redirects */}
      <Route path="/"       element={<Navigate to="/inbox" replace />} />

      {/* All authenticated users */}
      <Route path="/inbox"      element={<P>{wrap(<IssuesList />)}</P>} />
      <Route path="/search"     element={<P>{wrap(<SearchIssues />)}</P>} />
      <Route path="/dashboard"  element={<P>{wrap(<SupportDashboard />)}</P>} />
      <Route path="/contacts"   element={<P>{wrap(<Customers />)}</P>} />
      <Route path="/pipeline"   element={<P>{wrap(<Pipeline />)}</P>} />
      <Route path="/canned"     element={<P>{wrap(<CannedResponses />)}</P>} />

      {/* Admin only */}
      <Route path="/admin"              element={<A>{wrap(<AdminDashboard />)}</A>} />
      <Route path="/admin/roles"        element={<A>{wrap(<Roles />)}</A>} />
      <Route path="/admin/team"         element={<A>{wrap(<Team />)}</A>} />
      <Route path="/admin/reports"      element={<A>{wrap(<Reports />)}</A>} />
      <Route path="/admin/audit"        element={<A>{wrap(<AuditTrails />)}</A>} />
      <Route path="/broadcasts"         element={<A>{wrap(<Broadcasts />)}</A>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/inbox" replace />} />
    </Routes>
  );
}
