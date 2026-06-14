import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, BarChart3, Settings } from 'lucide-react';

const items = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { to: '/agenda', icon: CalendarDays, label: 'Agenda' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/financeiro', icon: BarChart3, label: 'Financeiro' },
  { to: '/configuracoes', icon: Settings, label: 'Config' },
];

export function BottomNavigation() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-dark-100 border-t border-dark-400 z-20 safe-area-bottom">
      <div className="flex">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${isActive ? 'text-gold' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
