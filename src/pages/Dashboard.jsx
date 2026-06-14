import { useEffect, useState } from 'react';
import { DollarSign, CalendarDays, Crown, AlertTriangle, Package, Users } from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { dashboardService } from '../services/dashboard.service';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardService.load().then(setData).catch(err => setError(err.response?.data?.error?.message || 'Falha ao carregar dashboard'));
  }, []);

  if (error) return <div className="card text-red-400">{error}</div>;
  if (!data) return <div className="card text-gray-400">Carregando dados...</div>;

  const appointments = data.appointments || [];
  const notifications = data.notifications?.data || data.notifications || [];
  const barbers = data.barbers?.data || data.barbers || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Receitas" value={money(data.financial?.totalIncome)} icon={DollarSign} color="gold" />
        <MetricCard title="Lucro" value={money(data.financial?.profit)} icon={DollarSign} color="green" />
        <MetricCard title="Agendamentos Hoje" value={appointments.length} icon={CalendarDays} color="purple" />
        <MetricCard title="Assinaturas Ativas" value={data.subscriptions?.active || 0} icon={Crown} color="gold" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Assinaturas Vencidas" value={(data.overdue || []).length} icon={AlertTriangle} color="red" />
        <MetricCard title="Produtos com Estoque Baixo" value={(data.products || []).length} icon={Package} color="blue" />
        <MetricCard title="Barbeiros" value={barbers.length} icon={Users} color="green" />
        <MetricCard title="Notificações" value={notifications.filter(item => !item.isRead).length} icon={AlertTriangle} color="red" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="section-title mb-4">Agenda de Hoje</h3>
          <div className="space-y-2">
            {appointments.length === 0 && <p className="text-sm text-gray-500">Nenhum agendamento para hoje.</p>}
            {appointments.slice(0, 8).map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg">
                <span className="text-sm font-bold text-gold">{new Date(item.date).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</span>
                <div className="flex-1">
                  <p className="text-sm text-white">{item.client?.name || 'Cliente'}</p>
                  <p className="text-xs text-gray-500">{item.service?.name || 'Serviço'} · {item.barber?.name || 'Barbeiro'}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="section-title mb-4">Alertas Reais</h3>
          <div className="space-y-2">
            {notifications.length === 0 && <p className="text-sm text-gray-500">Nenhum alerta.</p>}
            {notifications.slice(0, 8).map(item => (
              <div key={item.id} className="p-3 bg-dark-300 rounded-lg">
                <p className="text-sm text-white">{item.title}</p>
                <p className="text-xs text-gray-500 mt-1">{item.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
