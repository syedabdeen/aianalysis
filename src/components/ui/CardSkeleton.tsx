import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  className?: string;
}

export const KPICardSkeleton = ({ className }: CardSkeletonProps) => (
  <div className={cn("p-6 rounded-xl border bg-card", className)}>
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <Skeleton className="h-8 w-32 mb-2" />
    <Skeleton className="h-3 w-20" />
  </div>
);

export const TableRowSkeleton = () => (
  <div className="flex items-center gap-4 p-4 border-b">
    <Skeleton className="h-4 w-4" />
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-4 flex-1" />
    <Skeleton className="h-6 w-16 rounded-full" />
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-8 w-8 rounded" />
  </div>
);

export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <TableRowSkeleton key={i} />
    ))}
  </div>
);

export const ChartSkeleton = ({ className }: CardSkeletonProps) => (
  <div className={cn("p-6 rounded-xl border bg-card", className)}>
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-24 rounded" />
    </div>
    <div className="flex items-end gap-2 h-48">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-t"
          style={{ height: `${Math.random() * 60 + 40}%` }}
        />
      ))}
    </div>
  </div>
);

export const ProjectCardSkeleton = () => (
  <div className="p-6 rounded-xl border bg-card space-y-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
    <Skeleton className="h-2 w-full rounded-full" />
    <div className="flex gap-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-24" />
    </div>
  </div>
);

export const VendorCardSkeleton = () => (
  <div className="p-6 rounded-xl border bg-card space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
    </div>
  </div>
);
