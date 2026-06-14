import { useEffect, useState } from 'react';
import { Plus, Search, Package, AlertTriangle, Edit } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { productsService } from '../../services/products.service';

const CATS = ['Todos','Cabelo','Barba','Ferramentas','Bebidas','Alimentacao','Outro'];

export default function Products() {
  const { addToast } = useApp();
  const [prods, setProds] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name:'', category:'Cabelo', salePrice:'', costPrice:'', stock:'', minStock:'', code:'' });
  const upd = k => e => setForm({...form,[k]:e.target.value});
  const load = () => productsService.list().then(res => setProds(res.data.data?.data || res.data.data || []));
  useEffect(load, []);

  const emptyForm = { name:'', category:'Cabelo', salePrice:'', costPrice:'', stock:'', minStock:'', code:'' };
  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = product => {
    setEditing(product);
    setForm({
      name: product.name || '',
      category: product.category || 'Cabelo',
      salePrice: String(product.salePrice ?? ''),
      costPrice: String(product.costPrice ?? ''),
      stock: String(product.stock ?? ''),
      minStock: String(product.minStock ?? ''),
      code: product.code || product.internalCode || ''
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };
  const save = async () => {
    if (!form.name.trim() || Number(form.salePrice) <= 0) {
      addToast('Informe nome e preço de venda.','error');
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      salePrice: Number(form.salePrice || 0),
      costPrice: Number(form.costPrice || 0),
      stock: Number(form.stock || 0),
      minStock: Number(form.minStock || 0),
      internalCode: form.code.trim() || null,
      isActive: true
    };
    try {
      if (editing) await productsService.update(editing.id, payload);
      else await productsService.create(payload);
      await load();
      addToast(editing ? 'Produto atualizado!' : 'Produto cadastrado!','success');
      closeModal();
    } catch (err) {
      addToast(err.response?.data?.error?.message || 'Falha ao salvar produto', 'error');
    }
  };

  const filtered = prods.filter(p => {
    if (!p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cat !== 'Todos' && p.category !== cat) return false;
    return true;
  });

  const lowStock = prods.filter(p => p.stock <= p.minStock || p.stock === 0);

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle={`${prods.length} produtos cadastrados`}
        actions={<button className="btn-primary" onClick={openNew}><Plus size={15}/> Novo Produto</button>}
      />

      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-5">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="text-sm font-semibold text-red-400">Estoque baixo ou zerado</p>
            <p className="text-xs text-gray-400 mt-0.5">{lowStock.map(p=>p.name).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
          <input className="input pl-9 w-full" value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar produto..." />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATS.map(c => (
            <button key={c} onClick={()=>setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${cat===c?'bg-gold text-dark':'bg-dark-300 text-gray-400 hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-dark-400">
              <tr>
                <th className="table-header text-left">Produto</th>
                <th className="table-header text-left hidden sm:table-cell">Categoria</th>
                <th className="table-header text-right">Preço Venda</th>
                <th className="table-header text-right hidden md:table-cell">Custo</th>
                <th className="table-header text-center">Estoque</th>
                <th className="table-header text-left hidden lg:table-cell">Status</th>
                <th className="table-header"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-400/50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-dark-300/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-dark-300 rounded-lg"><Package size={14} className="text-gray-500"/></div>
                      <div>
                        <p className="font-medium text-white text-sm">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.internalCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell text-gray-400">{p.category}</td>
                  <td className="table-cell text-right font-semibold text-emerald-400">R${p.salePrice}</td>
                  <td className="table-cell text-right hidden md:table-cell text-gray-500">R${p.costPrice}</td>
                  <td className="table-cell text-center">
                    <span className={`font-bold text-sm ${p.stock===0?'text-red-400':p.stock<=p.minStock?'text-yellow-400':'text-white'}`}>{p.stock}</span>
                    <span className="text-xs text-gray-600">/{p.minStock}</span>
                    {p.stock <= p.minStock && <AlertTriangle size={11} className="inline ml-1 text-yellow-400"/>}
                  </td>
                  <td className="table-cell hidden lg:table-cell"><StatusBadge status={p.isActive ? 'active' : 'inactive'}/></td>
                  <td className="table-cell">
                    <button onClick={() => openEdit(p)} className="text-xs text-gold hover:text-gold-light transition-colors"><Edit size={13}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Editar Produto' : 'Novo Produto'}>
        <div className="space-y-4">
          <div><label className="text-xs text-gray-400 mb-1 block">Nome</label><input className="input" value={form.name} onChange={upd('name')} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-400 mb-1 block">Categoria</label>
              <select className="input" value={form.category} onChange={upd('category')}>
                {['Cabelo','Barba','Ferramentas','Bebidas','Alimentacao','Outro'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-gray-400 mb-1 block">Código</label><input className="input" value={form.code} onChange={upd('code')} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Preço Venda</label><input className="input" type="number" value={form.salePrice} onChange={upd('salePrice')} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Preço Custo</label><input className="input" type="number" value={form.costPrice} onChange={upd('costPrice')} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Estoque Inicial</label><input className="input" type="number" value={form.stock} onChange={upd('stock')} /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Estoque Mínimo</label><input className="input" type="number" value={form.minStock} onChange={upd('minStock')} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={closeModal}>Cancelar</button>
            <button className="btn-primary flex-1 justify-center" onClick={save}>Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
