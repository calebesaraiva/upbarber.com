import { useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Check, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { appointmentsService } from '../../services/appointments.service';
import { barbersService } from '../../services/barbers.service';
import { useApp } from '../../context/AppContext';

export default function Agenda() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [barberId, setBarberId] = useState('');
  const load = async () => {
    const [a, b] = await Promise.all([appointmentsService.list({ date, barberId: barberId || undefined, limit: 100 }), barbersService.list()]);
    setItems(a.data.data?.data || []);
    setBarbers(b.data.data?.data || b.data.data || []);
  };
  useEffect(() => { load(); }, [date, barberId]);
  const move = days => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+days); setDate(d.toISOString().slice(0,10)); };
  const finish = async id => { await appointmentsService.updateStatus(id, 'completed'); addToast('Atendimento finalizado', 'success'); load(); };

  return (
    <div>
      <PageHeader title="Agenda" subtitle={new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR')} actions={<button className="btn-primary" onClick={()=>navigate('/agenda/novo')}><Plus size={14}/> Novo Agendamento</button>} />
      <div className="flex gap-3 mb-4">
        <button className="btn-secondary" onClick={()=>move(-1)}><ChevronLeft size={15}/></button>
        <input className="input w-auto" type="date" value={date} onChange={e=>setDate(e.target.value)} />
        <button className="btn-secondary" onClick={()=>move(1)}><ChevronRight size={15}/></button>
        <select className="input w-auto" value={barberId} onChange={e=>setBarberId(e.target.value)}><option value="">Todos barbeiros</option>{barbers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </div>
      <div className="card p-0 overflow-hidden">
        {items.length === 0 && <p className="p-6 text-sm text-gray-500">Nenhum agendamento nesta data.</p>}
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-4 p-4 border-b border-dark-400">
            <span className="font-bold text-gold">{item.startTime}</span>
            <div className="flex-1"><p className="text-sm text-white">{item.client?.name}</p><p className="text-xs text-gray-500">{item.service?.name} · {item.barber?.name}</p></div>
            <StatusBadge status={item.status}/>
            <button className="btn-secondary text-xs" onClick={()=>navigate('/agenda/novo',{state:{appointment:item}})}><Edit size={12}/></button>
            <button className="btn-primary text-xs" disabled={item.status==='completed'} onClick={()=>finish(item.id)}><Check size={12}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}
