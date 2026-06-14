import { useCallback, useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Check, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { appointmentsService } from '../../services/appointments.service';
import { barbersService } from '../../services/barbers.service';
import { useApp } from '../../context/AppContext';
import { localDateInputValue } from '../../utils/date';
import { useBranch } from '../../context/BranchContext';

function unwrapList(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

export default function Agenda() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const { branches, currentBranch, ready } = useBranch();
  const [date, setDate] = useState(localDateInputValue());
  const [items, setItems] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [barberId, setBarberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        appointmentsService.list({ date, barberId: barberId || undefined, branchId: branchId || undefined, limit: 100 }),
        barbersService.list({ branchId: branchId || undefined }),
      ]);
      const allItems = unwrapList(a.data.data);
      const filtered = branchId === 'all'
        ? allItems
        : allItems.filter(item => item.branchId === branchId || !item.branchId);
      setItems(filtered);
      setBarbers(unwrapList(b.data.data));
    } catch {
      addToast('Erro ao carregar agenda', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, date, barberId, branchId]);

  useEffect(() => {
    if (!ready) return;
    queueMicrotask(() => {
      load();
    });
  }, [load, ready]);

  const move = days => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    setDate(localDateInputValue(d));
  };

  const finish = async id => {
    try {
      await appointmentsService.updateStatus(id, 'completed');
      addToast('Atendimento finalizado', 'success');
      load();
    } catch (e) {
      addToast(e.response?.data?.error?.message || 'Erro ao finalizar atendimento', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda"
        subtitle={new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        actions={<button className="btn-primary" onClick={() => navigate('/agenda/novo')}><Plus size={14} /> Novo Agendamento</button>}
      />
      <div className="flex gap-3 flex-wrap">
        <button className="btn-secondary" onClick={() => move(-1)}><ChevronLeft size={15} /></button>
        <input className="input w-auto" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn-secondary" onClick={() => move(1)}><ChevronRight size={15} /></button>
        <select className="input w-auto" value={branchId} onChange={e => setBranchId(e.target.value)}>
          <option value="all">Todas as filiais</option>
          {currentBranch?.id && <option value={currentBranch.id}>Filial atual</option>}
          {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}{branch.isMain ? ' · Matriz' : ''}</option>)}
        </select>
        <select className="input w-auto" value={barberId} onChange={e => setBarberId(e.target.value)}>
          <option value="">Todos os barbeiros</option>
          {barbers.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </div>
      <div className="card p-0 overflow-hidden">
        {loading && <p className="p-6 text-sm text-gray-500">Carregando...</p>}
        {!loading && items.length === 0 && <p className="p-6 text-sm text-gray-500">Nenhum agendamento nesta data.</p>}
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-4 p-4 border-b border-dark-400">
            <span className="font-bold text-gold w-14 flex-shrink-0">{item.startTime}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.client?.name}</p>
              <p className="text-xs text-gray-500 truncate">{item.service?.name} · {item.barber?.name}</p>
            </div>
            <StatusBadge status={item.status} />
            <button className="btn-secondary text-xs py-1.5 px-2" onClick={() => navigate('/agenda/novo', { state: { appointment: item } })}>
              <Edit size={12} />
            </button>
            <button
              className="btn-primary text-xs py-1.5 px-2"
              disabled={item.status === 'completed'}
              onClick={() => finish(item.id)}
            >
              <Check size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
