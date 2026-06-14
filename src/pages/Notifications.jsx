import { useEffect, useState } from 'react';
import { Check, Info } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { notificationsService } from '../services/notifications.service';
import { useApp } from '../context/AppContext';

export default function Notifications() {
  const { addToast } = useApp();
  const [items, setItems] = useState([]);
  const load = () => notificationsService.list().then(res => setItems(res.data.data?.data || res.data.data || []));
  useEffect(load, []);

  const markAll = async () => {
    await notificationsService.markAllRead();
    await load();
    addToast('Todas marcadas como lidas', 'success');
  };

  const markOne = async id => {
    await notificationsService.markRead(id);
    await load();
  };

  return (
    <div>
      <PageHeader title="Notificações" subtitle={`${items.filter(item => !item.isRead).length} não lidas`}
        actions={<button className="btn-secondary text-xs" onClick={markAll}><Check size={13}/> Marcar todas como lidas</button>} />
      <div className="space-y-2 max-w-2xl">
        {items.length === 0 && <div className="card text-sm text-gray-500">Nenhuma notificação.</div>}
        {items.map(item => (
          <button key={item.id} onClick={() => markOne(item.id)} className={`card w-full text-left flex gap-3 ${item.isRead ? 'opacity-60' : ''}`}>
            <Info size={16} className="text-gold mt-1" />
            <div>
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.message}</p>
              <p className="text-[10px] text-gray-600 mt-1">{new Date(item.createdAt).toLocaleString('pt-BR')}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
