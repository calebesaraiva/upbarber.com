import { useEffect, useState } from 'react';
import { Check, Info, Bell } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { notificationsService } from '../services/notifications.service';
import { useApp } from '../context/AppContext';

export default function Notifications() {
  const { addToast } = useApp();
  const [items, setItems] = useState([]);

  const load = () => notificationsService.list()
    .then(res => setItems(res.data.data?.data || res.data.data || []))
    .catch(() => {});

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    try {
      await notificationsService.markAllRead();
      await load();
      addToast('Todas marcadas como lidas', 'success');
    } catch {
      addToast('Erro ao marcar notificações', 'error');
    }
  };

  const markOne = async id => {
    try {
      await notificationsService.markRead(id);
      await load();
    } catch {
      // silencioso — não interrompe UX
    }
  };

  const unread = items.filter(i => !i.isRead).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notificações"
        subtitle={unread > 0 ? `${unread} não lida${unread !== 1 ? 's' : ''}` : 'Tudo em dia'}
        actions={
          unread > 0 && (
            <button className="btn-secondary text-xs" onClick={markAll}>
              <Check size={13} /> Marcar todas como lidas
            </button>
          )
        }
      />
      <div className="space-y-2 max-w-2xl">
        {items.length === 0 ? (
          <div className="card text-center py-10">
            <Bell size={28} className="mx-auto text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">Nenhuma notificação.</p>
          </div>
        ) : (
          items.map(item => (
            <button
              key={item.id}
              onClick={() => markOne(item.id)}
              className={`card w-full text-left flex gap-3 transition-opacity ${item.isRead ? 'opacity-50' : ''}`}
            >
              <Info size={16} className="text-gold mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-gray-500 mt-1">{item.message}</p>
                <p className="text-[10px] text-gray-600 mt-1">{new Date(item.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              {!item.isRead && <div className="w-2 h-2 rounded-full bg-gold mt-2 flex-shrink-0" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
