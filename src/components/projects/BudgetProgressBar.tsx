import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface BudgetProgressBarProps {
  consumed: number;
  committed: number;
  total: number;
  currency?: string;
  showLabels?: boolean;
}

export function BudgetProgressBar({ consumed, committed, total, currency = 'AED', showLabels = true }: BudgetProgressBarProps) {
  const { language } = useLanguage();
  
  const consumedPercentage = total > 0 ? (consumed / total) * 100 : 0;
  const committedPercentage = total > 0 ? (committed / total) * 100 : 0;
  const totalUsed = consumedPercentage + committedPercentage;

  const getColor = () => {
    if (totalUsed >= 100) return 'bg-destructive';
    if (totalUsed >= 90) return 'bg-orange-500';
    if (totalUsed >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-2">
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        {/* Consumed (darker) */}
        <div 
          className={cn("absolute h-full transition-all", getColor())}
          style={{ width: `${Math.min(consumedPercentage, 100)}%` }}
        />
        {/* Committed (lighter) */}
        <div 
          className={cn("absolute h-full transition-all opacity-50", getColor())}
          style={{ 
            left: `${Math.min(consumedPercentage, 100)}%`,
            width: `${Math.min(committedPercentage, 100 - consumedPercentage)}%` 
          }}
        />
      </div>
      
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <div className="flex gap-4">
            <span>
              {language === 'ar' ? 'مصروف' : 'Consumed'}: {formatAmount(consumed)}
            </span>
            <span>
              {language === 'ar' ? 'ملتزم' : 'Committed'}: {formatAmount(committed)}
            </span>
          </div>
          <span>
            {language === 'ar' ? 'الميزانية' : 'Budget'}: {formatAmount(total)}
          </span>
        </div>
      )}
    </div>
  );
}
