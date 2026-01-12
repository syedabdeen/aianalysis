import { Badge } from '@/components/ui/badge';
import { VendorStatus } from '@/types/vendor';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

interface VendorStatusBadgeProps {
  status: VendorStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<VendorStatus, {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: typeof CheckCircle;
  labelEn: string;
  labelAr: string;
  className: string;
}> = {
  pending: {
    variant: 'secondary',
    icon: Clock,
    labelEn: 'Pending',
    labelAr: 'معلق',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  approved: {
    variant: 'default',
    icon: CheckCircle,
    labelEn: 'Approved',
    labelAr: 'معتمد',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  suspended: {
    variant: 'outline',
    icon: AlertTriangle,
    labelEn: 'Suspended',
    labelAr: 'موقوف',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  blacklisted: {
    variant: 'destructive',
    icon: XCircle,
    labelEn: 'Blacklisted',
    labelAr: 'محظور',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

export function VendorStatusBadge({ status, size = 'md' }: VendorStatusBadgeProps) {
  const { language } = useLanguage();
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'px-3 py-1'} inline-flex items-center gap-1.5`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {language === 'ar' ? config.labelAr : config.labelEn}
    </Badge>
  );
}
