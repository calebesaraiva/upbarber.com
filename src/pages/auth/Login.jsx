import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Eye,
  EyeOff,
  Headphones,
  LogIn,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COMPANY, COMPANY_LEGAL_LINE } from '../../constants/company';
import api from '../../services/api';

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
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(30,41,59,0.5),transparent_28%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '54px 54px' }} />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 lg:py-10">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-start">
          <section className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 lg:p-8 shadow-2xl shadow-black/30">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gold rounded-2xl flex items-center justify-center text-dark shadow-lg shadow-gold/20">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-xl font-black tracking-tight">{COMPANY.product}</p>
                <p className="text-xs text-gray-400">Desenvolvido pela {COMPANY.developer}</p>
              </div>
            </div>

            <div className="mt-10 max-w-xl">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-gold font-bold">
                <BadgeCheck size={14} /> Plataforma SaaS para barbearias
              </p>
              <h1 className="mt-4 text-4xl lg:text-6xl font-black leading-[1.02] tracking-tight">
                Uma entrada bonita para um sistema que vende confiança.
              </h1>
              <p className="mt-5 text-base lg:text-lg text-gray-300 leading-7">
                Agenda, cobranças, equipe, financeiro e automação em uma experiência premium. O acesso do cliente é liberado só depois da análise e aprovação do cadastro.
              </p>
            </div>

            <div className="mt-8 grid sm:grid-cols-3 gap-3">
              {[
                ['Cadastro guiado', 'Pré-cadastro simples e análise'],
                ['Planos visíveis', 'Benefícios e conversão direta'],
                ['Segurança', 'LGPD, cookies e acesso protegido'],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-5">{desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/cadastro" className="btn-primary py-3 px-5">
                <ArrowRight size={16} /> Começar meu pré-cadastro
              </Link>
              <a href="#planos" className="btn-secondary py-3 px-5">
                Ver nossos planos
              </a>
            </div>

            <div className="mt-8 rounded-2xl border border-gold/20 bg-gold/10 p-4 text-sm text-gold leading-6">
              {COMPANY_LEGAL_LINE}
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-[#0d0d0d]/95 backdrop-blur-xl p-6 lg:p-8 shadow-2xl shadow-black/30">
              <div className="flex items-center gap-2 lg:hidden mb-8">
                <div className="w-9 h-9 bg-gold rounded-xl flex items-center justify-center text-dark">
                  <Sparkles size={16} />
                </div>
                <span className="font-bold text-white">{COMPANY.product}</span>
              </div>

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
            </div>

            <div id="planos" className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 lg:p-8">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-gold font-bold">Nossos planos</p>
                  <h3 className="text-xl font-bold mt-1">Escolha o formato ideal para sua barbearia</h3>
                </div>
                <TrendingUp size={18} className="text-gold flex-shrink-0" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {plans.slice(0, 4).map((plan, index) => (
                  <div key={plan.id} className={`rounded-2xl border p-4 flex flex-col gap-3 ${index === 1 ? 'border-gold bg-gold/10' : 'border-white/10 bg-black/20'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">{plan.name}</p>
                        <p className="text-xs text-gray-400 mt-1 leading-5">
                          {(Array.isArray(plan.features) ? plan.features.slice(0, 2) : []).join(' • ')}
                        </p>
                      </div>
                      <span className="text-gold text-lg font-black whitespace-nowrap">R$ {Number(plan.price).toFixed(2)}</span>
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
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link to="/cadastro" className="btn-primary py-3 px-5">
                  <Headphones size={16} /> Quero aderir
                </Link>
                <p className="text-xs text-gray-500 leading-5">
                  O pré-cadastro segue para análise e aprovação antes do primeiro acesso.
                </p>
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
