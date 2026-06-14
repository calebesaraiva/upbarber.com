export function Skeleton({ className = '' }) {
  return <div className={`bg-dark-300 animate-pulse rounded-lg ${className}`} />;
}
export function CardSkeleton() {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}
