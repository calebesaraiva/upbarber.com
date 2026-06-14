import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { clientsService } from '../../services/clients.service';
import { barbersService } from '../../services/barbers.service';
import { servicesService } from '../../services/services.service';
import { appointmentsService } from '../../services/appointments.service';
import { useApp } from '../../context/AppContext';
import { localDateInputValue } from '../../utils/date';
import { useBranch } from '../../context/BranchContext';

const today = localDateInputValue();

export default function NovoAgendamento() {
  const navigate = useNavigate();
  const editing = useLocation().state?.appointment;
  const { addToast } = useApp();
  const { branches, currentBranch } = useBranch();
  const [clients, setClients] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({
    clientId: editing?.clientId || '',
    barberId: editing?.barberId || '',
    serviceId: editing?.serviceId || '',
    branchId: editing?.branchId || currentBranch?.id || '',
    date: editing?.date?.slice?.(0, 10) || today,
    startTime: editing?.startTime || '',
    notes: editing?.notes || '',
    paymentMethod: editing?.paymentMethod || 'pix',
  });
  const upd = key => event => setForm({ ...form, [key]: event.target.value });

  useEffect(() => {
    Promise.all([clientsService.list(), barbersService.list(), servicesService.list()]).then(([c, b, s]) => {
      setClients(c.data.data?.data || c.data.data || []);
      setBarbers(b.data.data?.data || b.data.data || []);
      setServices(s.data.data?.data || s.data.data || []);
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      if (!form.barberId || !form.serviceId || !form.date) {
        setSlots([]);
        return;
      }
      appointmentsService.getAvailability({ barberId: form.barberId, serviceId: form.serviceId, date: form.date, branchId: form.branchId || undefined })
        .then(res => setSlots(res.data.data.availableSlots || []))
        .catch(() => setSlots([]));
    });
  }, [form.barberId, form.serviceId, form.date, form.branchId]);

  useEffect(() => {
    queueMicrotask(() => {
      if (currentBranch?.id && !form.branchId) {
        setForm(prev => ({ ...prev, branchId: currentBranch.id }));
      }
    });
  }, [currentBranch?.id, form.branchId]);

  const submit = async event => {
    event.preventDefault();
    try {
      const payload = { ...form, branchId: form.branchId || currentBranch?.id || undefined };
      if (editing) await appointmentsService.update(editing.id, payload);
      else await appointmentsService.create(payload);
      addToast(editing ? 'Agendamento atualizado!' : 'Agendamento criado!', 'success');
      navigate('/agenda');
    } catch (err) {
      addToast(err.response?.data?.error?.message || 'Falha ao salvar agendamento', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400"><ArrowLeft size={18}/></button>
        <div><h1 className="page-title">{editing ? 'Editar Agendamento' : 'Novo Agendamento'}</h1><p className="text-sm text-gray-500">{editing ? 'Altere os dados e salve' : 'Preencha os dados do agendamento'}</p></div>
      </div>
      <form onSubmit={submit} className="max-w-3xl space-y-4">
        <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-xs text-gray-400 md:col-span-2">Filial
            <select className="input mt-1" value={form.branchId} onChange={upd('branchId')} required>
              <option value="">Selecione</option>
              {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}{branch.isMain ? ' · Matriz' : ''}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-400">Cliente<select className="input mt-1" value={form.clientId} onChange={upd('clientId')} required><option value="">Selecione</option>{clients.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="text-xs text-gray-400">Serviço<select className="input mt-1" value={form.serviceId} onChange={upd('serviceId')} required><option value="">Selecione</option>{services.filter(x=>x.isActive).map(x=><option key={x.id} value={x.id}>{x.name} · R${x.price}</option>)}</select></label>
          <label className="text-xs text-gray-400">Barbeiro<select className="input mt-1" value={form.barberId} onChange={upd('barberId')} required><option value="">Selecione</option>{barbers.filter(x=>x.isActive).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="text-xs text-gray-400">Data<input className="input mt-1" type="date" value={form.date} onChange={upd('date')} required /></label>
          <label className="text-xs text-gray-400">Horário<select className="input mt-1" value={form.startTime} onChange={upd('startTime')} required><option value="">Selecione</option>{(editing?.startTime ? [editing.startTime, ...slots.filter(x=>x!==editing.startTime)] : slots).map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="text-xs text-gray-400">Pagamento<select className="input mt-1" value={form.paymentMethod} onChange={upd('paymentMethod')}><option value="pix">Pix</option><option value="cash">Dinheiro</option><option value="credit">Crédito</option><option value="debit">Débito</option><option value="subscription">Assinatura</option></select></label>
          <label className="text-xs text-gray-400 md:col-span-2">Observações<textarea className="input mt-1" rows={3} value={form.notes} onChange={upd('notes')} /></label>
        </div>
        <div className="flex gap-3"><button type="button" onClick={()=>navigate(-1)} className="btn-secondary flex-1 justify-center">Cancelar</button><button className="btn-primary flex-1 justify-center"><Check size={16}/> Salvar</button></div>
      </form>
    </div>
  );
}
