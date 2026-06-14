import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Crown, ExternalLink, LoaderCircle, QrCode, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { settingsService } from '../../services/settings.service';
import { COMPANY, COMPANY_LEGAL_LINE } from '../../constants/company';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function SaasPaymentGate() {
  const { barbershop } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const shouldBlock = useMemo(() => {
    if (!barbershop) return false;
    const status = barbershop.saasStatus || barbershop.subscriptionStatus;
    return ['active', 'trial', 'overdue', 'pending'].includes(status) && Boolean(invoice);
  }, [barbershop, invoice]);

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await settingsService.getCurrentSaasInvoice();
      setInvoice(res.data.data || null);
    } catch {
      setInvoice(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let timer;
    if (invoice && invoice.status !== 'paid') {
      timer = setInterval(load, 30000);
    }
    return () => clearInterval(timer);
  }, [invoice]);

  if (loading || !shouldBlock || invoice?.status === 'paid') return null;

  const copyPix = async () => {
    await navigator.clipboard.writeText(invoice.pix.copyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.14),transparent_28%)] pointer-events-none" />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0b0c] shadow-2xl shadow-black/60">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gold/15 text-gold flex items-center justify-center">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gold font-bold">Primeiro acesso</p>
                <h2 className="text-3xl font-black mt-1 text-white">Seu pagamento Pix está pronto</h2>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-300 leading-7">
              Para liberar o sistema da {COMPANY.product}, finalize a primeira mensalidade. O acesso fica disponível assim que o pagamento for confirmado.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 font-semibold">Plano</p>
                <p className="mt-2 text-lg font-bold text-white">{barbershop?.masterSaasPlan?.name || 'Plano contratado'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 font-semibold">Valor</p>
                <p className="mt-2 text-lg font-black text-gold">{money(invoice.amount)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 font-semibold">Vencimento</p>
                <p className="mt-2 text-lg font-bold text-white">{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 font-semibold">Forma</p>
                <p className="mt-2 text-lg font-bold text-white">Pix</p>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-gold/20 bg-gold/10 p-4">
              <div className="flex items-center gap-2 text-gold font-semibold text-sm">
                <Sparkles size={15} /> NEXUS TECNOLOGIA LTDA · CNPJ {COMPANY.cnpj}
              </div>
              <p className="mt-2 text-xs text-gray-300 leading-6">
                Chave Pix: CNPJ {COMPANY.cnpj} · {COMPANY.bank}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/saas-planos" className="btn-secondary py-3 px-4">
                <Crown size={16} /> Ver meus planos
              </Link>
              <button onClick={load} className="btn-secondary py-3 px-4" disabled={refreshing}>
                {refreshing ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />} Atualizar status
              </button>
            </div>
          </div>

          <div className="p-6 lg:p-8 bg-gradient-to-b from-white/5 to-transparent">
            <div className="rounded-[28px] border border-white/10 bg-white p-4">
              {invoice.pix?.qrCodeDataUrl ? (
                <img src={invoice.pix.qrCodeDataUrl} alt="QR Code Pix" className="w-full aspect-square object-contain rounded-2xl bg-white" />
              ) : (
                <div className="aspect-square flex items-center justify-center text-gray-400">
                  <QrCode size={56} />
                </div>
              )}
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-gray-400 font-semibold">Pix copia e cola</p>
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3">
                <p className="text-[11px] text-gray-500 leading-5 break-all">{invoice.pix.copyPaste}</p>
              </div>
              <button onClick={copyPix} className="btn-primary w-full justify-center mt-3">
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />} {copied ? 'Pix copiado' : 'Copiar código Pix'}
              </button>
              <a href={`mailto:${COMPANY.email}`} className="mt-3 inline-flex items-center justify-center gap-2 text-xs text-gold hover:text-gold-light w-full">
                Suporte financeiro {COMPANY.email} <ExternalLink size={13} />
              </a>
            </div>

            <p className="mt-4 text-[11px] text-gray-500 leading-5">
              {COMPANY_LEGAL_LINE}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
