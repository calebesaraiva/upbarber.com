import { Building2, ChevronDown, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBranch } from '../../context/BranchContext';

export function BranchSwitcher({ mobile = false }) {
  const navigate = useNavigate();
  const { branches, currentBranch, changeBranch } = useBranch();

  const handleBranchChange = (id) => {
    if (id === 'all') {
      changeBranch('all');
      return;
    }
    const branch = branches.find(item => item.id === id);
    if (!branch) return;
    changeBranch(branch);
  };

  if (mobile) {
    return (
      <div className="lg:hidden px-4 pt-3">
        <div className="rounded-2xl border border-dark-400 bg-dark-200 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center text-gold flex-shrink-0">
            <Building2 size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Filial ativa</p>
            <select
              value={currentBranch?.id || 'all'}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-white outline-none cursor-pointer truncate"
            >
              <option value="all">Todas as filiais</option>
              {branches.length === 0 && <option value="">Nenhuma filial</option>}
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}{branch.isMain ? ' • Matriz' : ''}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
          <button
            type="button"
            onClick={() => navigate('/filiais')}
            className="hidden sm:inline-flex btn-secondary py-2 px-3 text-xs"
          >
            <MapPin size={14} />
            Ver
          </button>
        </div>
      </div>
    );
  }

  return null;
}
