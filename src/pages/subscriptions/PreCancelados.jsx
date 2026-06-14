import { useEffect, useState } from 'react';
import { UserX } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { subscriptionsService } from '../../services/subscriptions.service';
import { useApp } from '../../context/AppContext';

export default function PreCancelados() {
  const { addToast } = useApp();
  const [items, setItems] = useState([]);

  const load = () => subscriptionsService.getPipeline({ stage: 'pre_cancelled' })
    .then(r => setItems(r.data.data?.data || r.data.data || []))
    .catch(() => addToast('Erro ao carregar pré-cancelados', 'error'));

  useEffect(() => { load(); }, []);

  const retain = async id => {
    try {
      await subscriptionsService.retain(id);
      await load();
      addToast('Cliente retido com sucesso!', 'success');
    } catch (e) {
      addToast(e.response?.data?.error?.message || 'Erro ao reter cliente', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Pré-Cancelados" subtitle={`${items.length} cliente${items.length !== 1 ? 's' : ''} com risco de cancelamento`} />
      <div className="card p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhum pré-cancelado no momento.</p>
        ) : (
          <div className="divide-y divide-dark-400">
            {items.map(x => (
              <div key={x.id} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <UserX size={15} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{x.client?.name || '—'}</p>
                  <p className="text-xs text-gray-500">{x.reason || x.plan?.name || '—'}</p>
                </div>
                <button className="btn-secondary py-1.5 px-3 text-xs text-emerald-400 hover:border-emerald-400" onClick={() => retain(x.id)}>
                  Reter
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
