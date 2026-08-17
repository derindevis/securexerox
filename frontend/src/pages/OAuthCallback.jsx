import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthToken, api } from '../utils/api';

export default function OAuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('access_token');
    if (token === null) { navigate('/login', { replace: true }); return; }
    setAuthToken(token);
    api.getMe()
      .then(user => navigate(user.role === 'shop' ? '/shop/dashboard' : '/customer/dashboard', { replace: true }))
      .catch(() => { setAuthToken(null); navigate('/login', { replace: true }); });
  }, [navigate]);
  return <main className="vault-page"><div className="vault-wrap vault-form"><p className="vault-kicker">Google sign-in</p><h1 className="vault-title">Opening your <em>session.</em></h1><p className="vault-lede">Verifying your account securely.</p></div></main>;
}