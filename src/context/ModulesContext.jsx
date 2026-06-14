import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

const ModulesContext = createContext({ hasModule: () => true, modules: [], modality: 'normal' });

export const ALL_MODULES = [
  'agenda', 'clientes', 'barbeiros', 'servicos',
  'planos', 'assinantes', 'assinaturas', 'pagamentos-assinatura',
  'produtos', 'estoque', 'comandas',
  'financeiro', 'caixa',
  'relatorios',
  'whatsapp', 'campanhas',
  'configuracoes', 'notificacoes', 'suporte', 'saas-planos',
];

export function ModulesProvider({ children }) {
  const { barbershop } = useAuth();

  const { modules, modality } = useMemo(() => {
    const raw = barbershop?.enabledModules;
    const mods = Array.isArray(raw) && raw.length > 0 ? raw : ALL_MODULES;
    const mod = barbershop?.masterSaasPlan?.modality ?? barbershop?.saasPlan?.modality ?? 'normal';
    return { modules: mods, modality: mod };
  }, [barbershop]);

  const hasModule = (key) => modules.includes(key);

  return (
    <ModulesContext.Provider value={{ hasModule, modules, modality }}>
      {children}
    </ModulesContext.Provider>
  );
}

export const useModules = () => useContext(ModulesContext);
