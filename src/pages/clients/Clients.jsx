import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Phone, Crown, User, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { clientsService } from '../../services/clients.service';

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (q) params.search = q;
      if (filter === 'subscriber') params.status = 'subscriber';
      if (filter === 'inactive') params.status = 'inactive';
      const res = await clientsService.list(params);
      const data = res.data?.data ?? res.data;
      const rows = data?.rows ?? data ?? [];
      setClients(rows);
      setTotal(data?.total ?? rows.length);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [q, filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = clients.filter(c => {
    if (filter === 'subscriber') return c.subscriptions?.length > 0 || c.planId;
    if (filter === 'common') return !c.subscriptions?.length && !c.planId;
    if (filter === 'overdue') return c.subscriptionStatus === 'overdue' || c.subscriptions?.[0]?.status === 'overdue';
    if (filter === 'inactive') return c.isActive === false || c.status === 'inactive';
    return true;
  });

  const getActiveSubscription = (c) => c.subscriptions?.[0];

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={loading ? 'Carregando...' : `${total} clientes cadastrados`}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={load}><RefreshCw size={15}/></button>
            <button className="btn-primary" onClick={() => navigate('/clientes/novo')}>
              <Plus size={15} /> Novo Cliente
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: total, color: 'text-white' },
          { label: 'Assinantes', value: clients.filter(c=>c.subscriptions?.length > 0 || c.planId).length, color: 'text-gold' },
          { label: 'Inadimplentes', value: clients.filter(c=>c.subscriptionStatus==='overdue' || c.subscriptions?.[0]?.status==='overdue').length, color: 'text-red-400' },
          { label: 'Inativos', value: clients.filter(c=>c.isActive===false||c.status==='inactive').length, color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="card py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-9 w-full" value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nome ou telefone..." />
        </div>
        <div className="flex bg-dark-300 rounded-lg p-0.5 gap-0.5">
          {[
            {id:'all',label:'Todos'},
            {id:'subscriber',label:'Assinantes'},
            {id:'common',label:'Comuns'},
            {id:'overdue',label:'Inadim.'},
            {id:'inactive',label:'Inativos'},
          ].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${filter===f.id?'bg-gold text-dark':'text-gray-400 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={User} title="Nenhum cliente encontrado" description="Tente outro filtro ou cadastre um novo cliente." />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-dark-400">
                <tr>
                  <th className="table-header text-left">Cliente</th>
                  <th className="table-header text-left hidden sm:table-cell">Telefone</th>
                  <th className="table-header text-left hidden md:table-cell">Plano</th>
                  <th className="table-header text-left hidden lg:table-cell">Último Atendimento</th>
                  <th className="table-header text-right hidden lg:table-cell">Total Gasto</th>
                  <th className="table-header text-left">Status</th>
                  <th className="table-header" />
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-400/50">
                {filtered.map(c => {
                  const sub = getActiveSubscription(c);
                  return (
                    <tr key={c.id} onClick={() => navigate(`/clientes/${c.id}`)}
                      className="hover:bg-dark-300/50 cursor-pointer transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} size="sm" />
                          <div>
                            <p className="font-medium text-white text-sm">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Phone size={12} /> {c.phone ?? '—'}
                        </div>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        {sub ? (
                          <span className="badge-gold flex items-center gap-1 w-fit">
                            <Crown size={10}/> {sub.plan?.name ?? 'Assinante'}
                          </span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="table-cell hidden lg:table-cell text-gray-400">
                        {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="table-cell hidden lg:table-cell text-right font-semibold text-emerald-400">
                        R${Number(c.totalSpent ?? 0).toLocaleString('pt-BR')}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={sub?.status || (c.isActive === false ? 'inactive' : 'active')} />
                      </td>
                      <td className="table-cell text-right">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${c.id}`); }} className="text-xs text-gold hover:text-gold-light transition-colors">Ver</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
