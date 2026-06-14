import { Building2, Menu, Bell, Plus, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { notificationsService } from '../../services/notifications.service';
import { useBranch } from '../../context/BranchContext';

const titles = {
  '/dashboard': 'Painel',
  '/agenda': 'Agenda',
  '/clientes': 'Clientes',
  '/barbeiros': 'Barbeiros',
  '/servicos': 'Serviços',
  '/planos': 'Planos de Assinatura',
  '/assinantes': 'Clientes Assinantes',
  '/assinaturas': 'Controle de Assinaturas',
  '/financeiro': 'Financeiro',
  '/caixa': 'Caixa do Dia',
  '/produtos': 'Produtos',
  '/estoque': 'Estoque',
  '/comandas': 'Comandas',
  '/relatorios': 'Relatórios',
  '/whatsapp': 'Automação WhatsApp',
  '/campanhas': 'Campanhas',
  '/configuracoes': 'Configurações',
  '/notificacoes': 'Notificações',
  '/suporte': 'Suporte',
  '/saas-planos': 'Meu Plano',
  '/filiais': 'Filiais',
};

export function Header() {
  const { setSidebarOpen } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { branches, currentBranch, changeBranch } = useBranch();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    notificationsService.list().then(res => {
      const items = res.data.data?.data || res.data.data || [];
      setUnread(items.filter(item => !item.isRead).length);
    }).catch(() => setUnread(0));
  }, [location.pathname]);

  const title = Object.entries(titles).find(([path]) => location.pathname.startsWith(path))?.[1] || 'UpBarber';

  const handleBranchChange = (id) => {
    const branch = branches.find(item => item.id === id);
    if (!branch) return;
    changeBranch(branch);
    window.location.reload();
  };

  return (
    <header className="h-16 bg-dark-100 border-b border-dark-400 flex items-center gap-4 px-4 lg:px-6 sticky top-0 z-20">
      <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-dark-300 text-gray-400 hover:text-white transition-colors">
        <Menu size={20} />
      </button>
      <h2 className="font-semibold text-white text-base flex-1 truncate">{title}</h2>
      <div className="hidden md:flex items-center gap-2 mr-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dark-400 bg-dark-200 text-xs text-gray-300 min-w-[220px]">
          <Building2 size={14} className="text-gold flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Filial ativa</p>
            <select
              value={currentBranch?.id || ''}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none cursor-pointer truncate"
            >
              {branches.length === 0 && <option value="">Nenhuma filial</option>}
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}{branch.isMain ? ' • Matriz' : ''}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/agenda/novo')} className="btn-primary text-xs py-1.5 px-3 hidden sm:flex">
          <Plus size={14} /> Novo
        </button>
        <button
          onClick={() => navigate('/filiais')}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dark-400 text-xs text-gray-300 hover:text-white hover:bg-dark-300 transition-colors"
        >
          <Building2 size={14} className="text-gold" />
          Filiais
        </button>
        <button onClick={() => navigate('/notificacoes')} className="relative p-2 rounded-lg hover:bg-dark-300 text-gray-400 hover:text-white transition-colors">
          <Bell size={18} />
          {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-gold rounded-full text-[9px] font-bold text-dark flex items-center justify-center">{unread}</span>}
        </button>
      </div>
    </header>
  );
}
