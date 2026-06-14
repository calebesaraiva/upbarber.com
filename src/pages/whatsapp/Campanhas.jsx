import { useEffect, useState } from 'react';
import { Plus, Send, MessageCircle, Users, Clock, CheckCircle, XCircle, Headphones } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { marketingService } from '../../services/marketing.service';
import { useApp } from '../../context/AppContext';

const AUDIENCE_LABELS = { all: 'Todos os clientes', subscribers: 'Assinantes', common: 'Não assinantes', inactive: 'Inativos', overdue: 'Inadimplentes' };
const STATUS_STYLES = { draft: 'badge-gray', scheduled: 'badge-blue', sending: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red' };
const STATUS_LABELS = { draft: 'Rascunho', scheduled: 'Agendado', sending: 'Enviando', completed: 'Concluído', cancelled: 'Cancelado' };

export default function Campanhas() {
  const { addToast } = useApp();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(null);
  const [form, setForm] = useState({ name: '', message: '', audience: 'all', status: 'draft' });

  const load = () => marketingService.listCampaigns({ limit: 100 }).then(r => setItems(r.data.data?.data || []));
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await marketingService.createCampaign(form);
      setOpen(false);
      setForm({ name: '', message: '', audience: 'all', status: 'draft' });
      await load();
      addToast('Campanha criada com sucesso', 'success');
    } catch (e) {
      addToast(e.response?.data?.error?.message || 'Erro ao criar campanha', 'error');
    }
  };

  const send = async (id) => {
    setSending(id);
    try {
      const res = await marketingService.sendCampaign(id);
      await load();
      addToast(res.data?.data?.message || 'Chamado aberto! Nossa equipe entrará em contato para implantar o WhatsApp.', 'success');
    } catch (e) {
      addToast(e.response?.data?.error?.message || 'Falha ao processar', 'error');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Campanhas WhatsApp"
        subtitle="Crie campanhas e solicite o disparo ao suporte para ativação do WhatsApp"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={14} /> Nova campanha
          </button>
        }
      />

      {/* WhatsApp info banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3 items-start">
        <Headphones size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white">Como funciona o disparo de campanhas?</p>
          <p className="text-xs text-gray-400 mt-1 leading-5">
            Crie sua campanha aqui, depois clique em "Solicitar disparo". Abriremos um chamado de suporte e nossa equipe realizará a implantação do WhatsApp e agendará o envio para seus clientes.
          </p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            <MessageCircle size={32} className="mx-auto mb-3 text-gray-600" />
            Nenhuma campanha criada ainda.
          </div>
        ) : (
          <div className="divide-y divide-dark-400">
            {items.map(x => (
              <div key={x.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white truncate">{x.name}</p>
                    <span className={`badge ${STATUS_STYLES[x.status] || 'badge-gray'}`}>{STATUS_LABELS[x.status] || x.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{x.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-gray-600 flex items-center gap-1"><Users size={10} /> {AUDIENCE_LABELS[x.audience] || x.audience}</span>
                    {x.scheduledAt && <span className="text-[11px] text-gray-600 flex items-center gap-1"><Clock size={10} /> {new Date(x.scheduledAt).toLocaleString('pt-BR')}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {x.status === 'draft' && (
                    <button
                      className="btn-primary py-2 px-3 text-xs"
                      onClick={() => send(x.id)}
                      disabled={sending === x.id}
                    >
                      <Send size={12} />
                      {sending === x.id ? 'Solicitando...' : 'Solicitar disparo'}
                    </button>
                  )}
                  {x.status === 'scheduled' && (
                    <span className="badge badge-blue flex items-center gap-1"><CheckCircle size={10} /> Aguardando suporte</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Nova campanha">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Nome da campanha</label>
            <input className="input" placeholder="Ex: Retorno de clientes inativos" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Mensagem</label>
            <textarea className="input h-28 resize-none" placeholder="Olá {nome}, temos novidades pra você!" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Público-alvo</label>
            <select className="input" value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}>
              {Object.entries(AUDIENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button className="btn-primary w-full justify-center py-3" onClick={create}>
            <Plus size={14} /> Criar campanha
          </button>
        </div>
      </Modal>
    </div>
  );
}
