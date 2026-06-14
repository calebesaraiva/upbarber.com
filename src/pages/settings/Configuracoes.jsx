import { useEffect, useState } from 'react';
import { Save, Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { settingsService } from '../../services/settings.service';
import { useApp } from '../../context/AppContext';

const PM_LABELS = { pix: 'Pix', cash: 'Dinheiro', credit: 'Cartão de Crédito', debit: 'Cartão de Débito', subscription: 'Assinatura' };
const ROLE_LABELS = { admin: 'Admin', barber: 'Barbeiro', receptionist: 'Recepção' };
const FIELD_LABELS = { name: 'Nome', phone: 'Telefone', whatsapp: 'WhatsApp', email: 'E-mail', address: 'Endereço', city: 'Cidade', state: 'UF' };

export default function Configuracoes() {
  const { addToast } = useApp();
  const [shop, setShop] = useState({});
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState({});
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'receptionist' });

  const load = () => Promise.all([
    settingsService.getBarbershop(),
    settingsService.listUsers(),
    settingsService.getPaymentMethods(),
  ]).then(([s, u, p]) => {
    setShop(s.data.data || {});
    setUsers(u.data.data || []);
    setPayments(p.data.data || {});
  });

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await settingsService.updateBarbershop({ ...shop, intervalMinutes: Number(shop.intervalMinutes) });
      await settingsService.updatePaymentMethods(payments);
      addToast('Configurações salvas', 'success');
    } catch {
      addToast('Erro ao salvar configurações', 'error');
    }
  };

  const create = async () => {
    try {
      await settingsService.createUser(newUser);
      setNewUser({ name: '', email: '', password: '', role: 'receptionist' });
      await load();
      addToast('Usuário criado', 'success');
    } catch (e) {
      addToast(e.response?.data?.error?.message || 'Erro ao criar usuário', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Configurações" subtitle="Configurações da barbearia" actions={<button className="btn-primary" onClick={save}><Save size={14} /> Salvar</button>} />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="card space-y-3">
            <h3 className="section-title">Dados da Barbearia</h3>
            {Object.entries(FIELD_LABELS).map(([k, label]) => (
              <div key={k}>
                <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                <input className="input" value={shop[k] || ''} onChange={e => setShop({ ...shop, [k]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Intervalo entre agendamentos (minutos)</label>
              <input className="input" type="number" min={5} step={5} value={shop.intervalMinutes || 30} onChange={e => setShop({ ...shop, intervalMinutes: e.target.value })} />
            </div>
          </div>

          <div className="card space-y-3">
            <h3 className="section-title">Formas de Pagamento aceitas</h3>
            {Object.entries(PM_LABELS).map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-gold" checked={!!payments[k]} onChange={e => setPayments({ ...payments, [k]: e.target.checked })} />
                <span className="text-sm text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title mb-3">Usuários do sistema</h3>
          <div className="divide-y divide-dark-400 mb-4">
            {users.map(u => (
              <div key={u.id} className="py-3">
                <p className="text-sm text-white">{u.name}</p>
                <p className="text-xs text-gray-500">{u.email} · {ROLE_LABELS[u.role] || u.role}</p>
              </div>
            ))}
          </div>
          <h3 className="section-title mb-3">Adicionar usuário</h3>
          <div className="space-y-2">
            <input className="input" placeholder="Nome" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
            <input className="input" placeholder="E-mail" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            <input className="input" type="password" placeholder="Senha" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
            <select className="input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="admin">Admin</option>
              <option value="barber">Barbeiro</option>
              <option value="receptionist">Recepção</option>
            </select>
            <button className="btn-secondary w-full justify-center" onClick={create}><Plus size={14} /> Criar usuário</button>
          </div>
        </div>
      </div>
    </div>
  );
}
