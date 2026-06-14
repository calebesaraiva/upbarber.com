import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { subscriptionsService } from '../../services/subscriptions.service';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Subscribers() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    subscriptionsService.list({ limit: 100 }).then(r => setItems(r.data.data?.data || []));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Assinantes" subtitle={`${items.length} assinatura${items.length !== 1 ? 's' : ''} ativa${items.length !== 1 ? 's' : ''}`} />
      <div className="card p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhum assinante cadastrado.</p>
        ) : (
          <div className="divide-y divide-dark-400">
            {items.map(x => (
              <div key={x.id} className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{x.client?.name}</p>
                  <p className="text-xs text-gray-500">{x.plan?.name} · {money(x.price)}/mês</p>
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
