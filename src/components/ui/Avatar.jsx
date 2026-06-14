export function Avatar({ name, size = 'md', color }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };
  const initials = name?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || '??';
  const bg = color || '#C9A84C';
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0`} style={{ backgroundColor: bg + '22', color: bg }}>
      {initials}
    </div>
  );
}
