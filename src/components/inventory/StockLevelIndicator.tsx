import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Package, PackageX } from 'lucide-react';

interface StockLevelIndicatorProps {
  currentStock: number;
  minLevel: number;
  maxLevel?: number;
  unit: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StockLevelIndicator = forwardRef<HTMLDivElement, StockLevelIndicatorProps>(
  ({ currentStock, minLevel, maxLevel, unit, showLabel = true, size = 'md' }, ref) => {
    const getStockStatus = () => {
      if (currentStock <= 0) return 'out';
      if (currentStock <= minLevel) return 'low';
      if (maxLevel && currentStock > maxLevel) return 'overstock';
      return 'healthy';
    };

    const status = getStockStatus();

    const getProgressValue = () => {
      if (maxLevel) {
        return Math.min((currentStock / maxLevel) * 100, 100);
      }
      const reference = minLevel * 2 || 100;
      return Math.min((currentStock / reference) * 100, 100);
    };

    const statusConfig = {
      out: {
        color: 'text-destructive',
        bgColor: 'bg-destructive',
        label: 'Out of Stock',
        labelAr: 'نفد المخزون',
        icon: PackageX,
      },
      low: {
        color: 'text-orange-500',
        bgColor: 'bg-orange-500',
        label: 'Low Stock',
        labelAr: 'مخزون منخفض',
        icon: AlertTriangle,
      },
      healthy: {
        color: 'text-green-500',
        bgColor: 'bg-green-500',
        label: 'In Stock',
        labelAr: 'متوفر',
        icon: Package,
      },
      overstock: {
        color: 'text-blue-500',
        bgColor: 'bg-blue-500',
        label: 'Overstock',
        labelAr: 'مخزون زائد',
        icon: Package,
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };

    return (
      <div ref={ref} className="space-y-1">
        <div className={cn('flex items-center gap-2', sizeClasses[size])}>
          <Icon className={cn('h-4 w-4', config.color)} />
          <span className={cn('font-medium', config.color)}>
            {currentStock} {unit}
          </span>
          {showLabel && (
            <span className="text-muted-foreground">({config.label})</span>
          )}
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div 
            className={cn('h-full transition-all', config.bgColor)}
            style={{ width: `${getProgressValue()}%` }}
          />
        </div>
        {showLabel && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min: {minLevel}</span>
            {maxLevel && <span>Max: {maxLevel}</span>}
          </div>
        )}
      </div>
    );
  }
);

StockLevelIndicator.displayName = 'StockLevelIndicator';
