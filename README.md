# UpBarber — SaaS Frontend para Barbearias

Sistema SaaS completo de gerenciamento para barbearias, desenvolvido com React, Vite e TailwindCSS.

Desenvolvido e mantido pela **NEXUS TECNOLOGIA LTDA**, CNPJ **52.671.137/0001-71**.

Manual completo de uso, suporte e dúvidas: [MANUAL_COMPLETO_UPBARBER.md](./MANUAL_COMPLETO_UPBARBER.md)

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação
```bash
# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse: **http://localhost:5173**

## 🏗️ Build para Produção

```bash
npm run build
npm run preview
```

---

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── layout/
│   │   ├── Layout.jsx          # Layout principal com sidebar
│   │   ├── Sidebar.jsx         # Menu lateral (desktop)
│   │   ├── Header.jsx          # Cabeçalho com notificações
│   │   └── BottomNavigation.jsx # Menu inferior (mobile)
│   └── ui/
│       ├── MetricCard.jsx      # Cards de métricas
│       ├── StatusBadge.jsx     # Badges de status
│       ├── Modal.jsx           # Modal reutilizável
│       ├── Toast.jsx           # Notificações toast
│       ├── Avatar.jsx          # Avatar com iniciais
│       ├── PageHeader.jsx      # Cabeçalho de página
│       ├── SearchInput.jsx     # Input de busca
│       ├── EmptyState.jsx      # Estado vazio
│       └── LoadingSkeleton.jsx # Skeleton de carregamento
├── context/
│   └── AppContext.jsx          # Contexto global
├── data/
├── pages/
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── ForgotPassword.jsx
│   ├── agenda/
│   │   ├── Agenda.jsx
│   │   └── NovoAgendamento.jsx
│   ├── clients/
│   │   ├── Clients.jsx
│   │   ├── ClientProfile.jsx
│   │   └── ClientForm.jsx
│   ├── barbers/
│   │   ├── Barbers.jsx
│   │   └── BarberForm.jsx
│   ├── services/
│   │   └── Services.jsx
│   ├── subscriptions/
│   │   ├── Plans.jsx
│   │   ├── Subscribers.jsx
│   │   ├── SubscriptionControl.jsx
│   │   └── SubscriptionPayments.jsx
│   ├── financial/
│   │   ├── Financial.jsx
│   │   └── CaixaDia.jsx
│   ├── products/
│   │   ├── Products.jsx
│   │   ├── Estoque.jsx
│   │   └── Comandas.jsx
│   ├── reports/
│   │   └── Reports.jsx
│   ├── whatsapp/
│   │   ├── WhatsApp.jsx
│   │   └── Campanhas.jsx
│   ├── settings/
│   │   └── Configuracoes.jsx
│   ├── Dashboard.jsx
│   ├── Notifications.jsx
│   ├── Support.jsx
│   └── SaasPlanos.jsx
├── App.jsx                     # Roteamento principal
└── main.jsx
```

---

## 🎨 Tecnologias

| Tecnologia | Uso |
|---|---|
| React 18 | Framework UI |
| Vite | Build tool |
| TailwindCSS 3 | Estilização |
| React Router v6 | Roteamento |
| Recharts | Gráficos |
| Lucide React | Ícones |

---

## 📋 Telas Implementadas

1. ✅ Login
2. ✅ Cadastro da barbearia (3 etapas)
3. ✅ Recuperar senha
4. ✅ Dashboard com gráficos e métricas
5. ✅ Agenda (timeline por hora + filtros)
6. ✅ Novo agendamento
7. ✅ Clientes (lista com filtros)
8. ✅ Cadastro/edição de cliente
9. ✅ Perfil do cliente
10. ✅ Barbeiros (cards)
11. ✅ Cadastro/edição de barbeiro
12. ✅ Serviços (CRUD completo)
13. ✅ Planos de assinatura
14. ✅ Clientes assinantes
15. ✅ Controle de assinaturas
16. ✅ Pagamentos de assinatura
17. ✅ Financeiro geral
18. ✅ Caixa do dia
19. ✅ Produtos
20. ✅ Estoque
21. ✅ Comandas / Vendas
22. ✅ Relatórios (4 períodos + gráficos)
23. ✅ Automação WhatsApp
24. ✅ Campanhas WhatsApp
25. ✅ Configurações (barbearia, horários, pagamentos, usuários)
26. ✅ Notificações
27. ✅ Suporte / FAQ
28. ✅ Planos do SaaS

---

## 🎯 Funcionalidades

- **Modo escuro premium** com paleta preta/cinza e detalhes dourados
- **100% responsivo** — sidebar no desktop, bottom nav no mobile
- **Dados reais** — todas as telas operacionais utilizam a UpBarber API
- **Toasts** de feedback em todas as ações
- **Modais** para criar/editar registros
- **Gráficos interativos** no dashboard e relatórios
- **Filtros e buscas** em todas as listagens
- **Automação WhatsApp** preparada para integração com provedor real
- **Sistema de assinaturas** completo com controle de inadimplência

---

*UpBarber — Sistema SaaS para barbearias modernas*
