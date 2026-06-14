import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scissors, CheckCircle } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { unwrap } from '../../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', city: '', plan: 'pro' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const upd = k => e => setForm({...form, [k]: e.target.value});

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authService.register({
        barbershopName: form.name,
        city: form.city,
        phone: form.phone,
        name: 'Administrador',
        email: form.email,
        password: form.password,
      });
      const data = unwrap(res.data);
      localStorage.setItem('upbarber:token', data.accessToken);
      localStorage.setItem('upbarber:refreshToken', data.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível criar a conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
            <Scissors size={16} className="text-dark" />
          </div>
          <span className="font-bold text-white">UpBarber</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step >= s ? 'bg-gold text-dark' : 'bg-dark-400 text-gray-500'}`}>
                {step > s ? <CheckCircle size={14} /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-gold' : 'bg-dark-400'}`} />}
            </div>
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Dados da barbearia</h2>
              <p className="text-sm text-gray-500 mb-6">Vamos começar com as informações básicas</p>
              <div className="space-y-4">
                <div><label className="text-xs text-gray-400 mb-1 block">Nome da barbearia</label><input className="input" value={form.name} onChange={upd('name')} placeholder="Ex: Barbearia Premium" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Cidade</label><input className="input" value={form.city} onChange={upd('city')} placeholder="São Paulo, SP" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Telefone / WhatsApp</label><input className="input" value={form.phone} onChange={upd('phone')} placeholder="(11) 99999-9999" /></div>
              </div>
              <button className="btn-primary w-full justify-center mt-6" onClick={() => setStep(2)}>Continuar</button>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Crie seu acesso</h2>
              <p className="text-sm text-gray-500 mb-6">E-mail e senha do administrador</p>
              <div className="space-y-4">
                <div><label className="text-xs text-gray-400 mb-1 block">E-mail</label><input className="input" type="email" value={form.email} onChange={upd('email')} placeholder="seu@email.com" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Senha</label><input className="input" type="password" value={form.password} onChange={upd('password')} placeholder="Mínimo 8 caracteres" /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(1)}>Voltar</button>
                <button className="btn-primary flex-1 justify-center" onClick={() => setStep(3)}>Continuar</button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Escolha seu plano</h2>
              <p className="text-sm text-gray-500 mb-6">14 dias grátis em qualquer plano</p>
              <div className="space-y-3">
                {[
                  { id: 'starter', name: 'Starter', price: 'R$97/mês', desc: 'Até 2 barbeiros' },
                  { id: 'pro', name: 'Pro', price: 'R$197/mês', desc: 'Até 5 barbeiros + assinaturas', popular: true },
                  { id: 'business', name: 'Business', price: 'R$397/mês', desc: 'Ilimitado + multi-unidade' },
                ].map(p => (
                  <label key={p.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${form.plan === p.id ? 'border-gold bg-gold/5' : 'border-dark-500 hover:border-dark-400'}`}>
                    <input type="radio" name="plan" value={p.id} checked={form.plan === p.id} onChange={upd('plan')} className="accent-gold" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{p.name}</span>
                        {p.popular && <span className="badge-gold text-[10px]">Popular</span>}
                      </div>
                      <span className="text-xs text-gray-500">{p.desc}</span>
                    </div>
                    <span className="text-sm font-bold text-gold">{p.price}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(2)}>Voltar</button>
                <button className="btn-primary flex-1 justify-center" onClick={submit}>{loading ? 'Criando...' : 'Começar grátis'}</button>
              </div>
              {error && <p className="text-xs text-red-400 text-center mt-3">{error}</p>}
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Já tem conta? <Link to="/login" className="text-gold">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
