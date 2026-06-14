import { useEffect, useState } from 'react';
import { Image, Tag, Star, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { marketingService } from '../../services/marketing.service';
import { useApp } from '../../context/AppContext';

export default function Marketing() {
  const { addToast } = useApp();
  const [banners, setBanners] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [benefits, setBenefits] = useState([]);

  const load = () => Promise.all([
    marketingService.listBanners(),
    marketingService.listPromotions(),
    marketingService.listBenefits(),
  ]).then(([b, p, c]) => {
    setBanners(b.data.data?.data || b.data.data || []);
    setPromotions(p.data.data?.data || p.data.data || []);
    setBenefits(c.data.data?.data || c.data.data || []);
  }).catch(() => addToast('Erro ao carregar dados de marketing', 'error'));

  useEffect(() => { load(); }, []);

  const toggle = async (type, id, current) => {
    try {
      if (type === 'banner') await marketingService.toggleBanner(id);
      else if (type === 'promotion') await marketingService.togglePromotion(id);
      else if (type === 'benefit') await marketingService.toggleBenefit(id);
      await load();
      addToast(current ? 'Desativado' : 'Ativado', 'success');
    } catch {
      addToast('Erro ao alterar status', 'error');
    }
  };

  const Section = ({ title, icon: Icon, items, type, nameKey = 'name' }) => (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-gold" />
          <h3 className="section-title">{title}</h3>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">Nenhum item cadastrado.</p>
      ) : (
        <div className="divide-y divide-dark-400">
          {items.map(x => (
            <div key={x.id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{x[nameKey] || x.title || x.name}</p>
                {x.description && <p className="text-xs text-gray-500 truncate">{x.description}</p>}
              </div>
              <button
                onClick={() => toggle(type, x.id, x.isActive)}
                className={`flex-shrink-0 ${x.isActive ? 'text-emerald-400' : 'text-gray-600'}`}
              >
                {x.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Marketing" subtitle="Banners, promoções e benefícios do clube" />
      <div className="grid lg:grid-cols-3 gap-4">
        <Section title="Banners" icon={Image} items={banners} type="banner" nameKey="title" />
        <Section title="Promoções" icon={Tag} items={promotions} type="promotion" />
        <Section title="Benefícios do Clube" icon={Star} items={benefits} type="benefit" />
      </div>
    </div>
  );
}
