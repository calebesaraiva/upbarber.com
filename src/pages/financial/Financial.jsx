import { useEffect, useState } from 'react';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { financialService } from '../../services/financial.service';
import { useApp } from '../../context/AppContext';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PM_LABELS = { pix: 'Pix', cash: 'Dinheiro', credit: 'Crédito', debit: 'Débito', subscription: 'Assinatura' };

export default function Financial() {
  const { addToast } = useApp();
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      financialService.getSummary(),
      financialService.listTransactions({ limit: 100 }),
    ]).then(([s, t]) => {
      setSummary(s.data.data || {});
      setTransactions(t.data.data?.data || []);
    }).catch(() => {
      addToast('Erro ao carregar dados financeiros', 'error');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card text-center py-12 text-gray-500 text-sm">Carregando...</div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Financeiro" subtitle="Resumo financeiro do período atual" />

      <div className="grid grid-cols-3 gap-4">
        {[
          [TrendingUp, 'Receitas', summary.totalIncome, 'text-emerald-400'],
          [TrendingDown, 'Despesas', summary.totalExpense, 'text-red-400'],
          [DollarSign, 'Lucro', summary.profit, 'text-gold'],
        ].map(([Icon, label, val, color]) => (
          <div className="card" key={label}>
            <Icon size={18} className={color} />
            <p className="text-xs text-gray-500 mt-2">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>{money(val)}</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {transactions.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhuma transação registrada.</p>
        ) : (
          <div className="divide-y divide-dark-400">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{t.description}</p>
                  <p className="text-xs text-gray-500">
                    {t.category} · {PM_LABELS[t.paymentMethod] || t.paymentMethod || ''} · {t.date ? new Date(t.date).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
                <strong className={`text-sm flex-shrink-0 ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}{money(t.amount)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
