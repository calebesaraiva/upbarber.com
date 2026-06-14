import { Scissors } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-dark flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Scissors size={28} className="text-gold"/>
        </div>
        <p className="text-white font-semibold">UpBarber</p>
        <p className="text-gray-500 text-sm mt-1">Carregando...</p>
      </div>
    </div>
  );
}
