import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VendorRatingDisplayProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export function VendorRatingDisplay({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = true,
}: VendorRatingDisplayProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }).map((_, index) => {
        const isFilled = index < Math.floor(rating);
        const isPartial = index === Math.floor(rating) && rating % 1 !== 0;

        return (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              'transition-colors',
              isFilled
                ? 'fill-amber-400 text-amber-400'
                : isPartial
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-muted text-muted-foreground'
            )}
          />
        );
      })}
      {showValue && (
        <span className={cn('text-muted-foreground ms-1', textSizeClasses[size])}>
          ({rating.toFixed(1)})
        </span>
      )}
    </div>
  );
}
