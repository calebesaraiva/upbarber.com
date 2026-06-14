import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authService } from '../../services/auth.service';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const send = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setError('');
    if (!normalizedEmail) {
      setError('Digite seu e-mail para continuar.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('Digite um e-mail válido para receber o código.');
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(normalizedEmail);
      setEmail(normalizedEmail);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'E-mail errado ou não cadastrado no sistema.');
    } finally {
      setLoading(false);
    }
  };
  const reset = async () => {
    setError('');
    if (!code.trim()) {
      setError('Digite o código enviado para seu e-mail.');
      return;
    }
    if (password.length < 6) {
      setError('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ email, code, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center"><Scissors size={16} className="text-dark" /></div>
          <span className="font-bold text-white">UpBarber</span>
        </div>
        <div className="card">
          {!sent ? (
            <>
              <div className="p-3 bg-gold/10 rounded-xl w-fit mb-4"><Mail size={24} className="text-gold" /></div>
              <h2 className="text-xl font-bold text-white mb-1">Recuperar senha</h2>
              <p className="text-sm text-gray-500 mb-6">Digite seu e-mail e enviaremos um código de recuperação.</p>
              <div className="space-y-4">
                <div><label className="text-xs text-gray-400 mb-1 block">E-mail</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>
              </div>
              {error && <p role="alert" className="text-xs text-red-400 text-center mt-3">{error}</p>}
              <button className="btn-primary w-full justify-center mt-6" onClick={send} disabled={loading}>{loading ? 'Enviando...' : 'Enviar código'}</button>
            </>
          ) : !done ? (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Redefinir senha</h2>
              <p className="text-sm text-gray-500 mb-6">Informe o código recebido por email.</p>
              <div className="space-y-4">
                <input className="input" value={code} onChange={e=>setCode(e.target.value)} placeholder="Código de 6 dígitos" />
                <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nova senha" />
              </div>
              {error && <p role="alert" className="text-xs text-red-400 text-center mt-3">{error}</p>}
              <button className="btn-primary w-full justify-center mt-6" onClick={reset} disabled={loading}>{loading ? 'Salvando...' : 'Redefinir senha'}</button>
            </>
          ) : (
            <div className="text-center">
              <div className="p-3 bg-emerald-500/10 rounded-xl w-fit mx-auto mb-4"><CheckCircle size={24} className="text-emerald-400" /></div>
              <h2 className="text-xl font-bold text-white mb-2">Senha atualizada</h2>
              <p className="text-sm text-gray-500">Você já pode entrar com sua nova senha.</p>
            </div>
          )}
        </div>
        <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-white mt-4 transition-colors">
          <ArrowLeft size={14} /> Voltar ao login
        </Link>
      </div>
    </div>
  );
}
