import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  LogIn,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COMPANY, COMPANY_LEGAL_LINE } from '../../constants/company';
import api from '../../services/api';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PLAN_ICONS = { starter: Zap, pro: Rocket, business: Crown };
const PLAN_COLORS = {
  starter: { border: 'border-gray-500/30', bg: 'bg-gray-500/5', badge: 'bg-gray-500/15 text-gray-300', icon: 'text-gray-300', price: 'text-gray-100' },
  pro: { border: 'border-purple-500/40', bg: 'bg-purple-500/5', badge: 'bg-purple-500/15 text-purple-300', icon: 'text-purple-400', price: 'text-purple-300' },
  business: { border: 'border-gold/40', bg: 'bg-gold/5', badge: 'bg-gold/15 text-gold', icon: 'text-gold', price: 'text-gold' },
};

function getPlanMeta(plan, index) {
  const slug = plan.slug || ['starter', 'pro', 'business'][index] || 'starter';
  return {
    slug,
    Icon: PLAN_ICONS[slug] || Sparkles,
    colors: PLAN_COLORS[slug] || PLAN_COLORS.starter,
    isPopular: slug === 'pro',
  };
}

function PlansModal({ plans, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-5xl max-h-[96vh] sm:max-h-[90vh] overflow-y-auto bg-[#0a0a0b] border border-white/10 rounded-t-[28px] sm:rounded-[28px] shadow-2xl shadow-black/50">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-white/8 bg-[#0a0a0b]/95 backdrop-blur-md">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-gold font-bold">Planos UpBarber</p>
            <h2 className="text-xl font-black mt-0.5 text-white">Escolha o plano ideal para sua barbearia</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          {plans.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">Carregando planos...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {plans.map((plan, index) => {
                const { slug, Icon, colors, isPopular } = getPlanMeta(plan, index);
                return (
                  <div
                    key={plan.id || index}
                    className={`relative rounded-2xl border ${colors.border} ${colors.bg} p-5 flex flex-col gap-4 transition-all hover:scale-[1.01]`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-purple-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg shadow-purple-500/30">
                        <Star size={9} fill="currentColor" /> Mais popular
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center ${colors.icon} flex-shrink-0`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">{plan.name}</h3>
                        {plan.description && <p className="text-xs text-gray-400 mt-0.5 leading-4">{plan.description}</p>}
                      </div>
                    </div>

                    <div>
                      <p className={`text-3xl font-black ${colors.price}`}>{money(plan.price)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">por mês</span>
                        {plan.annualPrice && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                            {money(plan.annualPrice)}/mês no anual
                          </span>
                        )}
                      </div>
                    </div>

                    {(plan.maxBarbers || plan.maxFiliais || plan.maxClients) && (
                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-black/30 p-3">
                        <div className="text-center">
                          <p className="text-sm font-black text-white">{plan.maxFiliais ?? '∞'}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Filiais</p>
                        </div>
                        <div className="text-center border-x border-white/5">
                          <p className="text-sm font-black text-white">{plan.maxBarbers ?? '∞'}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Barbeiros</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-white">{plan.maxClients ? (plan.maxClients >= 9999 ? '∞' : plan.maxClients) : '∞'}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Clientes</p>
                        </div>
                      </div>
                    )}

                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <ul className="space-y-2 flex-1">
                        {plan.features.map(feature => (
                          <li key={feature} className="flex items-start gap-2 text-xs text-gray-300">
                            <Check size={12} className={`${colors.icon} flex-shrink-0 mt-0.5`} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Link
                      to={`/cadastro?planId=${plan.id}`}
                      onClick={onClose}
                      className={`mt-auto w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                        isPopular
                          ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/20'
                          : slug === 'business'
                          ? 'bg-gold hover:bg-gold-light text-dark'
                          : 'bg-white/8 hover:bg-white/12 text-white border border-white/10'
                      }`}
                    >
                      Começar com {plan.name}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-gray-500 leading-5">
            Todos os planos incluem pré-cadastro com análise e aprovação. Pagamento inicial via Pix no primeiro acesso aprovado.
            <br />Sem taxa de adesão. Cancele quando quiser.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState([]);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [masterChallenge, setMasterChallenge] = useState(null);
  const [masterCode, setMasterCode] = useState('');

  useEffect(() => {
    api.get('/public/plans')
      .then(res => setPlans(res.data.data || []))
      .catch(() => setPlans([]));
  }, []);

  const featuredPlans = useMemo(() => plans.slice(0, 3), [plans]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(form.email, form.password);
      if (result?.type === 'master-challenge') {
        setMasterChallenge(result);
        setMasterCode('');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível entrar agora');
    } finally {
      setLoading(false);
    }
  };

  const handleMasterCodeSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(form.email, form.password, { code: masterCode });
      if (result?.type === 'master') {
        setMasterChallenge(null);
        setMasterCode('');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível validar o código agora');
    } finally {
      setLoading(false);
    }
  };

  const resendMasterCode = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await login(form.email, form.password, { resend: true });
      if (result?.type === 'master-challenge') {
        setMasterChallenge(result);
        setMasterCode('');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível reenviar o código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060607] text-white relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,175,55,0.12),transparent)]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(139,92,246,0.07),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(16,185,129,0.06),transparent_60%)]" />
      </div>

      {showPlansModal && (
        <PlansModal plans={featuredPlans} onClose={() => setShowPlansModal(false)} />
      )}

      <main className="relative z-10 min-h-screen flex flex-col">
        {/* Nav bar */}
        <nav className="flex items-center justify-between px-5 sm:px-8 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center text-dark shadow-md shadow-gold/20">
              <Sparkles size={15} />
            </div>
            <span className="text-base font-black tracking-tight">{COMPANY.product}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPlansModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Ver planos <ChevronRight size={14} />
            </button>
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-white/6 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-colors"
            >
              Criar conta
            </Link>
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 px-5 sm:px-8 py-8 lg:py-0 max-w-6xl mx-auto w-full">
          {/* Left: hero */}
          <div className="w-full lg:flex-1 lg:max-w-lg text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/8 px-3.5 py-1.5 text-xs text-gold font-semibold mb-5">
              <BadgeCheck size={13} /> SaaS para barbearias · Aprovação manual
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-black leading-[1.05] tracking-tight">
              Gestão completa<br />
              <span className="text-gold">para barbearias</span><br />
              que crescem.
            </h1>

            <p className="mt-5 text-base text-gray-400 leading-7 max-w-md mx-auto lg:mx-0">
              Agenda, financeiro, comissões, clube de assinaturas e muito mais. Tudo em um só lugar, feito para a realidade da sua barbearia.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <Link
                to="/cadastro"
                className="btn-primary py-3 px-6 w-full sm:w-auto justify-center"
              >
                <ArrowRight size={16} /> Iniciar pré-cadastro
              </Link>
              <button
                onClick={() => setShowPlansModal(true)}
                className="btn-secondary py-3 px-6 w-full sm:w-auto justify-center"
              >
                Ver planos e preços
              </button>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { label: 'Pré-cadastro', desc: 'Simples e guiado' },
                { label: 'Pix na liberação', desc: 'QR Code no 1º acesso' },
                { label: 'Suporte humano', desc: 'Painel master dedicado' },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-white/8 bg-white/3 p-3 text-center">
                  <p className="text-xs font-semibold text-white">{item.label}</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-4">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: login form */}
          <div className="w-full sm:max-w-sm lg:max-w-[400px] order-1 lg:order-2">
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0e]/90 backdrop-blur-xl p-7 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-10 h-10 rounded-xl bg-gold/12 border border-gold/20 flex items-center justify-center text-gold">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Acessar conta</h2>
                  <p className="text-xs text-gray-500">Bem-vindo de volta ao {COMPANY.product}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">E-mail</label>
                  <input
                    className="input"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Senha</label>
                    <Link to="/recuperar-senha" className="text-[11px] text-gold hover:text-gold-light transition-colors">
                      Esqueci a senha
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={show ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <LogIn size={15} />
                  {loading ? 'Entrando...' : 'Entrar na conta'}
                </button>
              </form>

              {masterChallenge && (
                <form onSubmit={handleMasterCodeSubmit} className="mt-5 rounded-[24px] border border-gold/20 bg-gold/10 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
                      <ShieldCheck size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.2em] text-gold font-bold">Verificação em 2 etapas</p>
                      <p className="mt-1 text-sm text-white font-semibold">Enviamos um código para {masterChallenge.sentTo}.</p>
                      <p className="mt-1 text-xs text-gray-400 leading-5">Digite o código para liberar o acesso master com segurança adicional.</p>
                    </div>
                  </div>
                  <input
                    className="input text-center tracking-[0.35em] font-bold"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={masterCode}
                    onChange={e => setMasterCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={resendMasterCode} className="btn-secondary flex-1 justify-center" disabled={loading}>
                      <RefreshCw size={15} /> Reenviar código
                    </button>
                    <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading || masterCode.length !== 6}>
                      <Check size={15} /> Confirmar acesso
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 pt-6 border-t border-white/6">
                <p className="text-xs text-gray-500 text-center">
                  Ainda não tem conta?{' '}
                  <Link to="/cadastro" className="text-gold hover:text-gold-light font-semibold transition-colors">
                    Fazer pré-cadastro
                  </Link>
                </p>
              </div>

              <div className="mt-4 rounded-xl bg-gold/6 border border-gold/15 p-4">
                <p className="text-xs text-gray-300 leading-5">
                  Quer conhecer os planos antes de criar a conta?{' '}
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className="text-gold hover:text-gold-light font-semibold transition-colors"
                  >
                    Ver planos →
                  </button>
                </p>
              </div>
            </div>

            {/* Mobile plans button */}
            <button
              onClick={() => setShowPlansModal(true)}
              className="sm:hidden mt-4 w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-2"
            >
              Ver planos e preços <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-600 border-t border-white/5">
          <p>{COMPANY_LEGAL_LINE}</p>
          <div className="flex items-center gap-4">
            <Link to="/termos" className="hover:text-gray-400 transition-colors">Termos & LGPD</Link>
            <a href={`mailto:${COMPANY.email}`} className="hover:text-gray-400 transition-colors">{COMPANY.email}</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
