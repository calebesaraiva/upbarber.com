import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  Headphones,
  LogIn,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COMPANY, COMPANY_LEGAL_LINE } from '../../constants/company';
import api from '../../services/api';

function money(value) {
  const n = Number(value || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const highlights = [
  { label: 'Pré-cadastro guiado', desc: 'Barbearia entra com poucos dados e segue para análise.' },
  { label: 'Primeiro acesso com Pix', desc: 'Modal de pagamento abre na primeira entrada aprovada.' },
  { label: 'Planos reais', desc: 'Os planos mostrados aqui vêm direto da API master.' },
];

export default function Login() {
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    api.get('/public/plans')
      .then(res => setPlans(res.data.data || []))
      .catch(() => setPlans([]));
  }, []);

  const featuredPlans = useMemo(() => plans.slice(0, 3), [plans]);
  const featuredPlan = featuredPlans[0];

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível entrar agora');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060607] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_30%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 lg:p-8 shadow-2xl shadow-black/30">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_32%,rgba(212,175,55,0.07)_68%,transparent)] pointer-events-none" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gold rounded-2xl flex items-center justify-center text-dark shadow-lg shadow-gold/20">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-gold font-bold">SaaS para barbearias</p>
                  <h1 className="text-2xl lg:text-3xl font-black tracking-tight">{COMPANY.product}</h1>
                  <p className="text-xs text-gray-400 mt-1">Criado por {COMPANY.developer}</p>
                </div>
              </div>
              <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5 text-xs text-gold font-semibold">
                <BadgeCheck size={14} />
                Cadastro com aprovação
              </div>
            </div>

            <div className="relative mt-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-gray-300 font-semibold">
                <Flame size={13} className="text-gold" />
                Conversão, controle e operação no mesmo lugar
              </div>
              <h2 className="mt-5 text-4xl lg:text-6xl font-black leading-[1.02] tracking-tight">
                Uma tela de login que já vende confiança antes do primeiro clique.
              </h2>
              <p className="mt-5 text-base lg:text-lg text-gray-300 leading-7 max-w-xl">
                Entrada premium, planos reais do painel master, pré-cadastro simples, análise antes da liberação e pagamento inicial por Pix no primeiro acesso aprovado.
              </p>
            </div>

            <div className="relative mt-8 grid sm:grid-cols-3 gap-3">
              {highlights.map(item => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-xs text-gray-400 leading-5">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="relative mt-8 grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-gold/20 bg-gold/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gold font-bold">Fluxo</p>
                <p className="mt-2 text-lg font-black text-white">Pré-cadastro</p>
                <p className="text-xs text-gray-400 mt-1">Envia para análise e aprovação.</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300 font-bold">Pagamento</p>
                <p className="mt-2 text-lg font-black text-white">Pix na liberação</p>
                <p className="text-xs text-gray-400 mt-1">QR Code e copia e cola no primeiro acesso.</p>
              </div>
              <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-300 font-bold">Suporte</p>
                <p className="mt-2 text-lg font-black text-white">Painel master</p>
                <p className="text-xs text-gray-400 mt-1">Chamados, análise e gestão centralizada.</p>
              </div>
            </div>

            <div className="relative mt-8 flex flex-wrap gap-3">
              <Link to="/cadastro" className="btn-primary py-3 px-5">
                <ArrowRight size={16} /> Começar meu pré-cadastro
              </Link>
              <a href="#planos" className="btn-secondary py-3 px-5">
                Nossos planos
              </a>
              <Link to="/termos" className="btn-secondary py-3 px-5">
                Segurança e LGPD
              </Link>
            </div>

            {featuredPlan && (
              <div className="relative mt-8 rounded-[28px] border border-gold/20 bg-gradient-to-br from-gold/10 via-white/5 to-transparent p-5">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-gold font-bold">Plano em destaque</p>
                    <h3 className="mt-1 text-2xl font-black">{featuredPlan.name}</h3>
                    <p className="text-sm text-gray-300 mt-1">{featuredPlan.description || 'Benefícios reais configurados no painel master.'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-gold">{money(featuredPlan.price)}</p>
                    <p className="text-xs text-gray-400">por mês</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(Array.isArray(featuredPlan.features) ? featuredPlan.features.slice(0, 4) : []).map(feature => (
                    <span key={feature} className="inline-flex items-center rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] text-gray-200">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="relative mt-8 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-gray-300 leading-6">
              {COMPANY_LEGAL_LINE}
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-[32px] border border-white/10 bg-[#0d0d0d]/95 backdrop-blur-xl p-6 lg:p-8 shadow-2xl shadow-black/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gold/15 text-gold flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Bem-vindo de volta</h2>
                  <p className="text-sm text-gray-400">Acesse sua conta para continuar.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">E-mail</label>
                  <input
                    className="input"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Senha</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={show ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                    <input type="checkbox" className="accent-gold" /> Lembrar-me
                  </label>
                  <Link to="/recuperar-senha" className="text-gold hover:text-gold-light transition-colors">
                    Esqueci a senha
                  </Link>
                </div>
                <button type="submit" className="btn-primary w-full justify-center py-3">
                  <LogIn size={16} /> {loading ? 'Entrando...' : 'Entrar'}
                </button>
                {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              </form>

              <div className="mt-6 rounded-[24px] border border-gold/15 bg-gold/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gold font-bold">Conversão</p>
                    <p className="mt-1 text-sm text-white font-semibold">Quer ver os planos antes de criar a conta?</p>
                  </div>
                  <Link to="/cadastro" className="inline-flex items-center gap-1 text-sm font-semibold text-gold">
                    Aderir agora <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            <div id="planos" className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 lg:p-8">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-gold font-bold">Nossos planos</p>
                  <h3 className="text-xl font-bold mt-1">Escolha o formato ideal para sua barbearia</h3>
                </div>
                <TrendingUp size={18} className="text-gold flex-shrink-0" />
              </div>

              <div className="grid gap-4">
                {featuredPlans.length > 0 ? featuredPlans.map((plan, index) => (
                  <div key={plan.id} className={`rounded-2xl border p-4 flex flex-col gap-3 ${index === 0 ? 'border-gold bg-gold/10' : 'border-white/10 bg-black/20'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">{plan.name}</p>
                        <p className="text-xs text-gray-400 mt-1 leading-5">
                          {(Array.isArray(plan.features) ? plan.features.slice(0, 3) : []).join(' • ')}
                        </p>
                      </div>
                      <span className="text-gold text-lg font-black whitespace-nowrap">{money(plan.price)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(plan.features) ? plan.features.slice(0, 3) : []).map(feature => (
                        <span key={feature} className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-[11px] text-gray-300">
                          {feature}
                        </span>
                      ))}
                    </div>
                    <Link to={`/cadastro?planId=${plan.id}`} className="btn-secondary justify-center mt-auto">
                      Aderir agora
                    </Link>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                    Os planos ainda estão sendo carregados da API.
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link to="/cadastro" className="btn-primary py-3 px-5">
                  <Headphones size={16} /> Quero começar
                </Link>
                <p className="text-xs text-gray-500 leading-5">
                  O pré-cadastro segue para análise e aprovação antes do primeiro acesso.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ['Login', 'Master e barbearia separados'],
                  ['Cobrança', 'Pix no primeiro acesso'],
                  ['Confiança', 'Email e LGPD no fluxo'],
                ].map(([title, desc]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-semibold text-white">{title}</p>
                    <p className="mt-1 text-[11px] text-gray-500 leading-5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-8 text-[11px] text-gray-500 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p>© {COMPANY.year} {COMPANY.product}. Todos os direitos reservados.</p>
          <p>Feito pela {COMPANY.developer} · CNPJ {COMPANY.cnpj}</p>
        </footer>
      </main>
    </div>
  );
}
