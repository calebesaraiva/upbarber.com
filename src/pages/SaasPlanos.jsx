import { useEffect, useState } from 'react';
import { Check, Crown } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { settingsService } from '../services/settings.service';
import { useAuth } from '../context/AuthContext';

export default function SaasPlanos(){const{barbershop}=useAuth();const[plans,setPlans]=useState([]);useEffect(()=>{settingsService.getSaasPlans().then(r=>setPlans(r.data.data||[]));},[]);return <div><PageHeader title="Meu Plano UpBarber" subtitle="Planos disponibilizados pela plataforma"/><div className="card mb-5"><p className="text-xs text-gray-500">Status atual</p><p className="text-xl text-gold font-bold">{barbershop?.saasStatus||barbershop?.subscriptionStatus}</p></div><div className="grid md:grid-cols-3 gap-4">{plans.map(p=><div key={p.id} className="card"><Crown className="text-gold"/><h3 className="text-xl text-white font-bold mt-3">{p.name}</h3><p className="text-2xl text-gold font-bold">R${p.price}/mês</p>{(Array.isArray(p.features)?p.features:[]).map(f=><p key={f} className="text-sm text-gray-400 flex gap-2 mt-2"><Check size={13}/>{f}</p>)}</div>)}</div></div>}
