import { useEffect, useState } from 'react';
import { Minus, Plus, Package } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { productsService } from '../../services/products.service';
import { useApp } from '../../context/AppContext';

export default function Estoque() {
  const { addToast } = useApp();
  const [products, setProducts] = useState([]);
  const load = () => productsService.list().then(res=>setProducts(res.data.data?.data || []));
  useEffect(load, []);
  const adjust = async (product, delta) => {
    try {
      await productsService.addMovement({ productId:product.id, type:delta>0?'in':'out', quantity:Math.abs(delta), reason:'adjustment', notes:'Ajuste manual' });
      await load();
      addToast('Estoque atualizado', 'success');
    } catch (err) {
      addToast(err.response?.data?.error?.message || 'Falha ao ajustar estoque', 'error');
    }
  };
  return <div><PageHeader title="Controle de Estoque" subtitle="Movimentações persistidas na API" /><div className="card p-0">{products.map(p=><div key={p.id} className="flex items-center gap-3 p-4 border-b border-dark-400"><Package size={15} className="text-gold"/><div className="flex-1"><p className="text-sm text-white">{p.name}</p><p className="text-xs text-gray-500">Mínimo: {p.minStock}</p></div><strong className={p.stock<=p.minStock?'text-red-400':'text-white'}>{p.stock}</strong><button className="btn-secondary" onClick={()=>adjust(p,-1)}><Minus size={13}/></button><button className="btn-primary" onClick={()=>adjust(p,1)}><Plus size={13}/></button></div>)}</div></div>;
}
