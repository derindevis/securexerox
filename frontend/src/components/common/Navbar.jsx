import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function Navbar() {
  const { currentUser, isAuthenticated, logout } = useApp(); const location = useLocation(); const navigate = useNavigate(); const [open, setOpen] = useState(false);
  const links = !isAuthenticated ? [['Explore','/'],['Sign in','/login']] : currentUser?.role === 'customer' ? [['Overview','/customer/dashboard'],['New print','/customer/upload'],['My jobs','/customer/jobs']] : [['Overview','/shop/dashboard'],['Verify ID','/shop/print'],['Queue','/shop/queue'],['History','/shop/history']];
  const leave = () => { logout(); navigate('/'); };
  return <nav className="vault-nav"><div className="vault-nav__inner"><Link to="/" className="vault-brand"><span className="vault-brand__mark"><ShieldCheck size={17} /></span>SecureXerox</Link><div className="vault-links">{links.map(([label,path])=><Link key={path} to={path} className={`vault-link ${location.pathname === path ? 'vault-link--active':''}`}>{label}</Link>)}{isAuthenticated && <button onClick={leave} className="vault-link inline-flex items-center gap-1"><LogOut size={14}/> Leave</button>}</div><button onClick={()=>setOpen(!open)} className="text-slate-200 md:hidden" aria-label="Toggle navigation">{open?<X/>:<Menu/>}</button></div>{open&&<div className="border-t border-white/10 px-5 pb-4 md:hidden">{links.map(([label,path])=><Link onClick={()=>setOpen(false)} key={path} to={path} className="vault-link block py-3">{label}</Link>)}{isAuthenticated&&<button onClick={leave} className="vault-link block py-3">Leave session</button>}</div>}</nav>;
}