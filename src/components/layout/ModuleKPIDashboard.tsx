import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KPIItem {
  title: string;
  titleAr: string;
  value: string | number;
  subtitle?: string;
  subtitleAr?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendValueAr?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

interface ModuleKPIDashboardProps {
  items: KPIItem[];
  className?: string;
}

const colorMap = {
  primary: {
    bg: 'from-primary/20 to-primary/5',
    border: 'border-primary/30',
    icon: 'text-primary',
    glow: 'shadow-primary/20',
  },
  success: {
    bg: 'from-green-500/20 to-green-500/5',
    border: 'border-green-500/30',
    icon: 'text-green-500',
    glow: 'shadow-green-500/20',
  },
  warning: {
    bg: 'from-yellow-500/20 to-yellow-500/5',
    border: 'border-yellow-500/30',
    icon: 'text-yellow-500',
    glow: 'shadow-yellow-500/20',
  },
  danger: {
    bg: 'from-red-500/20 to-red-500/5',
    border: 'border-red-500/30',
    icon: 'text-red-500',
    glow: 'shadow-red-500/20',
  },
  info: {
    bg: 'from-blue-400/20 to-blue-400/5',
    border: 'border-blue-400/30',
    icon: 'text-blue-400',
    glow: 'shadow-blue-400/20',
  },
};

export const ModuleKPIDashboard: React.FC<ModuleKPIDashboardProps> = ({
  items,
  className,
}) => {
  const { language } = useLanguage();

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {items.map((item, index) => {
        const colors = colorMap[item.color || 'primary'];
        const Icon = item.icon;
        
        return (
          <Card
            key={index}
            className={cn(
              'relative overflow-hidden border bg-gradient-to-br transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default group',
              colors.bg,
              colors.border,
              colors.glow
            )}
          >
            {/* Decorative glow effect */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    {language === 'ar' ? item.titleAr : item.title}
                  </p>
                  <p className="text-2xl font-bold mt-1 tracking-tight">
                    {item.value}
                  </p>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {language === 'ar' ? item.subtitleAr : item.subtitle}
                    </p>
                  )}
                  {item.trend && item.trendValue && (
                    <div className={cn('flex items-center gap-1 mt-2 text-xs', getTrendColor(item.trend))}>
                      {getTrendIcon(item.trend)}
                      <span>{language === 'ar' ? item.trendValueAr : item.trendValue}</span>
                    </div>
                  )}
                </div>
                <div className={cn(
                  'p-2 rounded-lg bg-background/50 border',
                  colors.border
                )}>
                  <Icon className={cn('h-5 w-5', colors.icon)} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
