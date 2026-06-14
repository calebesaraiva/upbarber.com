import { Search } from 'lucide-react';
export function SearchInput({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input className="input pl-9 max-w-xs" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
