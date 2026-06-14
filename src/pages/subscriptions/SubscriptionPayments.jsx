import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { subscriptionsService } from '../../services/subscriptions.service';

export default function SubscriptionPayments(){const[items,setItems]=useState([]);useEffect(()=>{subscriptionsService.listPayments({limit:100}).then(r=>setItems(r.data.data?.data||[]));},[]);return <div><PageHeader title="Pagamentos de Assinatura" subtitle="Registros do banco de dados"/><div className="card p-0">{items.map(x=><div key={x.id} className="flex p-4 border-b border-dark-400"><div className="flex-1"><p className="text-white">{x.client?.name||x.subscription?.client?.name||'Cliente'}</p><p className="text-xs text-gray-500">{x.paymentMethod} · {x.paidAt?new Date(x.paidAt).toLocaleDateString('pt-BR'):'Pendente'}</p></div><strong className="text-gold">R${x.amount}</strong><StatusBadge status={x.status}/></div>)}</div></div>}
