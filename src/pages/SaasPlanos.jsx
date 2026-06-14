import { useEffect, useMemo, useState } from 'react';
import { Check, Crown, Sparkles, ArrowRightLeft, Clock3 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { settingsService } from '../services/settings.service';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { COMPANY } from '../constants/company';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SaasPlanos() {
  const { addToast } = useApp();
  const { barbershop } = useAuth();
  const [plans, setPlans] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requestPlan, setRequestPlan] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    settingsService.getSaasPlans()
      .then(r => setPlans(r.data.data || []))
      .catch(() => {});
    settingsService.getCurrentSaasInvoice()
      .then(r => setInvoice(r.data.data || null))
      .catch(() => {});
    settingsService.getSaasPlanChangeRequests()
      .then(r => setRequests(r.data.data || []))
      .catch(() => {});
  }, []);

  const activePlan = useMemo(() => {
    const currentId = barbershop?.saasPlanId || barbershop?.saasPlansId || barbershop?.masterSaasPlan?.id;
    return plans.find(plan => plan.id === currentId) || barbershop?.masterSaasPlan || barbershop?.saasPlan || null;
  }, [barbershop, plans]);

  const hasPix = invoice?.pix?.qrCodeDataUrl;
  const pendingRequest = requests.find(item => item.status === 'pending');

  const askUpgrade = plan => {
    setRequestPlan(plan);
    setRequestNote('');
  };

  const submitRequest = async () => {
    if (!requestPlan) return;
    setRequesting(true);
    try {
      await settingsService.requestSaasPlanChange({ targetPlanId: requestPlan.id, note: requestNote || undefined });
      addToast('Solicitação enviada para análise do master.', 'success');
      const r = await settingsService.getSaasPlanChangeRequests();
      setRequests(r.data.data || []);
      setRequestPlan(null);
      setRequestNote('');
    } catch (err) {
      addToast(err.response?.data?.error?.message || 'Não foi possível solicitar a migração', 'error');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title={`Meu Plano ${COMPANY.product}`} subtitle={`Plano e cobrança da plataforma mantida pela ${COMPANY.developer}`} />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="card border border-gold/30 bg-gold/5 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-28 bg-gradient-to-l from-gold/10 to-transparent pointer-events-none" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-gold/80">Plano ativo</p>
              <h2 className="text-2xl font-black text-white mt-1 truncate">{activePlan?.name || 'Plano atual'}</h2>
              <p className="text-sm text-gray-400 mt-2">Esse é o plano que está liberado nesta conta agora.</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-gold/15 text-gold px-3 py-2 text-sm font-semibold">
              {barbershop?.saasStatus || barbershop?.subscriptionStatus || '—'}
            </div>
          </div>

          {activePlan && (
            <div className="mt-5 grid gap-3 sm:grid-cols-[180px_1fr]">
              <div className="rounded-2xl bg-dark-300 p-4 border border-dark-400">
                <div className="text-3xl font-black text-gold">{money(activePlan.price)}</div>
                <div className="text-xs text-gray-500 mt-1">por mês</div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                  <Sparkles size={12} />
                  Plano em uso
                </div>
              </div>
              <div className="space-y-2">
                {(Array.isArray(activePlan.features) ? activePlan.features : []).slice(0, 6).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check size={14} className="text-emerald-400 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
                <div className="text-xs text-gray-500 pt-2">
                  Trocas de plano precisam de aprovação no painel master antes de entrarem em vigor.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Clock3 size={16} className="text-gold" />
            Solicitações em análise
          </div>
          <div className="mt-4 space-y-3">
            {pendingRequest ? (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                <p className="text-sm text-white font-medium">{pendingRequest.targetPlan?.name || 'Plano solicitado'}</p>
                <p className="text-xs text-gray-400 mt-1">Aguardando aprovação do master.</p>
                {pendingRequest.note && <p className="text-xs text-gray-500 mt-2">{pendingRequest.note}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhuma solicitação pendente.</p>
            )}
          </div>
        </div>
      </div>

      {invoice && hasPix && (
        <div className="card grid md:grid-cols-[220px_1fr] gap-5">
          <img src={invoice.pix.qrCodeDataUrl} className="w-full max-w-[220px] bg-white rounded-lg" alt="QR Code Pix" />
          <div>
            <h3 className="text-white font-bold text-lg">Pagamento via Pix</h3>
            <p className="text-gold text-2xl font-bold mt-2">{money(invoice.amount)}</p>
            <p className="text-sm text-gray-400 mt-2">Vencimento: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('pt-BR') : '—'}</p>
            <p className="text-sm text-gray-400">{COMPANY.bank} · CNPJ {COMPANY.cnpj} · {COMPANY.developer}</p>
            <textarea readOnly className="input mt-4 text-xs" rows={4} value={invoice.pix.copyPaste || ''} />
            <button
              className="btn-primary mt-3"
              onClick={() => navigator.clipboard.writeText(invoice.pix.copyPaste || '').then(() => alert('Copiado!'))}
            >
              Copiar Pix copia e cola
            </button>
          </div>
        </div>
      )}

      {invoice && !hasPix && (
        <div className="card border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-sm text-yellow-400">Fatura em aberto: {money(invoice.amount)} — vencimento {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('pt-BR') : '—'}. Entre em contato com o suporte para obter o QR Code de pagamento.</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-400">
        <ArrowRightLeft size={14} className="text-gold" />
        Os demais planos abaixo podem ser solicitados para migração. A troca só acontece após aprovação no painel master.
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map(p => {
          const isActive = activePlan?.id === p.id;
          return (
            <div
              key={p.id}
              className={`card relative overflow-hidden border transition-all ${isActive ? 'border-gold bg-gold/5' : 'border-dark-400'}`}
            >
              {isActive && <div className="absolute top-0 left-0 right-0 h-1 bg-gold" />}
              <Crown className={isActive ? 'text-gold' : 'text-gray-500'} />
              <div className="flex items-start justify-between gap-3 mt-3">
                <div>
                  <h3 className="text-xl text-white font-bold">{p.name}</h3>
                  <p className="text-2xl text-gold font-bold">{money(p.price)}<span className="text-sm text-gray-500">/mês</span></p>
                </div>
                {isActive && <span className="badge badge-green">Plano ativo</span>}
              </div>
              <div className="space-y-2 mt-4">
                {(Array.isArray(p.features) ? p.features : []).slice(0, 8).map(f => (
                  <p key={f} className="text-sm text-gray-400 flex gap-2">
                    <Check size={13} className="text-gold flex-shrink-0 mt-0.5" />
                    {f}
                  </p>
                ))}
              </div>
              <button
                className={`btn-primary w-full justify-center mt-5 ${isActive ? 'opacity-60 cursor-default' : ''}`}
                disabled={isActive}
                onClick={() => askUpgrade(p)}
              >
                {isActive ? 'Plano atual' : 'Solicitar migração'}
              </button>
            </div>
          );
        })}
      </div>

      <Modal isOpen={Boolean(requestPlan)} onClose={() => setRequestPlan(null)} title="Solicitar migração de plano">
        <div className="space-y-4">
          <div className="rounded-2xl border border-dark-400 bg-dark-300 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Novo plano</p>
            <p className="text-lg font-bold text-white mt-1">{requestPlan?.name}</p>
            <p className="text-sm text-gold font-semibold">{money(requestPlan?.price)} / mês</p>
          </div>
          <label className="block text-xs text-gray-400">
            Observação para o master
            <textarea
              className="input mt-1"
              rows={4}
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="Explique o motivo da troca, quantidade de unidades ou qualquer detalhe útil."
            />
          </label>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setRequestPlan(null)}>
              Cancelar
            </button>
            <button className="btn-primary flex-1 justify-center" onClick={submitRequest} disabled={requesting}>
              {requesting ? 'Enviando...' : 'Enviar solicitação'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
