import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProjectStatus } from '@/types/project';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

const statusConfig: Record<ProjectStatus, { labelEn: string; labelAr: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { labelEn: 'Draft', labelAr: 'مسودة', variant: 'outline' },
  active: { labelEn: 'Active', labelAr: 'نشط', variant: 'default' },
  on_hold: { labelEn: 'On Hold', labelAr: 'معلق', variant: 'secondary' },
  completed: { labelEn: 'Completed', labelAr: 'مكتمل', variant: 'default' },
  cancelled: { labelEn: 'Cancelled', labelAr: 'ملغي', variant: 'destructive' }
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const { language } = useLanguage();
  const config = statusConfig[status];

  return (
    <Badge 
      variant={config.variant}
      className={status === 'active' ? 'bg-green-600 hover:bg-green-700' : status === 'completed' ? 'bg-blue-600 hover:bg-blue-700' : ''}
    >
      {language === 'ar' ? config.labelAr : config.labelEn}
    </Badge>
  );
}
