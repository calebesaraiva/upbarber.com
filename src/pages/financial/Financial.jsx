import { useEffect, useState } from 'react';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { financialService } from '../../services/financial.service';

const money = value => Number(value || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export default function Financial() {
  const [summary,setSummary]=useState({});
  const [transactions,setTransactions]=useState([]);
  useEffect(()=>{ Promise.all([financialService.getSummary(),financialService.listTransactions({limit:100})]).then(([s,t])=>{setSummary(s.data.data);setTransactions(t.data.data?.data||[]);}); },[]);
  return <div><PageHeader title="Financeiro" subtitle="Dados financeiros reais" /><div className="grid grid-cols-3 gap-4 mb-5">{[[TrendingUp,'Receitas',summary.totalIncome,'text-emerald-400'],[TrendingDown,'Despesas',summary.totalExpense,'text-red-400'],[DollarSign,'Lucro',summary.profit,'text-gold']].map(([Icon,label,val,color])=><div className="card" key={label}><Icon className={color}/><p className="text-xs text-gray-500 mt-2">{label}</p><p className={`text-xl font-bold ${color}`}>{money(val)}</p></div>)}</div><div className="card p-0">{transactions.map(t=><div key={t.id} className="flex p-4 border-b border-dark-400"><div className="flex-1"><p className="text-sm text-white">{t.description}</p><p className="text-xs text-gray-500">{t.category} · {new Date(t.date).toLocaleDateString('pt-BR')}</p></div><strong className={t.type==='income'?'text-emerald-400':'text-red-400'}>{money(t.amount)}</strong></div>)}</div></div>;
}
