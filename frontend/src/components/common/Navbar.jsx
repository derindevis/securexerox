import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ShieldCheck, X, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function Navbar() {
  const { currentUser, isAuthenticated, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = !isAuthenticated
    ? [['Explore', '/'], ['Demo', '/demo']]
    : currentUser?.role === 'customer'
    ? [['Overview', '/customer/dashboard'], ['New print', '/customer/upload'], ['My jobs', '/customer/jobs']]
    : [['Overview', '/shop/dashboard'], ['Verify ID', '/shop/print'], ['Queue', '/shop/queue'], ['History', '/shop/history']];

  const leave = () => { logout(); navigate('/'); };

  return (
    <nav className="sx-nav">
      <div className="sx-nav__inner">
        {/* Brand */}
        <Link to="/" className="sx-brand">
          <span className="sx-brand__mark">
            <ShieldCheck size={16} />
          </span>
          SecureXerox
        </Link>

        {/* Desktop Links */}
        <div className="sx-links">
          {links.map(([label, path]) => (
            <Link
              key={path}
              to={path}
              className={`sx-link ${location.pathname === path ? 'sx-link--active' : ''}`}
            >
              {label}
            </Link>
          ))}
          {!isAuthenticated && (
            <div className="flex items-center gap-2 ml-2">
              <Link
                to="/login?mode=signin"
                className="sx-link inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--surface)] transition-all text-sm font-semibold"
              >
                <LogIn size={13} /> Log In
              </Link>
              <Link
                to="/login?mode=signup"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink)] text-[var(--canvas)] hover:opacity-90 transition-all text-sm font-semibold"
              >
                <UserPlus size={13} /> Sign Up
              </Link>
            </div>
          )}
          {isAuthenticated && (
            <button onClick={leave} className="sx-link inline-flex items-center gap-1.5">
              <LogOut size={14} /> Leave
            </button>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-1.5 rounded-lg hover:bg-black/5 transition-colors"
          aria-label="Toggle navigation"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="border-t border-[var(--line)] px-6 pb-5 md:hidden bg-[var(--canvas)]">
          {links.map(([label, path]) => (
            <Link
              onClick={() => setOpen(false)}
              key={path}
              to={path}
              className="sx-link block py-3"
            >
              {label}
            </Link>
          ))}
          {!isAuthenticated && (
            <div className="flex flex-col gap-2 mt-3">
              <Link onClick={() => setOpen(false)} to="/login?mode=signin" className="sx-link block py-2 font-semibold">
                Log In
              </Link>
              <Link onClick={() => setOpen(false)} to="/login?mode=signup" className="sx-link block py-2 font-semibold">
                Sign Up
              </Link>
            </div>
          )}
          {isAuthenticated && (
            <button onClick={leave} className="sx-link block py-3">Leave session</button>
          )}
        </div>
      )}
    </nav>
  );
}