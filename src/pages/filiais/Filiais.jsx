import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Loader2, MapPin, Phone, Plus, RefreshCw, Save, ShieldCheck, Store, ToggleLeft, ToggleRight, Pencil, ArrowRightLeft } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { useBranch } from '../../context/BranchContext';
import { branchesService } from '../../services/branches.service';

const emptyForm = {
  name: '',
  address: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  isActive: true,
};

export default function Filiais() {
  const { addToast } = useApp();
  const { branches: cachedBranches, currentBranch, changeBranch, reloadBranches } = useBranch();
  const [items, setItems] = useState(cachedBranches || []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await branchesService.list();
      const data = res.data.data || res.data || [];
      setItems(data);
    } catch (err) {
      addToast(err.response?.data?.error?.message || 'Falha ao carregar filiais', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(item => item.isActive).length,
    main: items.find(item => item.isMain) || currentBranch || null,
  }), [items, currentBranch]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    setForm({
      name: branch.name || '',
      address: branch.address || '',
      neighborhood: branch.neighborhood || '',
      city: branch.city || '',
      state: branch.state || '',
      zipCode: branch.zipCode || '',
      phone: branch.phone || '',
      isActive: Boolean(branch.isActive),
    });
    setOpen(true);
  };

  const setField = (field) => (event) => setForm(prev => ({ ...prev, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        phone: form.phone || null,
        neighborhood: form.neighborhood || null,
        zipCode: form.zipCode || null,
      };

      if (editing) {
        await branchesService.update(editing.id, payload);
        addToast('Filial atualizada com sucesso!', 'success');
      } else {
        const res = await branchesService.create(payload);
        addToast('Filial criada com sucesso!', 'success');
        if (!currentBranch) {
          changeBranch(res.data.data || res.data);
        }
      }

      setOpen(false);
      setEditing(null);
      await Promise.all([load(), reloadBranches().catch(() => {})]);
    } catch (err) {
      addToast(err.response?.data?.error?.message || 'Falha ao salvar filial', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (branch) => {
    try {
      await branchesService.toggle(branch.id);
      addToast(branch.isActive ? 'Filial inativada.' : 'Filial ativada.', 'success');
      await Promise.all([load(), reloadBranches().catch(() => {})]);
    } catch (err) {
      addToast(err.response?.data?.error?.message || 'Falha ao alterar status', 'error');
    }
  };

  const handleMain = async (branch) => {
    try {
      await branchesService.setMain(branch.id);
      addToast(`${branch.name} agora é a matriz.`, 'success');
      changeBranch(branch);
      await Promise.all([load(), reloadBranches().catch(() => {})]);
      window.location.reload();
    } catch (err) {
      addToast(err.response?.data?.error?.message || 'Falha ao definir matriz', 'error');
    }
  };

  const handleUseBranch = (branch) => {
    changeBranch(branch);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Filiais"
        subtitle="Gerencie todas as unidades do grupo e mantenha atendimento, financeiro, estoque e agenda sempre vinculados à filial correta."
        actions={[
          <button key="refresh" onClick={load} className="btn-secondary">
            <RefreshCw size={15} />
            Atualizar
          </button>,
          <button key="create" onClick={openCreate} className="btn-primary">
            <Plus size={15} />
            Nova filial
          </button>,
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold/15 flex items-center justify-center text-gold">
            <Store size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Total de filiais</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Filiais ativas</p>
            <p className="text-2xl font-bold text-white">{stats.active}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
            <Building2 size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Matriz atual</p>
            <p className="text-lg font-semibold text-white truncate">{stats.main?.name || 'Nenhuma definida'}</p>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="section-title">Unidades cadastradas</h3>
            <p className="text-sm text-gray-500 mt-1">Cada filial concentra seus próprios profissionais, agenda, caixa, estoque e relatórios.</p>
          </div>
          {loading && <Loader2 size={18} className="animate-spin text-gray-500" />}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {items.map((branch) => {
            const active = branch.id === currentBranch?.id;
            return (
              <div key={branch.id} className={`rounded-2xl border p-5 transition-all ${active ? 'border-gold bg-gold/5' : 'border-dark-400 bg-dark-300'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-white truncate">{branch.name}</h4>
                      {branch.isMain && <span className="badge badge-gold">Matriz</span>}
                      {branch.isActive ? <span className="badge badge-green">Ativa</span> : <span className="badge badge-gray">Inativa</span>}
                      {active && <span className="badge badge-blue">Filial em uso</span>}
                    </div>
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                      <MapPin size={14} className="text-gold" />
                      <span>{branch.address}</span>
                      <span>{branch.city}/{branch.state}</span>
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-dark-200 border border-dark-400 flex items-center justify-center text-gold flex-shrink-0">
                    <Building2 size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="rounded-xl bg-dark-200 border border-dark-400 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Barbeiros</p>
                    <p className="text-lg font-semibold text-white">{branch.barberCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-dark-200 border border-dark-400 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Clientes</p>
                    <p className="text-lg font-semibold text-white">{branch.clientCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-dark-200 border border-dark-400 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Receita</p>
                    <p className="text-lg font-semibold text-gold">R$ {Number(branch.monthRevenue || 0).toFixed(2)}</p>
                  </div>
                </div>

                {branch.phone && (
                  <p className="mt-4 text-sm text-gray-400 flex items-center gap-2">
                    <Phone size={14} className="text-gray-500" />
                    {branch.phone}
                  </p>
                )}

                {branch.neighborhood && (
                  <p className="mt-2 text-sm text-gray-500">{branch.neighborhood}</p>
                )}

                <div className="flex flex-wrap gap-2 mt-5">
                  <button onClick={() => handleUseBranch(branch)} className="btn-primary">
                    <ArrowRightLeft size={15} />
                    Usar filial
                  </button>
                  <button onClick={() => openEdit(branch)} className="btn-secondary">
                    <Pencil size={15} />
                    Editar
                  </button>
                  <button onClick={() => handleToggle(branch)} className="btn-secondary">
                    {branch.isActive ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
                    {branch.isActive ? 'Inativar' : 'Ativar'}
                  </button>
                  {!branch.isMain && (
                    <button onClick={() => handleMain(branch)} className="btn-secondary">
                      <CheckCircle2 size={15} />
                      Definir matriz
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-dark-400 p-10 text-center">
            <p className="text-white font-medium">Nenhuma filial cadastrada ainda.</p>
            <p className="text-sm text-gray-500 mt-1">Crie a primeira unidade para liberar a operação multi-filial.</p>
            <button onClick={openCreate} className="btn-primary mx-auto mt-4">
              <Plus size={15} />
              Criar primeira filial
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar filial' : 'Nova filial'}
        size="lg"
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Nome da filial</label>
              <input className="input" value={form.name} onChange={setField('name')} placeholder="Ex: Unidade Centro" required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Endereço</label>
              <input className="input" value={form.address} onChange={setField('address')} placeholder="Rua, número, bairro" required />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Bairro</label>
              <input className="input" value={form.neighborhood} onChange={setField('neighborhood')} placeholder="Centro" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Telefone</label>
              <input className="input" value={form.phone} onChange={setField('phone')} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Cidade</label>
              <input className="input" value={form.city} onChange={setField('city')} placeholder="Cidade" required />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Estado</label>
              <input className="input" value={form.state} onChange={setField('state')} placeholder="UF" required />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">CEP</label>
              <input className="input" value={form.zipCode} onChange={setField('zipCode')} placeholder="00000-000" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                id="branch-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 accent-gold"
              />
              <label htmlFor="branch-active" className="text-sm text-gray-300">Filial ativa</label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-70">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Salvando...' : 'Salvar filial'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
