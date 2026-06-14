import { Building2, MapPin } from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

export function PageHeader({ title, subtitle, actions }) {
  const { currentBranch } = useBranch();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        {currentBranch && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-dark-400 bg-dark-200 px-3 py-1 text-xs text-gray-300">
            <Building2 size={13} className="text-gold" />
            <span className="font-medium text-white">{currentBranch.name}</span>
            {currentBranch.isMain && <span className="badge badge-gold">Matriz</span>}
            <span className="text-gray-500 hidden sm:inline-flex items-center gap-1">
              <MapPin size={12} />
              Filial ativa
            </span>
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
