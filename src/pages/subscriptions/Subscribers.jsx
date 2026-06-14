import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { subscriptionsService } from '../../services/subscriptions.service';

export default function Subscribers(){const[items,setItems]=useState([]);useEffect(()=>{subscriptionsService.list({limit:100}).then(r=>setItems(r.data.data?.data||[]));},[]);return <div><PageHeader title="Assinantes" subtitle={`${items.length} assinaturas reais`}/><div className="card p-0">{items.map(x=><div key={x.id} className="flex p-4 border-b border-dark-400"><div className="flex-1"><p className="text-white">{x.client?.name}</p><p className="text-xs text-gray-500">{x.plan?.name} · R${x.price}</p></div><StatusBadge status={x.status}/></div>)}</div></div>}
