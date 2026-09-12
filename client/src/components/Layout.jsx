import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Logo } from './ui.jsx';

/**
 * Chrome for the owner-facing pages. Deliberately NOT used by the scan page,
 * which stays a bare, single-purpose document with nothing to navigate to.
 */
export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to={user ? '/dashboard' : '/'} className="text-lg text-slate-900">
            <Logo />
          </Link>

          {user ? (
            <nav className="flex items-center gap-1">
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/profile" className={linkClass}>
                Profile
              </NavLink>
              <NavLink to="/qr" className={linkClass}>
                My QR
              </NavLink>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="ml-1">
                Sign out
              </Button>
            </nav>
          ) : (
            <nav className="flex items-center gap-2">
              <Button as={Link} to="/login" variant="ghost" size="sm">
                Sign in
              </Button>
              <Button as={Link} to="/signup" size="sm">
                Get started
              </Button>
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs leading-relaxed text-slate-500">
          <p className="font-semibold text-slate-600">
            VitalQR is a decision aid, not a medical device.
          </p>
          <p className="mt-1">
            It does not replace clinical assessment or emergency services. Blood group shown on a
            profile must be confirmed by crossmatch before transfusion. In an emergency, call your
            local emergency number first.
          </p>
          <p className="mt-3 text-slate-400">
            B.Tech CSE (Health Informatics) &middot; VIT Bhopal University &middot; DSN2098 Project
            Exhibition-I
          </p>
        </div>
      </footer>
    </div>
  );
}
