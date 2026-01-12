import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProcurementStatus } from '@/types/procurement';

interface ProcurementStatusBadgeProps {
  status: ProcurementStatus;
}

const statusConfig: Record<ProcurementStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; labelEn: string; labelAr: string }> = {
  draft: { variant: 'secondary', labelEn: 'Draft', labelAr: 'مسودة' },
  submitted: { variant: 'default', labelEn: 'Submitted', labelAr: 'مقدم' },
  under_review: { variant: 'outline', labelEn: 'Under Review', labelAr: 'قيد المراجعة' },
  approved: { variant: 'default', labelEn: 'Approved', labelAr: 'موافق عليه' },
  rejected: { variant: 'destructive', labelEn: 'Rejected', labelAr: 'مرفوض' },
  cancelled: { variant: 'destructive', labelEn: 'Cancelled', labelAr: 'ملغي' },
  completed: { variant: 'default', labelEn: 'Completed', labelAr: 'مكتمل' },
};

export const ProcurementStatusBadge: React.FC<ProcurementStatusBadgeProps> = ({ status }) => {
  const { language } = useLanguage();
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge variant={config.variant} className={
      status === 'approved' || status === 'completed' 
        ? 'bg-green-500/10 text-green-600 border-green-500/20' 
        : status === 'submitted' || status === 'under_review'
        ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
        : ''
    }>
      {language === 'ar' ? config.labelAr : config.labelEn}
    </Badge>
  );
};
