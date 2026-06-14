import { useEffect, useState } from 'react';
import { Shield, Search } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { gestaoService } from '../../services/gestao.service';

const MODULES = ['Todos', 'Agenda', 'Assinaturas', 'Marketing', 'Produtos', 'Relatórios', 'Profissionais', 'Financeiro'];

export default function Auditorias() {
  const [logs, setLogs] = useState([]);
  const [q, setQ] = useState('');
  const [mod, setMod] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gestaoService.listAuditLogs({ limit: 200 })
      .then(r => setLogs(r.data.data?.data || r.data.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l => {
    const matchQ = (l.user || l.userName || '').toLowerCase().includes(q.toLowerCase())
      || (l.action || l.description || '').toLowerCase().includes(q.toLowerCase());
    return matchQ && (mod === 'Todos' || l.module === mod);
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Auditorias" subtitle="Histórico completo de ações no sistema" />
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-9 w-full text-sm" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por usuário ou ação..." />
        </div>
        <select className="input w-auto text-sm" value={mod} onChange={e => setMod(e.target.value)}>
          {MODULES.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden p-0">
        {loading ? (
          <p className="text-center py-10 text-gray-500 text-sm">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-sm">Nenhuma ação registrada.</p>
        ) : (
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
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-dark-300/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center text-[10px] font-bold text-gold flex-shrink-0">
                          {(l.user || l.userName || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white">{l.user || l.userName || '—'}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-300 text-sm">{l.action || l.description || '—'}</td>
                    <td className="table-cell hidden md:table-cell">
                      {l.module && <span className="badge badge-blue text-[10px]">{l.module}</span>}
                    </td>
                    <td className="table-cell hidden lg:table-cell text-gray-500 text-xs font-mono">{l.ip || l.ipAddress || '—'}</td>
                    <td className="table-cell text-gray-500 text-xs">
                      {l.at || l.createdAt ? new Date(l.at || l.createdAt).toLocaleString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
