import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProcurementType } from '@/types/procurement';
import { Package, Wrench, HardHat } from 'lucide-react';

interface ProcurementTypeBadgeProps {
  type: ProcurementType;
}

const typeConfig: Record<ProcurementType, { icon: React.ElementType; labelEn: string; labelAr: string; className: string }> = {
  material: { icon: Package, labelEn: 'Material', labelAr: 'مواد', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  service: { icon: Wrench, labelEn: 'Service', labelAr: 'خدمة', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  subcontract: { icon: HardHat, labelEn: 'Subcontract', labelAr: 'مقاولة من الباطن', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
};

export const ProcurementTypeBadge: React.FC<ProcurementTypeBadgeProps> = ({ type }) => {
  const { language } = useLanguage();
  const config = typeConfig[type] || typeConfig.material;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {language === 'ar' ? config.labelAr : config.labelEn}
    </Badge>
  );
};
