import { useState } from 'react';
import { Save, Building2, Upload } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useApp } from '../../context/AppContext';

export default function DadosEmpresa() {
  const { addToast } = useApp();
  const [form, setForm] = useState({
    name:'Barbearia Premium', cnpj:'12.345.678/0001-99', phone:'(11) 99999-0000',
    whatsapp:'(11) 99999-0000', email:'contato@upbarber.com',
    address:'Rua das Flores, 123', neighborhood:'Centro', city:'São Paulo', state:'SP', zip:'01310-100',
    instagram:'@barberiapremium', facebook:'Barbearia Premium', site:'www.barberiapremium.com.br'
  });
  const upd = k => e => setForm({...form,[k]:e.target.value});

  return (
    <div>
      <PageHeader title="Dados da Empresa" subtitle="Informações cadastrais da barbearia"/>
      <div className="max-w-2xl space-y-4">
        <div className="card space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gold/20 border-2 border-dashed border-gold/30 flex flex-col items-center justify-center cursor-pointer hover:bg-gold/30 transition-colors">
              <Upload size={20} className="text-gold mb-1"/>
              <span className="text-[10px] text-gold">Logo</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Logo da barbearia</p>
              <p className="text-xs text-gray-500">PNG, JPG até 5MB. Aparece no app e nos recibos.</p>
              <button className="btn-secondary text-xs py-1.5 mt-2" onClick={() => addToast('Upload...','info')}><Upload size={11}/> Enviar logo</button>
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="section-title">Dados Principais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="text-xs text-gray-400 mb-1 block">Nome da barbearia</label><input className="input" value={form.name} onChange={upd('name')}/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">CNPJ</label><input className="input" value={form.cnpj} onChange={upd('cnpj')}/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Telefone</label><input className="input" value={form.phone} onChange={upd('phone')}/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">WhatsApp</label><input className="input" value={form.whatsapp} onChange={upd('whatsapp')}/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">E-mail</label><input className="input" type="email" value={form.email} onChange={upd('email')}/></div>
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="section-title">Endereço</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-400 mb-1 block">CEP</label><input className="input" value={form.zip} onChange={upd('zip')}/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Logradouro</label><input className="input" value={form.address} onChange={upd('address')}/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Bairro</label><input className="input" value={form.neighborhood} onChange={upd('neighborhood')}/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Cidade</label><input className="input" value={form.city} onChange={upd('city')}/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">UF</label><input className="input" value={form.state} onChange={upd('state')}/></div>
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="section-title">Redes Sociais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="text-xs text-gray-400 mb-1 block">Instagram</label><input className="input" value={form.instagram} onChange={upd('instagram')}/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Facebook</label><input className="input" value={form.facebook} onChange={upd('facebook')}/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Site</label><input className="input" value={form.site} onChange={upd('site')}/></div>
          </div>
        </div>

        <button className="btn-primary w-full justify-center py-3" onClick={() => addToast('Dados salvos!','success')}>
          <Save size={15}/> Salvar Alterações
        </button>
      </div>
    </div>
  );
}
