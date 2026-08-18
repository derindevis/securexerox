import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthToken, api } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function processOAuth() {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const searchParams = new URLSearchParams(window.location.search);
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        const role = sessionStorage.getItem('sx_oauth_role') || 'customer';

        if (!accessToken) {
          setErrorMsg('No authentication token received.');
          setTimeout(() => navigate('/login', { replace: true }), 2500);
          return;
        }

        let email = null;
        let name = null;
        try {
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            email = payload.email || payload.user_metadata?.email || null;
            name = payload.user_metadata?.full_name || payload.user_metadata?.name || null;
          }
        } catch (e) {
          // fallback
        }

        // Exchange with backend to obtain app JWT & register/sync user
        const res = await api.googleAuth({ access_token: accessToken, token: accessToken, email, name, role });
        if (res && res.access_token) {
          setAuthToken(res.access_token);
          addToast('Signed in with Google successfully!', 'success');
          sessionStorage.removeItem('sx_oauth_role');
          const destination = res.user?.role === 'shop' ? '/shop/dashboard' : '/customer/dashboard';
          navigate(destination, { replace: true });
        } else {
          throw new Error('Failed to retrieve authentication session.');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        const msg = err.message || 'Google authentication failed. Redirecting to login...';
        setErrorMsg(msg);
        addToast(msg, 'error');
        setAuthToken(null);
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    }

    processOAuth();
  }, [navigate, addToast]);

  return (
    <main className="sx-page">
      <div className="sx-wrap sx-form text-center">
        <p className="sx-kicker">Google Authentication</p>
        <h1 className="sx-title" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.5rem)' }}>
          {errorMsg ? <>Authentication <em>Issue</em></> : <>Securing your <em>session.</em></>}
        </h1>
        <p className="sx-lede">
          {errorMsg ? errorMsg : 'Verifying your Google account and initializing your encrypted vault...'}
        </p>
        {!errorMsg && (
          <div className="mt-8 flex justify-center">
            <div className="w-8 h-8 border-3 border-[var(--ink)]/20 border-t-[var(--ink)] rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </main>
  );
}