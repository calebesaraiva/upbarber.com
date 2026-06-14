import { useEffect, useState } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { financialService } from '../../services/financial.service';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function GerarComissoes() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    financialService.listCommissionReports({ limit: 100 }).then(r => setItems(r.data.data?.data || []));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Comissões" subtitle="Relatórios de comissão por barbeiro" />
      <div className="card p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhum relatório de comissão gerado.</p>
        ) : (
          <div className="divide-y divide-dark-400">
            {items.map(x => (
              <div key={x.id} className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{x.barber?.name}</p>
                  <p className="text-xs text-gray-500">
                    {x.period && new Date(x.period).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-400">{money(x.totalCommission)}</span>
                <span className={`badge ${x.isPaid ? 'badge-green' : 'badge-yellow'} flex items-center gap-1`}>
                  {x.isPaid ? <CheckCircle size={10} /> : <Clock size={10} />}
                  {x.isPaid ? 'Pago' : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
