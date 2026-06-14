import { Shield, Search, User, Clock } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useState } from 'react';

const logs = [
  { id:1, user:'Admin', action:'Criou agendamento #1247', module:'Agenda', ip:'189.x.x.x', at:'14/06/2026 09:12' },
  { id:2, user:'Carlos Silva', action:'Finalizou atendimento — João Pereira', module:'Agenda', ip:'189.x.x.x', at:'14/06/2026 09:45' },
  { id:3, user:'Admin', action:'Alterou plano de assinatura de Lucas Mendes', module:'Assinaturas', ip:'189.x.x.x', at:'14/06/2026 10:02' },
  { id:4, user:'Admin', action:'Criou promoção "Corte + Barba Segunda"', module:'Marketing', ip:'189.x.x.x', at:'13/06/2026 18:30' },
  { id:5, user:'Recepcionista', action:'Cancelou agendamento #1243', module:'Agenda', ip:'189.x.x.x', at:'13/06/2026 17:15' },
  { id:6, user:'Admin', action:'Adicionou produto "Pomada Gold"', module:'Produtos', ip:'189.x.x.x', at:'13/06/2026 15:00' },
  { id:7, user:'Carlos Silva', action:'Acessou relatório financeiro', module:'Relatórios', ip:'189.x.x.x', at:'13/06/2026 14:22' },
  { id:8, user:'Admin', action:'Alterou comissão de Rafael Santos para 38%', module:'Profissionais', ip:'189.x.x.x', at:'12/06/2026 11:10' },
];

const MODULES = ['Todos','Agenda','Assinaturas','Marketing','Produtos','Relatórios','Profissionais','Financeiro'];

export default function Auditorias() {
  const [q, setQ] = useState('');
  const [mod, setMod] = useState('Todos');

  const filtered = logs.filter(l => {
    const matchQ = l.user.toLowerCase().includes(q.toLowerCase()) || l.action.toLowerCase().includes(q.toLowerCase());
    return matchQ && (mod==='Todos' || l.module===mod);
  });

  return (
    <div>
      <PageHeader title="Auditorias" subtitle="Histórico completo de ações no sistema"/>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
          <input className="input pl-9 w-full text-sm" value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por usuário ou ação..."/>
        </div>
        <select className="input w-auto text-sm" value={mod} onChange={e=>setMod(e.target.value)}>
          {MODULES.map(m=><option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-dark-400">
              <tr>
                <th className="table-header text-left">Usuário</th>
                <th className="table-header text-left">Ação</th>
                <th className="table-header text-left hidden md:table-cell">Módulo</th>
                <th className="table-header text-left hidden lg:table-cell">IP</th>
                <th className="table-header text-left">Data/hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-400/50">
              {filtered.map(l=>(
                <tr key={l.id} className="hover:bg-dark-300/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center text-[10px] font-bold text-gold flex-shrink-0">
                        {l.user.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-white">{l.user}</span>
                    </div>
                  </td>
                  <td className="table-cell text-gray-300 text-sm">{l.action}</td>
                  <td className="table-cell hidden md:table-cell"><span className="badge-blue text-[10px]">{l.module}</span></td>
                  <td className="table-cell hidden lg:table-cell text-gray-500 text-xs font-mono">{l.ip}</td>
                  <td className="table-cell text-gray-500 text-xs">{l.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
