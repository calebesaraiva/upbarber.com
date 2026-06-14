import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Scissors, CheckCircle } from 'lucide-react';
import { authService } from '../../services/auth.service';
import api from '../../services/api';
import { COMPANY, COMPANY_LEGAL_LINE } from '../../constants/company';

export default function Register() {
  const [searchParams] = useSearchParams();
  const initialPlan = searchParams.get('planId') || searchParams.get('plan') || '';
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: searchParams.get('email') || '', phone: '', password: '', city: '', planId: initialPlan });
  const [plans, setPlans] = useState([]);
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const upd = k => e => setForm({...form, [k]: e.target.value});
  const isValidEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  useEffect(()=>{api.get('/public/plans').then(r=>{const rows=r.data.data||[];setPlans(rows);setForm(f=>({...f,planId:f.planId||rows[0]?.id||''}))})},[]);

  const goToAccessStep = () => {
    setError('');
    if (!form.name.trim()) {
      setError('Digite o nome da barbearia para continuar.');
      return;
    }
    setStep(2);
  };

  const validateAccessStep = async () => {
    const email = form.email.trim().toLowerCase();
    setError('');
    if (!email) {
      setError('Digite seu e-mail para continuar.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Digite um e-mail válido para continuar.');
      return;
    }
    if (form.password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.emailStatus(email);
      if (res.data.data?.exists) {
        setError('E-mail já cadastrado. Use o login ou recupere sua senha.');
        return;
      }
      setForm(current => ({ ...current, email }));
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível validar o e-mail agora.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.register({
        barbershopName: form.name,
        city: form.city,
        phone: form.phone,
        name: 'Administrador',
        email: form.email,
        password: form.password, saasPlansId: form.planId, inviteToken: searchParams.get('invite') || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível criar a conta');
    } finally {
      setLoading(false);
    }
  };
  const verify = async()=>{setLoading(true);setError('');try{await authService.verifyEmail({email:form.email,code});setStep(4)}catch(err){setError(err.response?.data?.error?.message||'Código inválido')}finally{setLoading(false)}};

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
            <Scissors size={16} className="text-dark" />
          </div>
          <span className="font-bold text-white">{COMPANY.product}</span>
        </div>
        <p className="text-xs text-gray-500 mb-5">{COMPANY_LEGAL_LINE}</p>

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
              {error && <p role="alert" className="text-xs text-red-400 text-center mt-3">{error}</p>}
              <button className="btn-primary w-full justify-center mt-6" onClick={goToAccessStep}>Continuar</button>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Crie seu acesso</h2>
              <p className="text-sm text-gray-500 mb-6">E-mail e senha do administrador</p>
              <div className="space-y-4">
                <div><label className="text-xs text-gray-400 mb-1 block">E-mail</label><input className="input" type="email" value={form.email} onChange={upd('email')} placeholder="seu@email.com" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Senha</label><input className="input" type="password" value={form.password} onChange={upd('password')} placeholder="Mínimo 6 caracteres" /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(1)}>Voltar</button>
                <button className="btn-primary flex-1 justify-center" onClick={validateAccessStep} disabled={loading}>{loading ? 'Validando...' : 'Continuar'}</button>
              </div>
              {error && <p role="alert" className="text-xs text-red-400 text-center mt-3">{error}</p>}
            </>
          )}
          {step === 3 && !submitted && (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Escolha seu plano</h2>
              <p className="text-sm text-gray-500 mb-6">O cadastro ficará em análise antes da liberação.</p>
              <div className="space-y-3">
                {plans.map(p => (
                  <label key={p.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${form.planId === p.id ? 'border-gold bg-gold/5' : 'border-dark-500 hover:border-dark-400'}`}>
                    <input type="radio" name="plan" value={p.id} checked={form.planId === p.id} onChange={upd('planId')} className="accent-gold" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{p.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{p.maxBarbers ? `Até ${p.maxBarbers} barbeiros` : 'Barbeiros ilimitados'}</span>
                    </div>
                    <span className="text-sm font-bold text-gold">R${p.price}/mês</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(2)}>Voltar</button>
                <button className="btn-primary flex-1 justify-center" onClick={submit}>{loading ? 'Enviando...' : 'Enviar para análise'}</button>
              </div>
              {error && <p className="text-xs text-red-400 text-center mt-3">{error}</p>}
            </>
          )}
          {submitted && step === 3 && <div>
            <h2 className="text-xl font-bold text-white mb-2">Verifique seu email</h2>
            <p className="text-sm text-gray-500 mb-5">Enviamos um link de verificação e um código para {form.email}.</p>
            <input className="input" value={code} onChange={e=>setCode(e.target.value)} placeholder="Código de 6 dígitos"/>
            <button className="btn-primary w-full justify-center mt-4" onClick={verify}>{loading?'Verificando...':'Confirmar email'}</button>
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          </div>}
          {step === 4 && <div className="text-center"><CheckCircle className="text-emerald-400 mx-auto mb-3"/><h2 className="text-xl font-bold text-white">Cadastro em análise</h2><p className="text-sm text-gray-500 mt-2">Você receberá um email quando o acesso for aprovado.</p></div>}
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Já tem conta? <Link to="/login" className="text-gold">Entrar</Link>
        </p>
        <p className="text-center text-[11px] text-gray-600 mt-3">
          Ao cadastrar, você concorda com os <Link to="/termos" className="text-gold">Termos</Link>, a <Link to="/privacidade" className="text-gold">Política de Privacidade</Link> e a <Link to="/cookies" className="text-gold">Política de Cookies</Link>.
        </p>
      </div>
    </div>
  );
}
