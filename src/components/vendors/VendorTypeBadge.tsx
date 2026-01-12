import { Badge } from '@/components/ui/badge';
import { VendorType } from '@/types/vendor';
import { useLanguage } from '@/contexts/LanguageContext';
import { Package, Wrench, HardHat } from 'lucide-react';

interface VendorTypeBadgeProps {
  type: VendorType;
}

const typeConfig: Record<VendorType, {
  icon: typeof Package;
  labelEn: string;
  labelAr: string;
  className: string;
}> = {
  material: {
    icon: Package,
    labelEn: 'Material',
    labelAr: 'مواد',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  service: {
    icon: Wrench,
    labelEn: 'Service',
    labelAr: 'خدمات',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  subcontractor: {
    icon: HardHat,
    labelEn: 'Subcontractor',
    labelAr: 'مقاول باطن',
    className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
};

export function VendorTypeBadge({ type }: VendorTypeBadgeProps) {
  const { language } = useLanguage();
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} inline-flex items-center gap-1.5`}>
      <Icon className="h-3.5 w-3.5" />
      {language === 'ar' ? config.labelAr : config.labelEn}
    </Badge>
  );
}
