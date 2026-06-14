import { useEffect, useState } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, Package } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { productsService } from '../../services/products.service';
import { clientsService } from '../../services/clients.service';
import { useApp } from '../../context/AppContext';
import { useBranch } from '../../context/BranchContext';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PM_LABELS = { pix: 'Pix', cash: 'Dinheiro', credit: 'Cartão de Crédito', debit: 'Cartão de Débito' };

export default function Comandas() {
  const { addToast } = useApp();
  const { ready, currentBranch } = useBranch();
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [finishing, setFinishing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!ready) return;
    Promise.all([productsService.list(), clientsService.list()])
      .then(([p, c]) => {
        setProducts(p.data.data?.data || p.data.data || []);
        setClients(c.data.data?.data || c.data.data || []);
      })
      .catch(() => addToast('Erro ao carregar dados', 'error'));
  }, [addToast, ready, currentBranch?.id]);

  const add = p => setItems(old => {
    const found = old.find(x => x.productId === p.id);
    if (found) {
      // Não ultrapassa o estoque disponível
      if (found.quantity >= p.stock) {
        addToast(`Estoque máximo: ${p.stock} unidades`, 'error');
        return old;
      }
      return old.map(x => x.productId === p.id ? { ...x, quantity: x.quantity + 1 } : x);
    }
    return [...old, { productId: p.id, quantity: 1, name: p.name, price: Number(p.salePrice), maxStock: p.stock }];
  });

  const changeQty = (productId, delta) => setItems(old => old
    .map(x => x.productId === productId ? { ...x, quantity: Math.max(1, Math.min(x.quantity + delta, x.maxStock)) } : x)
    .filter(x => x.quantity > 0)
  );

  const remove = productId => setItems(old => old.filter(x => x.productId !== productId));

  const finish = async () => {
    if (items.length === 0) { addToast('Adicione ao menos um produto', 'error'); return; }
    setFinishing(true);
    try {
      const res = await productsService.createOrder({
        clientId: clientId || null,
        branchId: currentBranch?.id || undefined,
        items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      });
      // Suporta ambas as estruturas de resposta { data: obj } ou { data: { data: obj } }
      const orderId = res.data?.data?.id ?? res.data?.id;
      if (!orderId) throw new Error('ID da comanda não retornado pela API');
      await productsService.closeOrder(orderId, { paymentMethod });
      setItems([]);
      setClientId('');
      setPaymentMethod('pix');
      addToast('Comanda finalizada com sucesso!', 'success');
    } catch (err) {
      addToast(err.response?.data?.error?.message || err.message || 'Falha na comanda', 'error');
    } finally {
      setFinishing(false);
    }
  };

  const total = items.reduce((s, x) => s + x.price * x.quantity, 0);
  const filtered = products.filter(p => p.isActive && p.stock > 0 && p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader title="Comandas" subtitle="Venda de produtos para clientes" />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Catálogo de produtos */}
        <div className="lg:col-span-2 space-y-3">
          <input
            className="input w-full"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {filtered.length === 0 ? (
            <div className="card text-center py-10">
              <Package size={28} className="mx-auto text-gray-600 mb-2" />
              <p className="text-sm text-gray-500">Nenhum produto disponível em estoque.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map(p => (
                <button
                  key={p.id}
                  className="card text-left hover:border-gold/40 transition-colors"
                  onClick={() => add(p)}
                >
                  <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center mb-2">
                    <Package size={14} className="text-gold" />
                  </div>
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  <p className="text-emerald-400 font-semibold text-sm mt-1">{money(p.salePrice)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Estoque: {p.stock}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Carrinho */}
        <div className="space-y-3">
          <div className="card space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart size={15} className="text-gold" />
              <h3 className="section-title">Comanda</h3>
            </div>

            {/* Cliente */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Cliente (opcional)</label>
              <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">Sem vínculo</option>
                {clients.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>

            {/* Itens */}
            {items.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">Nenhum item adicionado.</p>
            ) : (
              <div className="space-y-2">
                {items.map(x => (
                  <div key={x.productId} className="flex items-center gap-2 p-2 bg-dark-300 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{x.name}</p>
                      <p className="text-xs text-gray-500">{money(x.price)} cada</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button className="p-1 text-gray-400 hover:text-white" onClick={() => changeQty(x.productId, -1)}>
                        <Minus size={11} />
                      </button>
                      <span className="text-xs text-white w-5 text-center">{x.quantity}</span>
                      <button className="p-1 text-gray-400 hover:text-white" onClick={() => changeQty(x.productId, 1)}>
                        <Plus size={11} />
                      </button>
                      <button className="p-1 text-red-400 hover:text-red-300 ml-1" onClick={() => remove(x.productId)}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagamento */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Forma de pagamento</label>
              <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                {Object.entries(PM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-dark-400">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-400">Total</span>
                <span className="text-xl font-black text-gold">{money(total)}</span>
              </div>
              <button
                className="btn-primary w-full justify-center py-3"
                onClick={finish}
                disabled={finishing || items.length === 0}
              >
                <ShoppingCart size={15} />
                {finishing ? 'Finalizando...' : 'Finalizar Comanda'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
