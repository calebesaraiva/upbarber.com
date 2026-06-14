import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { subscriptionsService } from '../../services/subscriptions.service';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PM_LABELS = { pix: 'Pix', cash: 'Dinheiro', credit: 'Crédito', debit: 'Débito', subscription: 'Assinatura' };

export default function SubscriptionPayments() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    subscriptionsService.listPayments({ limit: 100 })
      .then(r => setItems(r.data.data?.data || []))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Pagamentos de Assinatura" subtitle={`${items.length} registros encontrados`} />
      <div className="card p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhum pagamento registrado.</p>
        ) : (
          <div className="divide-y divide-dark-400">
            {items.map(x => (
              <div key={x.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{x.client?.name || x.subscription?.client?.name || 'Cliente'}</p>
                  <p className="text-xs text-gray-500">
                    {PM_LABELS[x.paymentMethod] || x.paymentMethod || '—'} · {x.paidAt ? new Date(x.paidAt).toLocaleDateString('pt-BR') : 'Pendente'}
                  </p>
                </div>
                <span className="text-gold font-semibold text-sm flex-shrink-0">{money(x.amount)}</span>
                <StatusBadge status={x.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
