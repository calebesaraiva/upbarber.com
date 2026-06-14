import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { financialService } from '../../services/financial.service';
import { useBranch } from '../../context/BranchContext';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const STATUS_LABELS = { open: 'Aberto', closed: 'Fechado' };

function unwrapList(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

export default function HistoricoCaixas() {
  const { branches, currentBranch, ready } = useBranch();
  const [items, setItems] = useState([]);
  const [branchView, setBranchView] = useState('current');
  const activeBranchId = branchView === 'all' ? 'all' : branchView === 'current' ? (currentBranch?.id || 'all') : branchView;

  useEffect(() => {
    if (!ready) return;
    financialService.getRegisterHistory({ limit: 100, ...(activeBranchId === 'all' ? { branchId: 'all' } : { branchId: activeBranchId }) }).then(r => setItems(unwrapList(r.data.data)));
  }, [ready, activeBranchId]);

  return (
    <div className="space-y-5">
      <PageHeader title="Histórico de Caixas" subtitle="Registro de todos os caixas abertos e fechados" />
      <div className="flex flex-wrap gap-2">
        <button className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === 'all' ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`} onClick={() => setBranchView('all')}>Todas as filiais</button>
        <button className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === 'current' || branchView === currentBranch?.id ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`} onClick={() => setBranchView(currentBranch?.id || 'all')}>Filial atual</button>
        {branches.map(branch => (
          <button key={branch.id} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === branch.id ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`} onClick={() => setBranchView(branch.id)}>
            {branch.name}
          </button>
        ))}
      </div>
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
