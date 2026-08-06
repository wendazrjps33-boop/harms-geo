import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

export function SkeletonLine({ className }: SkeletonProps) {
  return <div className={cn('h-4 bg-gray-100 rounded animate-pulse', className)} />;
}

export function SkeletonCircle({ className }: SkeletonProps) {
  return <div className={cn('bg-gray-100 rounded-full animate-pulse', className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-white border border-gray-100 rounded-xl p-5 space-y-3', className)}>
      <SkeletonLine className="w-1/3 h-5" />
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-2/3" />
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export default function Skeleton({ count = 3, className }: SkeletonListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
