import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { reportsService } from '../../services/reports.service';
import { useBranch } from '../../context/BranchContext';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RelatorioAvancado() {
  const { branches, currentBranch, ready } = useBranch();
  const [branchView, setBranchView] = useState('current');
  const [data, setData] = useState(null);
  const [split, setSplit] = useState(null);

  const activeBranchId = branchView === 'all' ? 'all' : branchView === 'current' ? (currentBranch?.id || 'all') : branchView;
  const handleAllBranches = () => setBranchView('all');
  const handleCurrentBranch = () => setBranchView(prev => (prev === 'current' ? 'all' : 'current'));
  const handleBranch = (id) => setBranchView(prev => (prev === id ? 'all' : id));

  useEffect(() => {
    if (!ready) return;
    const params = activeBranchId === 'all' ? { branchId: 'all' } : { branchId: activeBranchId };
    Promise.all([
      reportsService.getRevenue(params),
      reportsService.getBranchSummary(params),
    ]).then(([revenueRes, splitRes]) => {
      setData(revenueRes.data?.data || null);
      setSplit(splitRes.data?.data || null);
    });
  }, [ready, activeBranchId]);

  return (
    <div className="space-y-5">
      <PageHeader title="Relatório Avançado" subtitle="Receita central, operação e rateio por filial" />

      <div className="flex flex-wrap gap-2">
        <button className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === 'all' ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`} onClick={handleAllBranches}>Todas as filiais</button>
        <button className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === 'current' ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`} onClick={handleCurrentBranch}>Filial atual</button>
        {branches.map(branch => (
          <button key={branch.id} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${branchView === branch.id ? 'bg-gold text-dark' : 'bg-dark-300 text-gray-400 hover:text-white'}`} onClick={() => handleBranch(branch.id)}>
            {branch.name}
          </button>
        ))}
      </div>

      {split && (
        <div className="card space-y-4">
          <div>
            <h3 className="section-title">Como o sistema distribui a assinatura</h3>
            <p className="text-sm text-gray-500 mt-1">{split.allocationMethod}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-dark-400 bg-dark-300 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Receita operacional</p>
              <p className="text-lg font-semibold text-white mt-1">{money(split.central?.operationalIncome)}</p>
            </div>
            <div className="rounded-xl border border-dark-400 bg-dark-300 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Assinatura central</p>
              <p className="text-lg font-semibold text-gold mt-1">{money(split.central?.subscriptionRevenue)}</p>
            </div>
            <div className="rounded-xl border border-dark-400 bg-dark-300 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Receita bruta</p>
              <p className="text-lg font-semibold text-emerald-400 mt-1">{money(split.central?.grossIncome)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Filial', 'Direta', 'Uso assinantes', 'Rateio', 'Total', '%'].map(col => (
                    <th key={col} className="table-header text-left">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {split.branches?.map(branch => (
                  <tr key={branch.id} className="border-t border-dark-400">
                    <td className="table-cell">
                      <span className="text-white font-medium">{branch.name}</span>
                      {branch.isMain && <span className="badge badge-gold ml-2">Matriz</span>}
                    </td>
                    <td className="table-cell text-emerald-400 font-semibold">{money(branch.directIncome)}</td>
                    <td className="table-cell text-gray-300">{money(branch.subscriberUsageValue)}</td>
                    <td className="table-cell text-gold font-semibold">{money(branch.allocatedSubscription)}</td>
                    <td className="table-cell text-white font-semibold">{money(branch.totalAttributedIncome)}</td>
                    <td className="table-cell text-gray-400">{Number(branch.sharePercent || 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && (
        <div className="card">
          <p className="text-xs text-gray-500">Receita por período</p>
          <p className="text-2xl font-black text-white mt-1">{money(data.summary?.total)}</p>
          <p className="text-sm text-gray-500 mt-2">
            {data.summary?.count || 0} lançamentos de receita operacional neste recorte.
          </p>
        </div>
      )}
    </div>
  );
}
