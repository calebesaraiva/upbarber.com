import { useEffect, useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { subscriptionsService } from '../../services/subscriptions.service';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function CalendarioRecebiveis() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    subscriptionsService.list({ limit: 200 }).then(r => {
      const data = r.data.data?.data || [];
      setItems(data.sort((a, b) => new Date(a.currentPeriodEnd) - new Date(b.currentPeriodEnd)));
    });
  }, []);

  const total = items.reduce((sum, x) => sum + Number(x.price || 0), 0);
  const overdue = items.filter(x => daysUntil(x.currentPeriodEnd) < 0);
  const upcoming = items.filter(x => { const d = daysUntil(x.currentPeriodEnd); return d >= 0 && d <= 7; });

  return (
    <div className="space-y-5">
      <PageHeader title="Calendário de Recebíveis" subtitle="Vencimentos das assinaturas" />

      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total mensal</p>
          <p className="text-xl font-black text-gold">{money(total)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Vencidos</p>
          <p className="text-xl font-black text-red-400">{overdue.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Vencem em 7 dias</p>
          <p className="text-xl font-black text-yellow-400">{upcoming.length}</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhuma assinatura encontrada.</p>
        ) : (
          <div className="divide-y divide-dark-400">
            {items.map(x => {
              const days = daysUntil(x.currentPeriodEnd);
              const isOverdue = days !== null && days < 0;
              const isSoon = days !== null && days >= 0 && days <= 7;
              return (
                <div key={x.id} className="flex items-center gap-3 p-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-500/10' : isSoon ? 'bg-yellow-500/10' : 'bg-gold/10'}`}>
                    {isOverdue
                      ? <AlertCircle size={15} className="text-red-400" />
                      : <Calendar size={15} className={isSoon ? 'text-yellow-400' : 'text-gold'} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{x.client?.name}</p>
                    <p className="text-xs text-gray-500">{x.plan?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white">{money(x.price)}</p>
                    {x.currentPeriodEnd && (
                      <p className={`text-xs ${isOverdue ? 'text-red-400' : isSoon ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {isOverdue
                          ? `${Math.abs(days)}d atrasado`
                          : days === 0
                            ? 'Vence hoje'
                            : `${new Date(x.currentPeriodEnd).toLocaleDateString('pt-BR')}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
