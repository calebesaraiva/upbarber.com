import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { ToastContainer } from '../ui/Toast';
import { SaasPaymentGate } from '../billing/SaasPaymentGate';
import { COMPANY_LEGAL_LINE } from '../../constants/company';

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-dark flex">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
        <Header />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-x-hidden">
          {children}
          <footer className="mt-8 pt-4 border-t border-dark-400 text-[11px] text-gray-600">
            {COMPANY_LEGAL_LINE}
          </footer>
        </main>
      </div>
      <BottomNavigation />
      <SaasPaymentGate />
      <ToastContainer />
    </div>
  );
}
