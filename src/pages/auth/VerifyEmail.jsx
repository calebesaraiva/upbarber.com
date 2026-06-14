import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { COMPANY, COMPANY_LEGAL_LINE } from '../../constants/company';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verificando seu e-mail...');

  useEffect(() => {
    let alive = true;
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Link inválido. Abra o e-mail novamente e clique no botão de verificação.');
        return;
      }
      try {
        await authService.verifyEmailLink(token);
        if (!alive) return;
        setStatus('success');
        setMessage('Email verificado com sucesso. Agora seu cadastro segue para análise.');
      } catch (err) {
        if (!alive) return;
        setStatus('error');
        setMessage(err.response?.data?.error?.message || 'Não foi possível verificar esse link.');
      }
    };
    verify();
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#0d0d0d] p-8 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gold/15 text-gold flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-2xl font-black tracking-tight">{COMPANY.product}</p>
            <p className="text-xs text-gray-500">{COMPANY_LEGAL_LINE}</p>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 text-center">
          <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${status === 'success' ? 'bg-emerald-500/15 text-emerald-400' : status === 'error' ? 'bg-red-500/15 text-red-400' : 'bg-gold/15 text-gold'}`}>
            {status === 'success' ? <CheckCircle2 size={28} /> : status === 'error' ? <Mail size={28} /> : <LoaderCircle size={28} className="animate-spin" />}
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight">
            {status === 'success' ? 'E-mail verificado' : status === 'error' ? 'Não conseguimos verificar' : 'Verificando...'}
          </h1>
          <p className="mt-3 text-sm text-gray-400 leading-6">{message}</p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" className="btn-primary justify-center">
              Ir para o login
            </Link>
            <Link to="/cadastro" className="btn-secondary justify-center">
              Fazer pré-cadastro
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-5">
          O código de e-mail continua disponível como alternativa segura quando necessário.
        </p>
      </div>
    </div>
  );
}
