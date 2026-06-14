import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { barbersService } from '../../services/barbers.service';
import { servicesService } from '../../services/services.service';

export default function BarberForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [existing, setExisting] = useState(null);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name:'', phone:'', email:'', specialty:'', commissionPercent:40, serviceIds:[], isActive:true });
  const upd = k => e => setForm({...form,[k]:e.target.value});
  useEffect(() => {
    servicesService.list().then(res => setServices(res.data.data?.data || res.data.data || []));
    if (id) barbersService.getById(id).then(res => {
      const value = res.data.data;
      setExisting(value);
      setForm({ ...value, serviceIds:(value.services || []).map(x=>x.serviceId) });
    });
  }, [id]);

  const toggleService = sid => {
    const svcs = form.serviceIds.includes(sid) ? form.serviceIds.filter(s=>s!==sid) : [...form.serviceIds, sid];
    setForm({...form, serviceIds: svcs});
  };

  const submit = async e => {
    e.preventDefault();
    try {
      const payload = { ...form, commissionPercent:Number(form.commissionPercent), email:form.email || null, phone:form.phone || null };
      if (existing) await barbersService.update(id, payload); else await barbersService.create(payload);
      addToast(existing ? 'Barbeiro atualizado!' : 'Barbeiro cadastrado!', 'success');
      navigate('/barbeiros');
    } catch (err) { addToast(err.response?.data?.error?.message || 'Falha ao salvar barbeiro', 'error'); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-dark-300 rounded-lg text-gray-400 hover:text-white"><ArrowLeft size={18}/></button>
        <h1 className="page-title">{existing ? 'Editar Barbeiro' : 'Novo Barbeiro'}</h1>
      </div>
      <form onSubmit={submit} className="max-w-2xl space-y-4">
        <div className="card space-y-4">
          <h3 className="section-title">Dados do Barbeiro</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-400 mb-1 block">Nome</label><input className="input" value={form.name} onChange={upd('name')} required /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Telefone</label><input className="input" value={form.phone} onChange={upd('phone')} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">E-mail</label><input className="input" type="email" value={form.email} onChange={upd('email')} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Especialidade</label><input className="input" value={form.specialty} onChange={upd('specialty')} /></div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Comissão (%)</label>
              <input className="input" type="number" min={0} max={100} value={form.commissionPercent} onChange={upd('commissionPercent')} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select className="input" value={String(form.isActive)} onChange={e=>setForm({...form,isActive:e.target.value==='true'})}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>
        </div>
        <div className="card space-y-3">
          <h3 className="section-title">Serviços que Realiza</h3>
          <div className="grid grid-cols-2 gap-2">
            {services.map(s => (
              <label key={s.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${form.serviceIds.includes(s.id)?'border-gold bg-gold/10':'border-dark-500 hover:border-dark-400'}`}>
                <input type="checkbox" checked={form.serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} className="accent-gold" />
                <div>
                  <p className="text-sm text-white">{s.name}</p>
                  <p className="text-xs text-gray-500">R${s.price}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button type="submit" className="btn-primary flex-1 justify-center"><Save size={15}/> Salvar</button>
        </div>
      </form>
    </div>
  );
}
