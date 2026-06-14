import { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { subscriptionsService } from '../../services/subscriptions.service';
import { useApp } from '../../context/AppContext';

export default function PreAprovados() {
  const { addToast } = useApp();
  const [items, setItems] = useState([]);

  const load = () => subscriptionsService.getPipeline({ stage: 'approved' })
    .then(r => setItems(r.data.data?.data || r.data.data || []))
    .catch(() => addToast('Erro ao carregar pré-aprovados', 'error'));

  useEffect(() => { load(); }, []);

  const convert = async id => {
    try {
      await subscriptionsService.convert(id);
      await load();
      addToast('Convertido para assinante!', 'success');
    } catch (e) {
      addToast(e.response?.data?.error?.message || 'Erro ao converter', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Clientes Pré-Aprovados" subtitle={`${items.length} cliente${items.length !== 1 ? 's' : ''} no pipeline`} />
      <div className="card p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhum cliente pré-aprovado.</p>
        ) : (
          <div className="divide-y divide-dark-400">
            {items.map(x => (
              <div key={x.id} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <UserCheck size={15} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{x.client?.name || '—'}</p>
                  <p className="text-xs text-gray-500">{x.plan?.name || x.planName || '—'}</p>
                </div>
                <button className="btn-primary py-1.5 px-3 text-xs" onClick={() => convert(x.id)}>
                  Converter
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
