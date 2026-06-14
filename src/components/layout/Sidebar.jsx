import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Users, Scissors, Star, CreditCard, BarChart3,
  MessageCircle, Settings, Package, ShoppingCart, FileText, Bell, HelpCircle,
  LogOut, X, ChevronDown, ChevronRight, Zap, Crown
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { canAccessPath } from '../../utils/access';

const navGroups = [
  {
    label: null,
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }]
  },
  {
    label: 'Atendimento',
    items: [
      { to: '/agenda', icon: CalendarDays, label: 'Agenda' },
      { to: '/clientes', icon: Users, label: 'Clientes' },
      { to: '/barbeiros', icon: Scissors, label: 'Barbeiros' },
      { to: '/servicos', icon: Star, label: 'Serviços' },
    ]
  },
  {
    label: 'Assinaturas',
    items: [
      { to: '/planos', icon: Crown, label: 'Planos' },
      { to: '/assinantes', icon: Users, label: 'Assinantes' },
      { to: '/assinaturas', icon: CreditCard, label: 'Controle' },
    ]
  },
  {
    label: 'Loja',
    items: [
      { to: '/produtos', icon: Package, label: 'Produtos' },
      { to: '/estoque', icon: ShoppingCart, label: 'Estoque' },
      { to: '/comandas', icon: FileText, label: 'Comandas' },
    ]
  },
  {
    label: 'Financeiro',
    items: [
      { to: '/financeiro', icon: BarChart3, label: 'Financeiro' },
      { to: '/caixa', icon: CreditCard, label: 'Caixa do Dia' },
    ]
  },
  {
    label: 'Relatórios',
    items: [{ to: '/relatorios', icon: FileText, label: 'Relatórios' }]
  },
  {
    label: 'Automação',
    items: [
      { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
      { to: '/campanhas', icon: Zap, label: 'Campanhas' },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { to: '/configuracoes', icon: Settings, label: 'Configurações' },
      { to: '/notificacoes', icon: Bell, label: 'Notificações' },
      { to: '/suporte', icon: HelpCircle, label: 'Suporte' },
      { to: '/saas-planos', icon: Crown, label: 'Meu Plano' },
    ]
  }
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp();
  const { logout, user, barbershop } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => logout();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-dark-400">
        <div className="w-9 h-9 bg-gold rounded-xl flex items-center justify-center flex-shrink-0">
          <Scissors size={18} className="text-dark" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-none">UpBarber</p>
          <p className="text-xs text-gray-500 mt-0.5">Barbearia Premium</p>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden p-1 text-gray-500 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map(group => ({ ...group, items: group.items.filter(item => canAccessPath(user?.role, item.to)) }))
          .filter(group => group.items.length > 0)
          .map((group, gi) => (
          <div key={gi}>
            {group.label && <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-1">{group.label}</p>}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={16} className="flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-dark-400">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold">BP</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{barbershop?.name || 'UpBarber'}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email || 'usuario@upbarber.com'}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-dark-100 border-r border-dark-400 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-dark-100 border-r border-dark-400 z-50 lg:hidden flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
