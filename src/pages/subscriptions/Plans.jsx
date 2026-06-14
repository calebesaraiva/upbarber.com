import { useEffect, useState } from 'react';
import { Plus, Crown, Users, Edit, Check } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useApp } from '../../context/AppContext';
import { subscriptionsService } from '../../services/subscriptions.service';
import { servicesService } from '../../services/services.service';

export default function Plans() {
  const { addToast } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [planList, setPlanList] = useState([]);
  const [services, setServices] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState({ name:'', price:'', description:'', limit:'', services:[] });
  const upd = k => e => setForm({...form,[k]:e.target.value});
  const toggleSvc = id => setForm({...form, services: form.services.includes(id)?form.services.filter(s=>s!==id):[...form.services,id]});

  const emptyForm = { name:'', price:'', description:'', limit:'', services:[] };
  const load = async () => {
    const [plansRes, servicesRes] = await Promise.all([subscriptionsService.listPlans(), servicesService.list()]);
    setPlanList(plansRes.data.data || []);
    setServices(servicesRes.data.data?.data || servicesRes.data.data || []);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = plan => {
    setEditingPlan(plan);
    setForm({
      name: plan.name || '',
      price: String(plan.price ?? ''),
      description: plan.description || '',
      limit: plan.limit ? String(plan.limit) : '',
      services: (plan.planServices || []).map(item => item.serviceId)
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPlan(null);
    setForm(emptyForm);
  };

  const savePlan = async () => {
    const payload = {
      name: form.name.trim(),
      price: Number(form.price || 0),
      description: form.description.trim(),
      usageLimit: form.limit ? Number(form.limit) : null,
      serviceIds: form.services,
      billingCycle: editingPlan?.billingCycle || 'monthly',
      isActive: true
    };

    if (!payload.name || payload.price <= 0) {
      addToast('Informe nome e preço do plano.','error');
      return;
    }

    try {
      if (editingPlan) await subscriptionsService.updatePlan(editingPlan.id, payload);
      else await subscriptionsService.createPlan(payload);
      await load();
      addToast(editingPlan ? 'Plano atualizado!' : 'Plano criado!','success');
      closeModal();
    } catch (err) {
      addToast(err.response?.data?.error?.message || 'Falha ao salvar plano', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Planos de Assinatura"
        subtitle="Configure e gerencie os planos mensais"
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={15}/> Novo Plano</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {planList.map(p => (
          <div key={p.id} className="card relative overflow-hidden hover:border-dark-500 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gold" />
            <div className="pt-2">
              <Crown size={20} className="mb-3 text-gold" />
              <h3 className="text-lg font-bold text-white mb-0.5">{p.name}</h3>
              <p className="text-2xl font-bold mt-2 text-gold">R${p.price}<span className="text-sm text-gray-500 font-normal">/mês</span></p>
              <p className="text-xs text-gray-400 mt-1 mb-4">{p.description}</p>
              <div className="space-y-1.5 mb-4">
                {(p.planServices || []).map(item => {
                  const svc = item.service || services.find(s=>s.id===item.serviceId);
                  return svc ? (
                    <div key={item.serviceId} className="flex items-center gap-2 text-xs text-gray-400">
                      <Check size={11} className="text-emerald-400 flex-shrink-0"/>
                      {svc.name}
                    </div>
                  ) : null;
                })}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Check size={11} className="text-emerald-400 flex-shrink-0"/>
                  {p.usageLimit ? `Até ${p.usageLimit}x/mês` : 'Ilimitado'}
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-dark-300 rounded-xl mb-4">
                <Users size={14} className="text-gray-500"/>
                <span className="text-sm font-semibold text-white">{p._count?.subscriptions || 0}</span>
                <span className="text-xs text-gray-500">assinantes</span>
              </div>
              <StatusBadge status={p.isActive ? 'active' : 'inactive'} />
            </div>
            <button className="btn-secondary w-full justify-center mt-3 text-xs" onClick={() => openEdit(p)}><Edit size={12}/> Editar</button>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={editingPlan ? 'Editar Plano de Assinatura' : 'Novo Plano de Assinatura'}>
        <div className="space-y-4">
          <div><label className="text-xs text-gray-400 mb-1 block">Nome do Plano</label><input className="input" value={form.name} onChange={upd('name')} placeholder="Ex: Plano Gold" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-400 mb-1 block">Preço (R$/mês)</label><input className="input" type="number" value={form.price} onChange={upd('price')} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Limite (vazio = ilimitado)</label><input className="input" type="number" value={form.limit} onChange={upd('limit')} placeholder="Ex: 4" /></div>
          </div>
          <div><label className="text-xs text-gray-400 mb-1 block">Descrição</label><input className="input" value={form.description} onChange={upd('description')} /></div>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Serviços Incluídos</label>
            <div className="grid grid-cols-2 gap-2">
              {services.map(s => (
                <label key={s.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${form.services.includes(s.id)?'border-gold bg-gold/10 text-white':'border-dark-500 text-gray-400 hover:border-dark-400'}`}>
                  <input type="checkbox" checked={form.services.includes(s.id)} onChange={() => toggleSvc(s.id)} className="accent-gold" />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={closeModal}>Cancelar</button>
            <button className="btn-primary flex-1 justify-center" onClick={savePlan}>{editingPlan ? 'Salvar Alterações' : 'Criar Plano'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
