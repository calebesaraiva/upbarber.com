import { useEffect, useState } from 'react';
import { ArrowLeftRight, Minus, Plus, Package } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { productsService } from '../../services/products.service';
import { useApp } from '../../context/AppContext';
import { useBranch } from '../../context/BranchContext';
import { Modal } from '../../components/ui/Modal';

export default function Estoque() {
  const { addToast } = useApp();
  const { ready, currentBranch, branches } = useBranch();
  const [products, setProducts] = useState([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferProduct, setTransferProduct] = useState(null);
  const [transferForm, setTransferForm] = useState({ targetBranchId: '', quantity: 1 });
  const load = () => productsService.list().then(res=>setProducts(res.data.data?.data || []));
  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready, currentBranch?.id]);
  const adjust = async (product, delta) => {
    try {
      await productsService.addMovement({ productId:product.id, type:delta>0?'in':'out', quantity:Math.abs(delta), reason:'adjustment', notes:'Ajuste manual' });
      await load();
      addToast('Estoque atualizado', 'success');
    } catch (err) {
      addToast(err.response?.data?.error?.message || 'Falha ao ajustar estoque', 'error');
    }
  };
  const openTransfer = (product) => {
    setTransferProduct(product);
    setTransferForm({ targetBranchId: '', quantity: 1 });
    setTransferOpen(true);
  };

  const transfer = async () => {
    if (!transferProduct || !transferForm.targetBranchId) {
      addToast('Selecione a filial de destino', 'error');
      return;
    }
    try {
      await productsService.transferStock({
        productId: transferProduct.id,
        targetBranchId: transferForm.targetBranchId,
        quantity: Number(transferForm.quantity || 0),
      });
      setTransferOpen(false);
      setTransferProduct(null);
      await load();
      addToast('Transferência realizada', 'success');
    } catch (err) {
      addToast(err.response?.data?.error?.message || 'Falha na transferência', 'error');
    }
  };

  const destinationBranches = branches.filter(branch => branch.id !== currentBranch?.id && branch.isActive);

  return <div>
    <PageHeader title="Controle de Estoque" subtitle="Movimentações persistidas na API" />
    <div className="mb-4 text-xs text-gray-500">Filial ativa: <span className="text-gold font-medium">{currentBranch?.name || 'Todas'}</span></div>
    <div className="card p-0">
      {products.map(p=><div key={p.id} className="flex flex-wrap items-center gap-3 p-4 border-b border-dark-400">
        <Package size={15} className="text-gold"/>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{p.name}</p>
          <p className="text-xs text-gray-500">Mínimo: {p.minStock}</p>
        </div>
        <strong className={p.stock<=p.minStock?'text-red-400':'text-white'}>{p.stock}</strong>
        <button className="btn-secondary" onClick={()=>adjust(p,-1)}><Minus size={13}/></button>
        <button className="btn-primary" onClick={()=>adjust(p,1)}><Plus size={13}/></button>
        {destinationBranches.length > 0 && (
          <button className="btn-secondary" onClick={() => openTransfer(p)}><ArrowLeftRight size={13}/> Transferir</button>
        )}
      </div>)}
    </div>

    <Modal isOpen={transferOpen} onClose={() => setTransferOpen(false)} title="Transferir estoque">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-white font-medium">{transferProduct?.name}</p>
          <p className="text-xs text-gray-500">Saindo da filial atual para outra unidade</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Filial de destino</label>
          <select className="input" value={transferForm.targetBranchId} onChange={e => setTransferForm({ ...transferForm, targetBranchId: e.target.value })}>
            <option value="">Selecione</option>
            {destinationBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Quantidade</label>
          <input className="input" type="number" min="1" value={transferForm.quantity} onChange={e => setTransferForm({ ...transferForm, quantity: e.target.value })} />
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={() => setTransferOpen(false)}>Cancelar</button>
          <button className="btn-primary flex-1 justify-center" onClick={transfer}>Transferir</button>
        </div>
      </div>
    </Modal>
  </div>;
}
