import { useState, useEffect, useCallback } from 'react';
import { Plus, Star, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { barbersService } from '../../services/barbers.service';

export default function Barbers() {
  const navigate = useNavigate();
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await barbersService.list({ limit: 100 });
      const data = res.data?.data ?? res.data;
      setBarbers(data?.rows ?? data ?? []);
    } catch {
      setBarbers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Barbeiros"
        subtitle={loading ? 'Carregando...' : `${barbers.length} barbeiros cadastrados`}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={load}><RefreshCw size={15}/></button>
            <button className="btn-primary" onClick={() => navigate('/barbeiros/novo')}>
              <Plus size={15}/> Novo Barbeiro
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {barbers.map(b => (
          <div key={b.id} className="card hover:border-dark-500 transition-colors cursor-pointer group" onClick={() => navigate(`/barbeiros/${b.id}`)}>
            <div className="flex items-start justify-between mb-4">
              <Avatar name={b.name} size="lg" color={b.color} />
              <StatusBadge status={b.status} />
            </div>
            <h3 className="font-semibold text-white mb-0.5">{b.name}</h3>
            <p className="text-xs text-gray-500 mb-4">{b.specialty}</p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-dark-300 rounded-lg p-2">
                <p className="text-sm font-bold text-gold flex items-center justify-center gap-1"><Star size={11}/>{b.rating}</p>
                <p className="text-[10px] text-gray-500">Avaliação</p>
              </div>
              <div className="bg-dark-300 rounded-lg p-2">
                <p className="text-sm font-bold text-white">{b.totalCuts}</p>
                <p className="text-[10px] text-gray-500">Cortes</p>
              </div>
              <div className="bg-dark-300 rounded-lg p-2">
                <p className="text-sm font-bold text-emerald-400">R${Number(b.revenue ?? 0).toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-gray-500">Faturado</p>
              </div>
              <div className="bg-dark-300 rounded-lg p-2">
                <p className="text-sm font-bold text-blue-400">{b.commissionPercent ?? b.commission ?? 0}%</p>
                <p className="text-[10px] text-gray-500">Comissão</p>
              </div>
            </div>
            <button className="btn-secondary w-full justify-center mt-3 text-xs group-hover:border-gold/30 group-hover:text-gold transition-colors">
              Ver Agenda
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
