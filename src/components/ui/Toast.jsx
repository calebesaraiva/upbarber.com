import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ToastContainer() {
  const { toasts } = useApp();
  const icons = { success: CheckCircle, error: XCircle, warning: AlertCircle, info: Info };
  const colors = { success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', error: 'text-red-400 bg-red-500/10 border-red-500/20', warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', info: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => {
        const Icon = icons[toast.type] || Info;
        return (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md bg-dark-200/90 border-dark-400 shadow-2xl text-sm font-medium text-white pointer-events-auto animate-in slide-in-from-right`}>
            <Icon size={16} className={colors[toast.type]?.split(' ')[0]} />
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
