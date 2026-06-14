import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authService } from '../../services/auth.service';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    await authService.forgotPassword(email).catch(() => {});
    setLoading(false);
    setSent(true);
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
              <p className="text-sm text-gray-500 mb-6">Digite seu e-mail e enviaremos um link de recuperação.</p>
              <div className="space-y-4">
                <div><label className="text-xs text-gray-400 mb-1 block">E-mail</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>
              </div>
              <button className="btn-primary w-full justify-center mt-6" onClick={send}>{loading ? 'Enviando...' : 'Enviar link'}</button>
            </>
          ) : (
            <div className="text-center">
              <div className="p-3 bg-emerald-500/10 rounded-xl w-fit mx-auto mb-4"><CheckCircle size={24} className="text-emerald-400" /></div>
              <h2 className="text-xl font-bold text-white mb-2">E-mail enviado!</h2>
              <p className="text-sm text-gray-500">Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
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
