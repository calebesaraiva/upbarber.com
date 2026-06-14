import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { financialService } from '../../services/financial.service';
import { useApp } from '../../context/AppContext';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PM_LABELS = { pix: 'Pix', cash: 'Dinheiro', credit: 'Crédito', debit: 'Débito', subscription: 'Assinatura' };

export default function CaixaDia() {
  const { addToast } = useApp();
  const [summary, setSummary] = useState({});
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', type: 'income', category: 'Manual', paymentMethod: 'cash', date: new Date().toISOString().slice(0, 10) });

  const load = () => Promise.all([
    financialService.getSummary(),
    financialService.listTransactions({ limit: 100 }),
  ]).then(([s, t]) => {
    setSummary(s.data.data || {});
    setItems(t.data.data?.data || []);
  });

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await financialService.createTransaction({ ...form, amount: Number(form.amount) });
      setOpen(false);
      setForm({ description: '', amount: '', type: 'income', category: 'Manual', paymentMethod: 'cash', date: new Date().toISOString().slice(0, 10) });
      await load();
      addToast('Lançamento registrado', 'success');
    } catch {
      addToast('Erro ao registrar lançamento', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Caixa do Dia"
        subtitle="Movimentações financeiras do dia"
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Lançamento</button>}
      />

      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Entradas</p>
          <p className="text-xl font-black text-emerald-400">{money(summary.totalIncome)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Saídas</p>
          <p className="text-xl font-black text-red-400">{money(summary.totalExpense)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Saldo</p>
          <p className={`text-xl font-black ${(summary.profit || 0) >= 0 ? 'text-gold' : 'text-red-400'}`}>{money(summary.profit)}</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhum lançamento hoje.</p>
        ) : (
          <div className="divide-y divide-dark-400">
            {items.map(x => (
              <div key={x.id} className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="text-sm text-white">{x.description}</p>
                  <p className="text-xs text-gray-500">{PM_LABELS[x.paymentMethod] || x.paymentMethod} · {x.category}</p>
                </div>
                <span className={`font-semibold text-sm ${x.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {x.type === 'income' ? '+' : '-'}{money(x.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Novo lançamento">
        <div className="space-y-3">
          <input className="input" placeholder="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input className="input" type="number" placeholder="Valor (R$)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="income">Entrada</option>
            <option value="expense">Saída</option>
          </select>
          <select className="input" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
            {Object.entries(PM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn-primary w-full justify-center" onClick={save}>Salvar</button>
        </div>
      </Modal>
    </div>
  );
}
