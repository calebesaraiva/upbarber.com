import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { servicesService } from '../../services/services.service';

const CATS = ['Todos', 'Corte', 'Barba', 'Combo', 'Estética', 'Coloração', 'Tratamento'];
const EMPTY = { name:'', price:'', durationMinutes:'', commissionPercent:40, category:'Corte', isActive:true, description:'' };

export default function Services() {
  const { addToast } = useApp();
  const [svcs, setSvcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicesService.list({ limit: 200 });
      const data = res.data?.data ?? res.data;
      setSvcs(data?.rows ?? data ?? []);
    } catch {
      addToast('Erro ao carregar serviços', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = svcs.filter(s => cat === 'Todos' || s.category === cat);
  const upd = k => e => setForm({...form,[k]:e.target.value});

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...s, durationMinutes: s.durationMinutes ?? s.duration ?? '', commissionPercent: s.commissionPercent ?? s.commission ?? 40 }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        durationMinutes: Number(form.durationMinutes),
        commissionPercent: Number(form.commissionPercent),
        category: form.category,
        isActive: form.isActive,
        description: form.description,
      };
      if (editing) {
        await servicesService.update(editing.id, payload);
        addToast('Serviço atualizado!', 'success');
      } else {
        await servicesService.create(payload);
        addToast('Serviço criado!', 'success');
      }
      setShowModal(false);
      await load();
    } catch (e) {
      addToast(e.response?.data?.error?.message || 'Erro ao salvar serviço', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Remover serviço "${s.name}"?`)) return;
    try {
      await servicesService.delete(s.id);
      addToast('Serviço removido', 'info');
      await load();
    } catch (e) {
      addToast(e.response?.data?.error?.message || 'Erro ao remover serviço', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Serviços"
        subtitle={loading ? 'Carregando...' : `${svcs.length} serviços cadastrados`}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={load}><RefreshCw size={15}/></button>
            <button className="btn-primary" onClick={openNew}><Plus size={15}/> Novo Serviço</button>
          </div>
        }
      />

      <div className="flex gap-1 mb-4 flex-wrap">
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${cat===c?'bg-gold text-dark':'bg-dark-300 text-gray-400 hover:text-white'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.id} className="card hover:border-dark-500 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">{s.name}</h3>
                <span className="badge-blue text-[10px] mt-1">{s.category}</span>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-xs text-gray-500 mb-4">{s.description}</p>
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="bg-dark-300 rounded-lg p-2">
                <p className="text-sm font-bold text-emerald-400">R${Number(s.price).toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-gray-500">Preço</p>
              </div>
              <div className="bg-dark-300 rounded-lg p-2">
                <p className="text-sm font-bold text-blue-400">{s.durationMinutes ?? s.duration}min</p>
                <p className="text-[10px] text-gray-500">Duração</p>
              </div>
              <div className="bg-dark-300 rounded-lg p-2">
                <p className="text-sm font-bold text-gold">{s.commissionPercent ?? s.commission}%</p>
                <p className="text-[10px] text-gray-500">Comissão</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(s)} className="btn-secondary flex-1 justify-center text-xs py-2"><Edit size={12}/> Editar</button>
              <button onClick={() => remove(s)} className="btn-danger text-xs py-2 px-3"><Trash2 size={12}/></button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Serviço' : 'Novo Serviço'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="text-xs text-gray-400 mb-1 block">Nome</label><input className="input" value={form.name} onChange={upd('name')} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Preço (R$)</label><input className="input" type="number" value={form.price} onChange={upd('price')} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Duração (min)</label><input className="input" type="number" value={form.durationMinutes} onChange={upd('durationMinutes')} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Comissão (%)</label><input className="input" type="number" value={form.commissionPercent} onChange={upd('commissionPercent')} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Categoria</label>
              <select className="input" value={form.category} onChange={upd('category')}>
                {['Corte','Barba','Combo','Estética','Coloração','Tratamento'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select className="input" value={form.isActive} onChange={e => setForm({...form, isActive: e.target.value === 'true'})}>
                <option value="true">Ativo</option><option value="false">Inativo</option>
              </select>
            </div>
            <div className="col-span-2"><label className="text-xs text-gray-400 mb-1 block">Descrição</label><input className="input" value={form.description} onChange={upd('description')} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn-primary flex-1 justify-center" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
