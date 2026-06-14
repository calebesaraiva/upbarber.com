import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { financialService } from '../../services/financial.service';
import { useApp } from '../../context/AppContext';

export default function CaixaDia(){
 const {addToast}=useApp(); const [summary,setSummary]=useState({}); const [items,setItems]=useState([]); const [open,setOpen]=useState(false); const [form,setForm]=useState({description:'',amount:'',type:'income',category:'Manual',paymentMethod:'cash',date:new Date().toISOString().slice(0,10)});
 const load=()=>Promise.all([financialService.getSummary(),financialService.listTransactions({limit:100})]).then(([s,t])=>{setSummary(s.data.data);setItems(t.data.data?.data||[]);}); useEffect(load,[]);
 const save=async()=>{await financialService.createTransaction({...form,amount:Number(form.amount)});setOpen(false);await load();addToast('Lançamento registrado','success');};
 return <div><PageHeader title="Caixa do Dia" subtitle="Movimentos reais" actions={<button className="btn-primary" onClick={()=>setOpen(true)}><Plus size={14}/> Lançamento</button>}/><div className="grid grid-cols-3 gap-4 mb-5"><div className="card text-emerald-400">Entradas<br/><strong>R${Number(summary.totalIncome||0).toFixed(2)}</strong></div><div className="card text-red-400">Saídas<br/><strong>R${Number(summary.totalExpense||0).toFixed(2)}</strong></div><div className="card text-gold">Saldo<br/><strong>R${Number(summary.profit||0).toFixed(2)}</strong></div></div><div className="card">{items.map(x=><div key={x.id} className="flex p-3 border-b border-dark-400"><span className="flex-1 text-white">{x.description}</span><span className={x.type==='income'?'text-emerald-400':'text-red-400'}>R${Number(x.amount).toFixed(2)}</span></div>)}</div><Modal isOpen={open} onClose={()=>setOpen(false)} title="Novo lançamento"><div className="space-y-3"><input className="input" placeholder="Descrição" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><input className="input" type="number" placeholder="Valor" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/><select className="input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="income">Entrada</option><option value="expense">Saída</option></select><button className="btn-primary w-full justify-center" onClick={save}>Salvar</button></div></Modal></div>;
}
