import { useEffect, useState } from 'react';
import { Send, Headphones, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { supportService } from '../services/support.service';
import { useApp } from '../context/AppContext';

const STATUS_LABELS = { open: 'Aberto', in_progress: 'Em andamento', resolved: 'Resolvido', closed: 'Fechado' };
const STATUS_COLORS = { open: 'badge-yellow', in_progress: 'badge-blue', resolved: 'badge-green', closed: 'badge-gray' };
const PRIORITY_LABELS = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente' };
const PRIORITY_COLORS = { low: 'text-gray-400', medium: 'text-yellow-400', high: 'text-orange-400', urgent: 'text-red-400' };

export default function Support() {
  const { addToast } = useApp();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ subject: '', body: '', priority: 'medium' });

  const load = () => supportService.list().then(r => setItems(r.data.data || []));
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!form.subject.trim() || !form.body.trim()) {
      addToast('Preencha o assunto e a descrição', 'error');
      return;
    }
    try {
      await supportService.create(form);
      setForm({ subject: '', body: '', priority: 'medium' });
      await load();
      addToast('Chamado criado com sucesso', 'success');
    } catch (e) {
      addToast(e.response?.data?.error?.message || 'Falha ao criar chamado', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Suporte" subtitle="Abra chamados e acompanhe o atendimento da nossa equipe" />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Headphones size={16} className="text-gold" />
            <h3 className="section-title">Novo chamado</h3>
          </div>
          <input
            className="input"
            placeholder="Assunto"
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
          />
          <textarea
            className="input h-32 resize-none"
            placeholder="Descreva sua solicitação com o máximo de detalhes possível"
            value={form.body}
            onChange={e => setForm({ ...form, body: e.target.value })}
          />
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Prioridade</label>
            <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <button className="btn-primary w-full justify-center py-3" onClick={send}>
            <Send size={14} /> Enviar chamado
          </button>
        </div>

        <div className="card">
          <h3 className="section-title mb-3">Meus chamados</h3>
          {items.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">Nenhum chamado aberto.</p>
          ) : (
            <div className="divide-y divide-dark-400">
              {items.map(x => (
                <div key={x.id} className="py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 font-mono">{x.code}</span>
                    <span className={`badge ${STATUS_COLORS[x.status] || 'badge-gray'}`}>
                      {STATUS_LABELS[x.status] || x.status}
                    </span>
                    <span className={`text-xs font-medium ${PRIORITY_COLORS[x.priority] || 'text-gray-400'}`}>
                      {PRIORITY_LABELS[x.priority] || x.priority}
                    </span>
                  </div>
                  <p className="text-sm text-white">{x.subject}</p>
                  {x.createdAt && (
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Clock size={10} /> {new Date(x.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
