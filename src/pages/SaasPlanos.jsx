import { useEffect, useState } from 'react';
import { Check, Crown } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { settingsService } from '../services/settings.service';
import { useAuth } from '../context/AuthContext';
import { COMPANY } from '../constants/company';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SaasPlanos() {
  const { barbershop } = useAuth();
  const [plans, setPlans] = useState([]);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    settingsService.getSaasPlans()
      .then(r => setPlans(r.data.data || []))
      .catch(() => {});
    settingsService.getCurrentSaasInvoice()
      .then(r => setInvoice(r.data.data || null))
      .catch(() => {});
  }, []);

  const hasPix = invoice?.pix?.qrCodeDataUrl;

  return (
    <div className="space-y-5">
      <PageHeader title={`Meu Plano ${COMPANY.product}`} subtitle={`Plano e cobrança da plataforma mantida pela ${COMPANY.developer}`} />

      <div className="card">
        <p className="text-xs text-gray-500 mb-1">Status atual</p>
        <p className="text-xl text-gold font-bold">{barbershop?.saasStatus || barbershop?.subscriptionStatus || '—'}</p>
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

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map(p => (
          <div key={p.id} className="card">
            <Crown className="text-gold" />
            <h3 className="text-xl text-white font-bold mt-3">{p.name}</h3>
            <p className="text-2xl text-gold font-bold">{money(p.price)}<span className="text-sm text-gray-500">/mês</span></p>
            {(Array.isArray(p.features) ? p.features : []).map(f => (
              <p key={f} className="text-sm text-gray-400 flex gap-2 mt-2"><Check size={13} className="text-gold flex-shrink-0 mt-0.5" />{f}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
