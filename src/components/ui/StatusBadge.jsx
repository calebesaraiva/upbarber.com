export function StatusBadge({ status }) {
  const map = {
    active: { label: 'Ativo', cls: 'badge-green' },
    inactive: { label: 'Inativo', cls: 'badge-gray' },
    scheduled: { label: 'Agendado', cls: 'badge-blue' },
    confirmed: { label: 'Confirmado', cls: 'badge-gold' },
    in_progress: { label: 'Em atendimento', cls: 'badge-purple' },
    completed: { label: 'Finalizado', cls: 'badge-green' },
    cancelled: { label: 'Cancelado', cls: 'badge-red' },
    no_show: { label: 'Não compareceu', cls: 'badge-gray' },
    overdue: { label: 'Inadimplente', cls: 'badge-red' },
    pending: { label: 'Pendente', cls: 'badge-yellow' },
    draft: { label: 'Rascunho', cls: 'badge-gray' },
    paused: { label: 'Pausado', cls: 'badge-yellow' },
    subscriber: { label: 'Assinante', cls: 'badge-gold' },
    common: { label: 'Comum', cls: 'badge-blue' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'badge-gray' };
  return <span className={cls}>{label}</span>;
}
