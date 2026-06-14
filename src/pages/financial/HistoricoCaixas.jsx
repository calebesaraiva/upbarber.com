import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { financialService } from '../../services/financial.service';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const STATUS_LABELS = { open: 'Aberto', closed: 'Fechado' };

export default function HistoricoCaixas() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    financialService.getRegisterHistory({ limit: 100 }).then(r => setItems(r.data.data?.data || []));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Histórico de Caixas" subtitle="Registro de todos os caixas abertos e fechados" />
      <div className="card p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhum registro encontrado.</p>
        ) : (
          <div className="divide-y divide-dark-400">
            {items.map(x => (
              <div key={x.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-white">
                    {new Date(x.openedAt).toLocaleString('pt-BR')}
                  </p>
                  <span className={`badge ${x.status === 'closed' ? 'badge-gray' : 'badge-green'}`}>
                    {STATUS_LABELS[x.status] || x.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Abertura: {money(x.openingBalance)} · Fechamento: {money(x.closingBalance)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
