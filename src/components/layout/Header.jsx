import { Menu, Bell, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { notificationsService } from '../../services/notifications.service';

const titles = {
  '/dashboard': 'Dashboard',
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
};

export function Header() {
  const { setSidebarOpen } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    notificationsService.list().then(res => {
      const items = res.data.data?.data || res.data.data || [];
      setUnread(items.filter(item => !item.isRead).length);
    }).catch(() => setUnread(0));
  }, [location.pathname]);

  const title = Object.entries(titles).find(([path]) => location.pathname.startsWith(path))?.[1] || 'UpBarber';

  return (
    <header className="h-16 bg-dark-100 border-b border-dark-400 flex items-center gap-4 px-4 lg:px-6 sticky top-0 z-20">
      <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-dark-300 text-gray-400 hover:text-white transition-colors">
        <Menu size={20} />
      </button>
      <h2 className="font-semibold text-white text-base flex-1">{title}</h2>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/agenda/novo')} className="btn-primary text-xs py-1.5 px-3 hidden sm:flex">
          <Plus size={14} /> Novo
        </button>
        <button onClick={() => navigate('/notificacoes')} className="relative p-2 rounded-lg hover:bg-dark-300 text-gray-400 hover:text-white transition-colors">
          <Bell size={18} />
          {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-gold rounded-full text-[9px] font-bold text-dark flex items-center justify-center">{unread}</span>}
        </button>
      </div>
    </header>
  );
}
