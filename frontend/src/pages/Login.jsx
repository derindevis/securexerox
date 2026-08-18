import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, UserRound, UserPlus, LogIn, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageTransition from '../components/common/PageTransition';
import Modal from '../components/common/Modal';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
  </svg>
);

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalAlert, setModalAlert] = useState(null);
  const { login, register, addToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Read ?mode=signin or ?mode=signup from URL (set by Navbar buttons)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const m = params.get('mode');
    if (m === 'signup') setMode('signup');
    else if (m === 'signin') setMode('signin');
  }, [location.search]);

  /* ── Google OAuth ── */
  const handleGoogleAuth = () => {
    sessionStorage.setItem('sx_oauth_role', role);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wxucnfaeznejprxldcdf.supabase.co';
    const redirectUri = `${window.location.origin}/auth/callback`;
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUri)}&prompt=select_account`;
  };

  /* ── Manual Sign In ── */
  const handleSignIn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(role, email, password);
      addToast('Signed in successfully', 'success');
      navigate(role === 'shop' ? '/shop/dashboard' : '/customer/dashboard');
    } catch (error) {
      const msg = error.message || 'Unable to sign in.';
      // If user tries to sign in but has no account, guide them to sign up
      if (msg.toLowerCase().includes('not registered') || msg.toLowerCase().includes('sign up')) {
        setModalAlert({
          type: 'info',
          title: 'Account Not Found',
          message: `No account found for "${email}". You need to sign up first before you can sign in.`,
          action: { label: 'Go to Sign Up', fn: () => { setModalAlert(null); setMode('signup'); setPassword(''); } },
        });
      } else {
        setModalAlert({ type: 'error', title: 'Sign In Failed', message: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Manual Sign Up ── */
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalAlert({ type: 'error', title: 'Name Required', message: 'Please enter your full name.' });
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setModalAlert({ type: 'error', title: 'Weak Password', message: 'Password must be at least 8 characters with letters and numbers (e.g. Secure123).' });
      return;
    }
    setSubmitting(true);
    try {
      await register(name, email, password, role);
      addToast('Account created!', 'success');
      navigate(role === 'shop' ? '/shop/dashboard' : '/customer/dashboard');
    } catch (error) {
      const msg = error.message || 'Registration failed. Please try again.';
      setModalAlert({ type: 'error', title: 'Sign Up Failed', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <main className="sx-page">
        <div className="sx-wrap sx-form">

          {/* ── Header ── */}
          <p className="sx-kicker">Secure Access</p>
          <h1 className="sx-title" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', marginBottom: '0.25rem' }}>
            {mode === 'signin' ? <>Log in to <em>SecureXerox</em></> : <>Create your <em>account</em></>}
          </h1>
          <p className="sx-lede" style={{ marginBottom: '1.5rem' }}>
            {mode === 'signin' ? 'Connect to SecureXerox with:' : 'Connect to SecureXerox with:'}
          </p>

          {/* ── Role Selection ── */}
          <div className="sx-choice mb-6">
            <button type="button" data-active={role === 'customer'} onClick={() => setRole('customer')}>
              <UserRound size={18} />
              <b>Customer</b>
              <span className="mt-1 block text-xs text-[var(--ink-muted)]">
                {mode === 'signin' ? 'Access your jobs.' : 'Create customer account.'}
              </span>
            </button>
            <button type="button" data-active={role === 'shop'} onClick={() => setRole('shop')}>
              <Building2 size={18} />
              <b>Print Operator</b>
              <span className="mt-1 block text-xs text-[var(--ink-muted)]">
                {mode === 'signin' ? 'Manage print sessions.' : 'Create operator account.'}
              </span>
            </button>
          </div>

          {/* ── Google OAuth Button ── */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full py-3 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--ink)] font-semibold flex items-center justify-center gap-3 transition-all duration-200 hover:border-[var(--ink-muted)] cursor-pointer text-sm mb-3"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          {/* ── Divider ── */}
          <div className="relative flex items-center my-3">
            <div className="border-t border-[var(--line)] flex-1"></div>
            <span className="px-4 text-xs uppercase tracking-wider text-[var(--ink-muted)] font-medium">
              Or continue with
            </span>
            <div className="border-t border-[var(--line)] flex-1"></div>
          </div>

          {/* ── Manual Sign In Form ── */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="flex flex-col gap-1">
              <div className="sx-field">
                <label htmlFor="signin-email">Email</label>
                <input
                  id="signin-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="email"
                />
              </div>
              <div className="sx-field">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="signin-password" style={{ margin: 0 }}>Password</label>
                </div>
                <div className="relative">
                  <input
                    id="signin-password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button disabled={submitting} className="sx-button mt-2 w-full justify-center">
                {submitting ? 'Signing in...' : 'Log in'}
                {!submitting && <ArrowRight size={15} />}
              </button>
            </form>
          ) : (
            /* ── Manual Sign Up Form ── */
            <form onSubmit={handleSignUp} className="flex flex-col gap-1">
              <div className="sx-field">
                <label htmlFor="signup-name">Full Name</label>
                <input
                  id="signup-name"
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </div>
              <div className="sx-field">
                <label htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="youremail@email.com"
                  autoComplete="email"
                />
              </div>
              <div className="sx-field">
                <label htmlFor="signup-password">Password</label>
                <div className="relative">
                  <input
                    id="signup-password"
                    required
                    minLength={8}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a unique password"
                    autoComplete="new-password"
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button disabled={submitting} className="sx-button mt-2 w-full justify-center">
                {submitting ? 'Creating account...' : 'Continue'}
                {!submitting && <ArrowRight size={15} />}
              </button>
            </form>
          )}

          {/* ── Mode Switch Footer ── */}
          <p className="text-center text-sm text-[var(--ink-muted)] mt-5">
            {mode === 'signin' ? (
              <>New to SecureXerox?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setPassword(''); }}
                  className="text-[var(--ink)] font-semibold underline underline-offset-2 hover:text-[var(--ink-secondary)] transition-colors cursor-pointer"
                >
                  Sign up for an account
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setName(''); setPassword(''); }}
                  className="text-[var(--ink)] font-semibold underline underline-offset-2 hover:text-[var(--ink-secondary)] transition-colors cursor-pointer"
                >
                  Log in
                </button>
              </>
            )}
          </p>


        </div>
      </main>

      {/* Alert Modal */}
      <Modal
        isOpen={Boolean(modalAlert)}
        onClose={() => setModalAlert(null)}
        title={modalAlert?.title || 'Alert'}
      >
        <div className="flex flex-col items-center text-center p-2">
          {modalAlert?.type === 'error' ? (
            <div className="w-12 h-12 rounded-full bg-[var(--danger-soft)] border border-[var(--danger)]/20 flex items-center justify-center text-[var(--danger)] mb-4">
              <AlertCircle size={28} />
            </div>
          ) : modalAlert?.type === 'info' ? (
            <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] mb-4">
              <UserPlus size={28} />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-[var(--emerald-soft)] border border-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] mb-4">
              <CheckCircle2 size={28} />
            </div>
          )}
          <p className="text-base text-[var(--ink)] mb-6 font-medium leading-relaxed">
            {modalAlert?.message}
          </p>
          {modalAlert?.action ? (
            <div className="flex flex-col gap-2 w-full">
              <button type="button" onClick={modalAlert.action.fn} className="sx-button w-full justify-center">
                {modalAlert.action.label} <ArrowRight size={15} />
              </button>
              <button type="button" onClick={() => setModalAlert(null)} className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors py-1 cursor-pointer">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setModalAlert(null)} className="sx-button w-full justify-center">
              Acknowledge
            </button>
          )}
        </div>
      </Modal>
    </PageTransition>
  );
}