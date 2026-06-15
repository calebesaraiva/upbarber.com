import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { financialService } from '../../services/financial.service';
import { useBranch } from '../../context/BranchContext';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function GerarComissoes() {
  const [items, setItems] = useState([]);
  const { branches, currentBranch, ready } = useBranch();
  const [branchView, setBranchView] = useState('current');
  const handleAllBranches = () => setBranchView('all');
  const handleCurrentBranch = () => setBranchView(prev => (prev === 'current' || prev === currentBranch?.id ? 'all' : currentBranch?.id || 'all'));
  const handleBranch = (id) => setBranchView(prev => (prev === id ? 'all' : id));

  const activeBranchId = branchView === 'all'
    ? 'all'
    : branchView === 'current'
      ? (currentBranch?.id || 'all')
      : branchView;

  const load = useCallback(async () => {
    const params = { limit: 100, ...(activeBranchId === 'all' ? { branchId: 'all' } : { branchId: activeBranchId }) };
    const res = await financialService.listCommissionReports(params);
    setItems(res.data.data?.data || []);
  }, [activeBranchId]);

  useEffect(() => {
    if (!ready) return;
    queueMicrotask(() => {
      load().catch(() => setItems([]));
    });
  }, [ready, load]);

  return (
    <div className="space-y-5">
      <PageHeader title="Comissões" subtitle="Relatórios de comissão por barbeiro" />
      <div className="flex flex-wrap gap-2">
        <button className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === 'all' ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`} onClick={handleAllBranches}>Todas as filiais</button>
        <button className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === 'current' || branchView === currentBranch?.id ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`} onClick={handleCurrentBranch}>Filial atual</button>
        {branches.map(branch => (
          <button
            key={branch.id}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === branch.id ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`}
            onClick={() => handleBranch(branch.id)}
          >
            {branch.name}
          </button>
        ))}
      </div>
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
                    {x.period && new Date(`${x.period}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    {branchView === 'all' && x.branch?.name ? ` · ${x.branch.name}` : ''}
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
