import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { productsService } from '../../services/products.service';
import { clientsService } from '../../services/clients.service';
import { useApp } from '../../context/AppContext';

export default function Comandas(){
 const {addToast}=useApp(); const [products,setProducts]=useState([]);const[clients,setClients]=useState([]);const[clientId,setClientId]=useState('');const[items,setItems]=useState([]);
 useEffect(()=>{Promise.all([productsService.list(),clientsService.list()]).then(([p,c])=>{setProducts(p.data.data?.data||[]);setClients(c.data.data?.data||[]);});},[]);
 const add=p=>setItems(old=>{const found=old.find(x=>x.productId===p.id);return found?old.map(x=>x.productId===p.id?{...x,quantity:x.quantity+1}:x):[...old,{productId:p.id,quantity:1,name:p.name,price:Number(p.salePrice)}]});
 const finish=async()=>{try{const order=await productsService.createOrder({clientId:clientId||null,items:items.map(({productId,quantity})=>({productId,quantity}))});await productsService.closeOrder(order.data.data.id,{paymentMethod:'pix'});setItems([]);addToast('Comanda finalizada','success');}catch(err){addToast(err.response?.data?.error?.message||'Falha na comanda','error');}};
 const total=items.reduce((s,x)=>s+x.price*x.quantity,0);
 return <div><PageHeader title="Comandas" subtitle="Venda persistida na API"/><select className="input mb-4" value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Cliente opcional</option>{clients.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><div className="grid lg:grid-cols-3 gap-4"><div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">{products.filter(x=>x.isActive&&x.stock>0).map(x=><button className="card text-left" key={x.id} onClick={()=>add(x)}><p className="text-white">{x.name}</p><p className="text-emerald-400">R${x.salePrice}</p><p className="text-xs text-gray-500">Estoque {x.stock}</p></button>)}</div><div className="card"><h3 className="section-title mb-3">Itens</h3>{items.map(x=><p key={x.productId} className="text-sm text-white py-2">{x.quantity}x {x.name}</p>)}<p className="text-xl text-gold font-bold mt-4">R${total.toFixed(2)}</p><button className="btn-primary w-full justify-center mt-4" onClick={finish}>Finalizar</button></div></div></div>;
}
