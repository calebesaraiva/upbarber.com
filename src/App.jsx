import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { Layout } from './components/layout/Layout';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Main
import Dashboard from './pages/Dashboard';

// Agenda
import Agenda from './pages/agenda/Agenda';
import NovoAgendamento from './pages/agenda/NovoAgendamento';

// Clients
import Clients from './pages/clients/Clients';
import ClientProfile from './pages/clients/ClientProfile';
import ClientForm from './pages/clients/ClientForm';

// Barbers
import Barbers from './pages/barbers/Barbers';
import BarberForm from './pages/barbers/BarberForm';

// Services
import Services from './pages/services/Services';

// Subscriptions
import Plans from './pages/subscriptions/Plans';
import Subscribers from './pages/subscriptions/Subscribers';
import SubscriptionControl from './pages/subscriptions/SubscriptionControl';

// Financial
import Financial from './pages/financial/Financial';
import CaixaDia from './pages/financial/CaixaDia';

// Products
import Products from './pages/products/Products';
import Estoque from './pages/products/Estoque';
import Comandas from './pages/products/Comandas';

// Reports
import Reports from './pages/reports/Reports';

// WhatsApp
import WhatsApp from './pages/whatsapp/WhatsApp';
import Campanhas from './pages/whatsapp/Campanhas';

// Settings & other
import Configuracoes from './pages/settings/Configuracoes';
import Notifications from './pages/Notifications';
import Support from './pages/Support';
import SaasPlanos from './pages/SaasPlanos';
import SubscriptionPayments from './pages/subscriptions/SubscriptionPayments';
import MasterRoute from './pages/master/MasterRoute';
import { useAuth } from './context/AuthContext';
import { canAccessPath, homeForRole } from './utils/access';

function AppLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessPath(user.role, location.pathname)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BranchProvider>
          <AppProvider>
            <Routes>
              <Route path="/master/*" element={<MasterRoute />} />

              {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/recuperar-senha" element={<ForgotPassword />} />

          {/* App */}
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />

          <Route path="/agenda" element={<AppLayout><Agenda /></AppLayout>} />
          <Route path="/agenda/novo" element={<AppLayout><NovoAgendamento /></AppLayout>} />

          <Route path="/clientes" element={<AppLayout><Clients /></AppLayout>} />
          <Route path="/clientes/novo" element={<AppLayout><ClientForm /></AppLayout>} />
          <Route path="/clientes/:id" element={<AppLayout><ClientProfile /></AppLayout>} />
          <Route path="/clientes/:id/editar" element={<AppLayout><ClientForm /></AppLayout>} />

          <Route path="/barbeiros" element={<AppLayout><Barbers /></AppLayout>} />
          <Route path="/barbeiros/novo" element={<AppLayout><BarberForm /></AppLayout>} />
          <Route path="/barbeiros/:id" element={<AppLayout><BarberForm /></AppLayout>} />

          <Route path="/servicos" element={<AppLayout><Services /></AppLayout>} />

          <Route path="/planos" element={<AppLayout><Plans /></AppLayout>} />
          <Route path="/assinantes" element={<AppLayout><Subscribers /></AppLayout>} />
          <Route path="/assinaturas" element={<AppLayout><SubscriptionControl /></AppLayout>} />
          <Route path="/pagamentos-assinatura" element={<AppLayout><SubscriptionPayments /></AppLayout>} />

          <Route path="/financeiro" element={<AppLayout><Financial /></AppLayout>} />
          <Route path="/caixa" element={<AppLayout><CaixaDia /></AppLayout>} />

          <Route path="/produtos" element={<AppLayout><Products /></AppLayout>} />
          <Route path="/estoque" element={<AppLayout><Estoque /></AppLayout>} />
          <Route path="/comandas" element={<AppLayout><Comandas /></AppLayout>} />

          <Route path="/relatorios" element={<AppLayout><Reports /></AppLayout>} />

          <Route path="/whatsapp" element={<AppLayout><WhatsApp /></AppLayout>} />
          <Route path="/campanhas" element={<AppLayout><Campanhas /></AppLayout>} />

          <Route path="/configuracoes" element={<AppLayout><Configuracoes /></AppLayout>} />
          <Route path="/notificacoes" element={<AppLayout><Notifications /></AppLayout>} />
          <Route path="/suporte" element={<AppLayout><Support /></AppLayout>} />
          <Route path="/saas-planos" element={<AppLayout><SaasPlanos /></AppLayout>} />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AppProvider>
        </BranchProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
