import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { subscriptionsService } from '../../services/subscriptions.service';
import { useApp } from '../../context/AppContext';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SubscriptionControl() {
  const { addToast } = useApp();
  const [items, setItems] = useState([]);

  const load = () => subscriptionsService.list({ limit: 100 }).then(r => setItems(r.data.data?.data || []));
  useEffect(() => { load(); }, []);

  const renew = async id => {
    try {
      await subscriptionsService.renew(id);
      await load();
      addToast('Assinatura renovada', 'success');
    } catch {
      addToast('Erro ao renovar assinatura', 'error');
    }
  };

  const cancel = async id => {
    try {
      await subscriptionsService.cancel(id);
      await load();
      addToast('Assinatura cancelada', 'success');
    } catch {
      addToast('Erro ao cancelar assinatura', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Controle de Assinaturas" subtitle="Gerencie renovações e cancelamentos" />
      <div className="card p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhuma assinatura encontrada.</p>
        ) : (
          <div className="divide-y divide-dark-400">
            {items.map(x => (
              <div key={x.id} className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{x.client?.name}</p>
                  <p className="text-xs text-gray-500">{x.plan?.name} · {money(x.price)}/mês</p>
                </div>
                <StatusBadge status={x.status} />
                <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => renew(x.id)}>Renovar</button>
                <button className="btn-secondary py-1.5 px-3 text-xs text-red-400 hover:border-red-400" onClick={() => cancel(x.id)}>Cancelar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
