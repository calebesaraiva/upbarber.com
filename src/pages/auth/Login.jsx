import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="min-h-screen bg-dark flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-dark-100 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center">
              <Scissors size={20} className="text-dark" />
            </div>
            <span className="text-xl font-bold text-white">UpBarber</span>
          </div>
        </div>
        <div className="relative z-10">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">O sistema que sua barbearia merece</h2>
            <p className="text-gray-400 mt-3 text-lg">Agenda, assinaturas, financeiro e WhatsApp em um só lugar.</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 relative z-10">© 2026 UpBarber. Todos os direitos reservados.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
              <Scissors size={16} className="text-dark" />
            </div>
            <span className="font-bold text-white">UpBarber</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Bem-vindo de volta</h1>
          <p className="text-sm text-gray-500 mb-8">Acesse sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">E-mail</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="seu@email.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Senha</label>
              <div className="relative">
                <input className="input pr-10" type={show ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                <input type="checkbox" className="accent-gold" /> Lembrar-me
              </label>
              <Link to="/recuperar-senha" className="text-gold hover:text-gold-light transition-colors">Esqueci a senha</Link>
            </div>
            <button type="submit" className="btn-primary w-full justify-center py-3">
              <LogIn size={16} /> {loading ? 'Entrando...' : 'Entrar'}
            </button>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-gold hover:text-gold-light transition-colors font-medium">Criar conta grátis</Link>
          </p>

        </div>
      </div>
    </div>
  );
}
