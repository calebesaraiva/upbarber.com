import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { clientsService } from '../../services/clients.service';
import { subscriptionsService } from '../../services/subscriptions.service';

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [existing, setExisting] = useState(null);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ name:'', phone:'', email:'', birthdate:'', planId:'', notes:'' });
  const upd = k => e => setForm({...form,[k]:e.target.value});
  useEffect(() => {
    subscriptionsService.listPlans().then(res=>setPlans(res.data.data || []));
    if (id) clientsService.getById(id).then(res => {
      const value = res.data.data.client;
      setExisting(value);
      setForm({ ...value, birthdate:value.birthdate?.slice(0,10) || '', planId:res.data.data.subscription?.planId || '' });
    });
  }, [id]);

  const submit = async e => {
    e.preventDefault();
    try {
      if (existing) await clientsService.update(id, form); else await clientsService.create(form);
      addToast(existing ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
      navigate('/clientes');
    } catch (err) { addToast(err.response?.data?.error?.message || 'Falha ao salvar cliente', 'error'); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-dark-300 rounded-lg text-gray-400 hover:text-white"><ArrowLeft size={18}/></button>
        <h1 className="page-title">{existing ? 'Editar Cliente' : 'Novo Cliente'}</h1>
      </div>
      <form onSubmit={submit} className="max-w-2xl space-y-4">
        <div className="card space-y-4">
          <h3 className="section-title">Dados Pessoais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-400 mb-1 block">Nome completo</label><input className="input" value={form.name} onChange={upd('name')} placeholder="João da Silva" required /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Telefone / WhatsApp</label><input className="input" value={form.phone} onChange={upd('phone')} placeholder="(11) 99999-9999" /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">E-mail</label><input className="input" type="email" value={form.email} onChange={upd('email')} placeholder="joao@email.com" /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Data de Nascimento</label><input className="input" type="date" value={form.birthdate} onChange={upd('birthdate')} /></div>
          </div>
        </div>
        <div className="card space-y-4">
          <h3 className="section-title">Assinatura</h3>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Plano de Assinatura</label>
            <select className="input" value={form.planId} onChange={upd('planId')}>
              <option value="">Sem plano (cliente comum)</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} — R${p.price}/mês</option>)}
            </select>
          </div>
        </div>
        <div className="card space-y-4">
          <h3 className="section-title">Observações</h3>
          <textarea className="input resize-none" rows={4} value={form.notes} onChange={upd('notes')} placeholder="Preferências, alergias, observações..." />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button type="submit" className="btn-primary flex-1 justify-center"><Save size={15}/> Salvar</button>
        </div>
      </form>
    </div>
  );
}
