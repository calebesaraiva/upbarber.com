import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { subscriptionsService } from '../../services/subscriptions.service';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ContratosAtivos() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    subscriptionsService.list({ status: 'active', limit: 100 }).then(r => setItems(r.data.data?.data || []));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Contratos Ativos" subtitle={`${items.length} contrato${items.length !== 1 ? 's' : ''} ativo${items.length !== 1 ? 's' : ''}`} />
      <div className="card p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhum contrato ativo no momento.</p>
        ) : (
          <div className="divide-y divide-dark-400">
            {items.map(x => (
              <div key={x.id} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={15} className="text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{x.client?.name}</p>
                  <p className="text-xs text-gray-500">{x.plan?.name} · vence {x.currentPeriodEnd ? new Date(x.currentPeriodEnd).toLocaleDateString('pt-BR') : '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gold">{money(x.price)}<span className="text-xs text-gray-500">/mês</span></p>
                </div>
                <StatusBadge status={x.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
