import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function Navbar() {
  const { currentUser, isAuthenticated, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = !isAuthenticated
    ? [['Explore', '/'], ['Sign in', '/login']]
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
          {isAuthenticated && (
            <button onClick={leave} className="sx-link block py-3">Leave session</button>
          )}
        </div>
      )}
    </nav>
  );
}