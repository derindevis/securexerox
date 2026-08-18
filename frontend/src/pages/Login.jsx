import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, UserRound, UserPlus, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageTransition from '../components/common/PageTransition';
import Modal from '../components/common/Modal';

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalAlert, setModalAlert] = useState(null);
  const { login, register, addToast } = useApp();
  const navigate = useNavigate();

  const handleSignIn = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(role, email, password);
      addToast('Signed in successfully', 'success');
      navigate(role === 'shop' ? '/shop/dashboard' : '/customer/dashboard');
    } catch (error) {
      const msg = error.message || 'Unable to sign in. Please check your email and password.';
      setModalAlert({ type: 'error', title: 'Sign In Failed', message: msg });
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      const msg = 'Please enter your full name.';
      setModalAlert({ type: 'error', title: 'Validation Required', message: msg });
      addToast(msg, 'error');
      return;
    }
    if (password.length < 8) {
      const msg = 'Password must be at least 8 characters long.';
      setModalAlert({ type: 'error', title: 'Password Requirement', message: msg });
      addToast(msg, 'error');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      const msg = 'Password must contain both letters and numbers (e.g. Secure123).';
      setModalAlert({ type: 'error', title: 'Password Requirement', message: msg });
      addToast(msg, 'error');
      return;
    }
    setSubmitting(true);
    try {
      await register(name, email, password, role);
      addToast('Account created successfully!', 'success');
      navigate(role === 'shop' ? '/shop/dashboard' : '/customer/dashboard');
    } catch (error) {
      const msg = error.message || 'Registration failed. Please try again.';
      setModalAlert({ type: 'error', title: 'Sign Up Failed', message: msg });
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap sx-form">
          <p className="sx-kicker">Secure Access</p>
          <h1 className="sx-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.2rem)' }}>
            {mode === 'signin' ? (
              <>Sign <em>in.</em></>
            ) : (
              <>Create <em>account.</em></>
            )}
          </h1>
          <p className="sx-lede">
            {mode === 'signin'
              ? 'Access your encrypted document handoff vault.'
              : role === 'shop'
              ? 'Register as a print operator to verify IDs and execute secure printing.'
              : 'Register as a customer to generate secure Print IDs.'}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-[var(--line)] mt-6 mb-6">
            <button
              type="button"
              onClick={() => { setMode('signin'); setModalAlert(null); }}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                mode === 'signin'
                  ? 'border-[var(--ink)] text-[var(--ink)]'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'
              }`}
            >
              <LogIn size={16} /> Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setModalAlert(null); }}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                mode === 'signup'
                  ? 'border-[var(--ink)] text-[var(--ink)]'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'
              }`}
            >
              <UserPlus size={16} /> Sign Up
            </button>
          </div>

          {/* Role Selection */}
          <div className="sx-choice mb-6">
            <button type="button" data-active={role === 'customer'} onClick={() => setRole('customer')}>
              <UserRound size={20} />
              <b>Customer</b>
              <span className="mt-2 block text-xs text-[var(--ink-muted)]">
                {mode === 'signin' ? 'Generate Print ID and track job.' : 'Create customer account.'}
              </span>
            </button>
            <button type="button" data-active={role === 'shop'} onClick={() => setRole('shop')}>
              <Building2 size={20} />
              <b>Print operator</b>
              <span className="mt-2 block text-xs text-[var(--ink-muted)]">
                {mode === 'signin' ? 'Verify ID and execute session.' : 'Create print operator account.'}
              </span>
            </button>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="sx-panel">
              <div className="sx-field">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="sx-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                />
              </div>
              <button disabled={submitting} className="sx-button mt-5 w-full">
                {submitting ? 'Signing in...' : `Sign In as ${role === 'shop' ? 'Print Operator' : 'Customer'}`}
                {' '}<ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="sx-panel">
              <div className="sx-field">
                <label htmlFor="signup-name">Full Name</label>
                <input
                  id="signup-name"
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="sx-field">
                <label htmlFor="signup-email">Email Address</label>
                <input
                  id="signup-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="sx-field">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 chars (letters & numbers)"
                />
                <span className="mt-1 block text-xs text-[var(--ink-muted)]">
                  Must be at least 8 characters long and include both letters and numbers (e.g. Derin1234).
                </span>
              </div>
              <button disabled={submitting} className="sx-button mt-5 w-full">
                {submitting ? 'Creating account...' : `Create ${role === 'shop' ? 'Print Operator' : 'Customer'} Account`}
                {' '}<ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Alert Modal */}
      <Modal
        isOpen={Boolean(modalAlert)}
        onClose={() => setModalAlert(null)}
        title={modalAlert?.title || 'Alert Notice'}
      >
        <div className="flex flex-col items-center text-center p-2">
          {modalAlert?.type === 'error' ? (
            <div className="w-12 h-12 rounded-full bg-[var(--danger-soft)] border border-[var(--danger)]/20 flex items-center justify-center text-[var(--danger)] mb-4">
              <AlertCircle size={28} />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-[var(--emerald-soft)] border border-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] mb-4">
              <CheckCircle2 size={28} />
            </div>
          )}
          <p className="text-base text-[var(--ink)] mb-6 font-medium leading-relaxed">
            {modalAlert?.message}
          </p>
          <button
            type="button"
            onClick={() => setModalAlert(null)}
            className="sx-button w-full justify-center"
          >
            Acknowledge
          </button>
        </div>
      </Modal>
    </PageTransition>
  );
}