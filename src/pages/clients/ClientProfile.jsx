import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Calendar, ShoppingBag } from 'lucide-react';
import { clientsService } from '../../services/clients.service';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useApp } from '../../context/AppContext';

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientsService.getById(id)
      .then(res => setData(res.data.data || null))
      .catch(() => {
        addToast('Erro ao carregar cliente', 'error');
        navigate('/clientes');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card text-gray-500 text-sm">Carregando cliente...</div>;
  if (!data) return null;

  const { client, subscription, appointments = [], orders = [] } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft size={16} /></button>
        <h1 className="page-title flex-1">{client?.name}</h1>
        <button onClick={() => navigate(`/clientes/${id}/editar`)} className="btn-secondary"><Edit size={14} /> Editar</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Info */}
        <div className="card space-y-3">
          <h3 className="section-title">Informações</h3>
          <p className="text-sm text-gray-400">{client?.email || 'Sem e-mail'}</p>
          <p className="text-sm text-gray-400">{client?.phone || 'Sem telefone'}</p>
          {client?.birthdate && (
            <p className="text-sm text-gray-400">Nascimento: {new Date(client.birthdate).toLocaleDateString('pt-BR')}</p>
          )}
          {subscription && (
            <div className="pt-3 border-t border-dark-400">
              <p className="text-xs text-gray-500 mb-1">Assinatura</p>
              <p className="text-gold font-bold">{subscription?.plan?.name ?? '—'}</p>
              <p className="text-sm text-gray-400">{money(subscription?.price)}/mês</p>
              <StatusBadge status={subscription?.status} />
            </div>
          )}
        </div>

        {/* Appointments */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} className="text-gold" />
            <h3 className="section-title">Atendimentos ({appointments.length})</h3>
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum atendimento registrado.</p>
          ) : (
            <div className="divide-y divide-dark-400">
              {appointments.map(a => (
                <div key={a.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <p className="text-sm text-white">{a.service?.name || '—'}</p>
                    <p className="text-xs text-gray-500">
                      {a.date ? new Date(a.date).toLocaleDateString('pt-BR') : '—'} {a.startTime ? `às ${a.startTime}` : ''} · {a.barber?.name || '—'}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders */}
        <div className="card lg:col-span-3">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={15} className="text-gold" />
            <h3 className="section-title">Comandas ({orders.length})</h3>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma comanda registrada.</p>
          ) : (
            <div className="divide-y divide-dark-400">
              {orders.map(o => (
                <div key={o.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <p className="text-sm text-white">{o.items?.length ?? 0} item(s)</p>
                    <p className="text-xs text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-BR') : '—'}</p>
                  </div>
                  <span className="text-gold font-semibold text-sm">{money(o.total)}</span>
                  <StatusBadge status={o.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
