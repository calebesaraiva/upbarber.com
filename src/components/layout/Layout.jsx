import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { ToastContainer } from '../ui/Toast';

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-dark flex">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
        <Header />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>
      <BottomNavigation />
      <ToastContainer />
    </div>
  );
}
