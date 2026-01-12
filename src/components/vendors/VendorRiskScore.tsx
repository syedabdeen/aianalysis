import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Shield, ShieldAlert, ShieldX } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface VendorRiskScoreProps {
  score: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const VendorRiskScore = forwardRef<HTMLDivElement, VendorRiskScoreProps>(
  ({ score, size = 'md', showLabel = true }, ref) => {
    const { language } = useLanguage();

    const getRiskLevel = (score: number) => {
      if (score <= 30) return { 
        level: 'low', 
        labelEn: 'Low Risk', 
        labelAr: 'مخاطر منخفضة',
        icon: Shield,
        className: 'text-emerald-600 dark:text-emerald-400',
        bgClassName: 'bg-emerald-100 dark:bg-emerald-900/30',
      };
      if (score <= 60) return { 
        level: 'medium', 
        labelEn: 'Medium Risk', 
        labelAr: 'مخاطر متوسطة',
        icon: ShieldAlert,
        className: 'text-amber-600 dark:text-amber-400',
        bgClassName: 'bg-amber-100 dark:bg-amber-900/30',
      };
      return { 
        level: 'high', 
        labelEn: 'High Risk', 
        labelAr: 'مخاطر عالية',
        icon: ShieldX,
        className: 'text-red-600 dark:text-red-400',
        bgClassName: 'bg-red-100 dark:bg-red-900/30',
      };
    };

    const risk = getRiskLevel(score);
    const Icon = risk.icon;

    const sizeClasses = {
      sm: {
        container: 'px-2 py-1 text-xs',
        icon: 'h-3 w-3',
      },
      md: {
        container: 'px-3 py-1.5 text-sm',
        icon: 'h-4 w-4',
      },
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-medium',
          risk.bgClassName,
          risk.className,
          sizeClasses[size].container
        )}
      >
        <Icon className={sizeClasses[size].icon} />
        {showLabel && (
          <span>{language === 'ar' ? risk.labelAr : risk.labelEn}</span>
        )}
        <span className="font-bold">({score})</span>
      </div>
    );
  }
);

VendorRiskScore.displayName = 'VendorRiskScore';
