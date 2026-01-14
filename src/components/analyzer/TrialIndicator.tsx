import { Clock } from 'lucide-react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function TrialIndicator() {
  const { getTrialDaysRemaining } = useSimpleAuth();
  const { language } = useLanguage();
  
  const daysRemaining = getTrialDaysRemaining();
  
  if (daysRemaining === null) return null;
  
  // Determine styling based on days remaining
  const getIndicatorStyle = () => {
    if (daysRemaining >= 5) {
      return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    } else if (daysRemaining >= 2) {
      return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
    } else {
      return 'bg-destructive/10 border-destructive/20 text-destructive';
    }
  };
  
  const getIconStyle = () => {
    if (daysRemaining >= 5) {
      return 'text-emerald-500';
    } else if (daysRemaining >= 2) {
      return 'text-amber-500';
    } else {
      return 'text-destructive';
    }
  };

  const dayText = daysRemaining === 1 
    ? (language === 'ar' ? 'يوم متبقي' : 'day left')
    : (language === 'ar' ? 'أيام متبقية' : 'days left');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm font-medium cursor-default transition-colors',
              getIndicatorStyle()
            )}
          >
            <Clock className={cn('w-3.5 h-3.5', getIconStyle())} />
            <span>
              {daysRemaining} {dayText}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {language === 'ar' 
              ? 'الفترة التجريبية المجانية' 
              : 'Free trial period'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}