import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { PageLoader, Alert } from './components/ui.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProfileForm from './pages/ProfileForm.jsx';
import QrPage from './pages/QrPage.jsx';
import Scan from './pages/Scan.jsx';
import NotFound from './pages/NotFound.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your session" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Layout>{children}</Layout>;
}

/**
 * `redirectTo` matters on /signup. The moment sign-up succeeds this guard
 * re-renders with a user and redirects, which beats any navigate() inside the
 * page itself. So the destination for a freshly created account has to be
 * decided here, not in Signup.jsx.
 */
function Public({ children, redirectWhenSignedIn = false, redirectTo = '/dashboard' }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user && redirectWhenSignedIn) return <Navigate to={redirectTo} replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { configError } = useAuth();

  if (configError) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Alert tone="error" title="Configuration problem">
          {configError}
        </Alert>
      </div>
    );
  }

  return (
    <Routes>
      {/*
        The scan route is intentionally outside Layout and outside any auth
        check. It is the one page a stranger reaches, and it must render with
        no session, no nav, and nothing to click away to.
      */}
      <Route path="/s/:publicId" element={<Scan />} />

      <Route path="/" element={<Public redirectWhenSignedIn><Landing /></Public>} />
      <Route path="/login" element={<Public redirectWhenSignedIn><Login /></Public>} />
      {/* A new account with no medical data on it is useless, so a completed
          sign-up goes straight to the profile form rather than an empty dashboard. */}
      <Route
        path="/signup"
        element={
          <Public redirectWhenSignedIn redirectTo="/profile">
            <Signup />
          </Public>
        }
      />

      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/profile" element={<Protected><ProfileForm /></Protected>} />
      <Route path="/qr" element={<Protected><QrPage /></Protected>} />

      <Route path="*" element={<Public><NotFound /></Public>} />
    </Routes>
  );
}
