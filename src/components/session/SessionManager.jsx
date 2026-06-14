import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const IDLE_LIMIT_MS = 60 * 60 * 1000;
const ACTIVITY_KEY = 'upbarber:lastActivityAt';
const RELOAD_MARK_KEY = 'upbarber:lastResumeReloadAt';

function hasSession() {
  return Boolean(localStorage.getItem('upbarber:token') || localStorage.getItem('masterToken'));
}

function isPublicAuthPath(pathname) {
  return pathname === '/login' || pathname === '/cadastro' || pathname === '/recuperar-senha' || pathname === '/verificar-email';
}

export function SessionManager() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const touchSession = useCallback(() => {
    if (!hasSession()) return;
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  }, []);

  const forceLogout = useCallback(async () => {
    if (localStorage.getItem('upbarber:token')) {
      await logout().catch(() => {});
      return;
    }

    localStorage.clear();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const reloadIfNeeded = useCallback(() => {
    if (!hasSession()) return;
    if (isPublicAuthPath(location.pathname)) return;

    const now = Date.now();
    const lastReload = Number(sessionStorage.getItem(RELOAD_MARK_KEY) || 0);
    if (now - lastReload < 2000) return;
    sessionStorage.setItem(RELOAD_MARK_KEY, String(now));
    window.location.reload();
  }, [location.pathname]);

  useEffect(() => {
    if (!hasSession()) return undefined;

    touchSession();

    const checkIdle = () => {
      const lastActivity = Number(localStorage.getItem(ACTIVITY_KEY) || Date.now());
      if (Date.now() - lastActivity >= IDLE_LIMIT_MS) {
        forceLogout();
      }
    };

    const activityEvents = ['pointerdown', 'keydown', 'mousedown', 'touchstart', 'scroll', 'wheel'];
    const onActivity = () => touchSession();
    const onFocus = () => reloadIfNeeded();
    const onPageshow = (event) => {
      if (event.persisted) reloadIfNeeded();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem('upbarber:lastHiddenAt', String(Date.now()));
        return;
      }
      if (document.visibilityState === 'visible' && sessionStorage.getItem('upbarber:lastHiddenAt')) {
        sessionStorage.removeItem('upbarber:lastHiddenAt');
        reloadIfNeeded();
      }
    };

    activityEvents.forEach(evt => window.addEventListener(evt, onActivity, { passive: true }));
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageshow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const idleTimer = window.setInterval(checkIdle, 60_000);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, onActivity));
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageshow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(idleTimer);
    };
  }, [forceLogout, reloadIfNeeded, touchSession]);

  return null;
}
