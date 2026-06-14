import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';
import { COMPANY } from '../../constants/company';

const STORAGE_KEY = 'upbarber_cookie_consent_v1';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function hasAcceptedConsent() {
  if (typeof document === 'undefined') return false;
  if (localStorage.getItem(STORAGE_KEY) === 'accepted') return true;
  return document.cookie.split('; ').some(item => item.startsWith(`${STORAGE_KEY}=accepted`));
}

function persistConsent() {
  localStorage.setItem(STORAGE_KEY, 'accepted');
  document.cookie = `${STORAGE_KEY}=accepted; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasAcceptedConsent());
  }, []);

  const accept = () => {
    persistConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[80] lg:left-auto lg:w-[480px]">
      <div className="bg-dark-100 border border-dark-400 rounded-xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div>
                <p className="text-sm font-bold text-white">Cookies, LGPD e segurança de dados</p>
                <p className="text-xs text-gray-400 mt-1 leading-5">
                  Usamos cookies necessários para login, segurança e funcionamento do {COMPANY.product}. Ao continuar, você concorda com nossas políticas.
                </p>
              </div>
              <button type="button" onClick={() => setVisible(false)} className="text-gray-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button type="button" onClick={accept} className="btn-primary py-2 px-3">Aceitar e continuar</button>
              <Link to="/privacidade" className="text-xs text-gold hover:text-gold-light">Privacidade</Link>
              <Link to="/termos" className="text-xs text-gold hover:text-gold-light">Termos de uso</Link>
              <Link to="/cookies" className="text-xs text-gold hover:text-gold-light">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
