import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { clientsService } from '../../services/clients.service';
import { StatusBadge } from '../../components/ui/StatusBadge';

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,setData]=useState(null);
  useEffect(()=>{ clientsService.getById(id).then(res=>setData(res.data.data)); },[id]);
  if(!data) return <div className="card text-gray-500">Carregando cliente...</div>;
  const {client,subscription,appointments,orders}=data;
  return <div><div className="flex gap-3 mb-6"><button onClick={()=>navigate(-1)} className="btn-secondary"><ArrowLeft size={14}/></button><h1 className="page-title flex-1">{client.name}</h1><button onClick={()=>navigate(`/clientes/${id}/editar`)} className="btn-secondary"><Edit size={14}/> Editar</button></div><div className="grid lg:grid-cols-3 gap-4"><div className="card"><p className="text-sm text-gray-400">{client.email||'Sem e-mail'}</p><p className="text-sm text-gray-400">{client.phone||'Sem telefone'}</p>{subscription&&<div className="mt-4"><p className="text-gold font-bold">{subscription.plan.name}</p><StatusBadge status={subscription.status}/></div>}</div><div className="card lg:col-span-2"><h3 className="section-title mb-3">Atendimentos</h3>{appointments.map(a=><div key={a.id} className="flex p-3 border-b border-dark-400"><span className="flex-1 text-sm text-white">{new Date(a.date).toLocaleDateString('pt-BR')} · {a.startTime}</span><StatusBadge status={a.status}/></div>)}</div><div className="card lg:col-span-3"><h3 className="section-title mb-3">Comandas</h3><p className="text-sm text-gray-500">{orders.length} comandas registradas</p></div></div></div>;
}
