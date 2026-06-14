import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { reportsService } from '../../services/reports.service';
import { useBranch } from '../../context/BranchContext';

export default function RelatorioAvancado() {
  const { branches, currentBranch, ready } = useBranch();
  const [branchView, setBranchView] = useState('current');
  const [data, setData] = useState({});
  const activeBranchId = branchView === 'all' ? 'all' : branchView === 'current' ? (currentBranch?.id || 'all') : branchView;

  useEffect(() => {
    if (!ready) return;
    reportsService.getRevenue(activeBranchId === 'all' ? { branchId: 'all' } : { branchId: activeBranchId }).then(r => setData(r.data.data));
  }, [ready, activeBranchId]);

  return (
    <div className="space-y-5">
      <PageHeader title="Relatório Avançado" subtitle="Consulta real" />
      <div className="flex flex-wrap gap-2">
        <button className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === 'all' ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`} onClick={() => setBranchView('all')}>Todas as filiais</button>
        <button className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === 'current' || branchView === currentBranch?.id ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`} onClick={() => setBranchView(currentBranch?.id || 'all')}>Filial atual</button>
        {branches.map(branch => (
          <button key={branch.id} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === branch.id ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`} onClick={() => setBranchView(branch.id)}>
            {branch.name}
          </button>
        ))}
      </div>
      <pre className="card text-xs text-gray-400 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
