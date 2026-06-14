const operationalPaths = [
  '/agenda',
  '/clientes',
  '/servicos',
  '/produtos',
  '/estoque',
  '/comandas',
  '/caixa',
  '/notificacoes',
  '/suporte',
];

const barberPaths = [
  '/agenda',
  '/clientes',
  '/notificacoes',
  '/suporte',
];

export function canAccessPath(role, pathname) {
  if (role === 'admin' || role === 'saas_admin') return true;
  const allowed = role === 'receptionist' ? operationalPaths : role === 'barber' ? barberPaths : [];
  return allowed.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export function homeForRole(role) {
  return role === 'barber' || role === 'receptionist' ? '/agenda' : '/dashboard';
}
