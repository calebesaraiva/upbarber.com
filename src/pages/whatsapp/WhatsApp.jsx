import { useEffect, useState } from 'react';
import { MessageCircle, Wifi, WifiOff, Headphones } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { marketingService } from '../../services/marketing.service';
import { useApp } from '../../context/AppContext';

const STATUS_LABELS = { connected: 'Conectado', disconnected: 'Desconectado', connecting: 'Conectando...', error: 'Erro de conexão' };

export default function WhatsApp() {
  const { addToast } = useApp();
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [flows, setFlows] = useState([]);

  const load = () => Promise.all([
    marketingService.getWAStatus(),
    marketingService.listAutoMessages(),
    marketingService.listFlows(),
  ]).then(([c, m, f]) => {
    setConnection(c.data.data);
    setMessages(m.data.data?.data || m.data.data || []);
    setFlows(f.data.data?.data || f.data.data || []);
  });

  useEffect(() => { load(); }, []);

  const connect = async () => {
    try {
      await marketingService.connectWA();
      await load();
      addToast('Solicitação enviada ao provedor WhatsApp', 'success');
    } catch (e) {
      addToast(e.response?.data?.error?.message || 'Falha ao conectar', 'error');
    }
  };

  const disconnect = async () => {
    await marketingService.disconnectWA();
    await load();
  };

  const isConnected = connection?.status === 'connected';

  return (
    <div className="space-y-5">
      <PageHeader title="Automação WhatsApp" subtitle="Integração e automações via WhatsApp" />

      {/* Status card */}
      <div className="card flex items-center gap-4">
        {isConnected
          ? <Wifi size={22} className="text-emerald-400 flex-shrink-0" />
          : <WifiOff size={22} className="text-red-400 flex-shrink-0" />}
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">
            {STATUS_LABELS[connection?.status] || 'Desconectado'}
          </p>
          <p className="text-xs text-gray-500">{connection?.phoneNumber || 'Nenhum número conectado'}</p>
        </div>
        {isConnected
          ? <button className="btn-secondary" onClick={disconnect}>Desconectar</button>
          : <button className="btn-primary" onClick={connect}>Solicitar conexão</button>}
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3 items-start">
        <Headphones size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white">Como ativar o WhatsApp?</p>
          <p className="text-xs text-gray-400 mt-1 leading-5">
            A integração com WhatsApp é realizada manualmente pela nossa equipe. Clique em "Solicitar conexão" ou abra um chamado no Suporte e nossa equipe realizará a implantação para você.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="section-title mb-3">Mensagens automáticas</h3>
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Nenhuma mensagem automática configurada.</p>
          ) : (
            <div className="divide-y divide-dark-400">
              {messages.map(m => (
                <div key={m.id} className="py-3">
                  <p className="text-sm text-white">{m.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.template}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title mb-3">Fluxos configurados</h3>
          {flows.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Nenhum fluxo configurado.</p>
          ) : (
            <div className="divide-y divide-dark-400">
              {flows.map(f => (
                <div key={f.id} className="flex items-center gap-2 py-3">
                  <MessageCircle size={14} className="text-gold flex-shrink-0" />
                  <span className="text-sm text-white">{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
