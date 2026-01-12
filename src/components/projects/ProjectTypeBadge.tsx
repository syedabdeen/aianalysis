import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProjectType } from '@/types/project';
import { Building2, Wrench, TrendingUp, Briefcase } from 'lucide-react';

interface ProjectTypeBadgeProps {
  type: ProjectType;
}

const typeConfig: Record<ProjectType, { labelEn: string; labelAr: string; icon: React.ElementType; color: string }> = {
  construction: { labelEn: 'Construction', labelAr: 'إنشاءات', icon: Building2, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  maintenance: { labelEn: 'Maintenance', labelAr: 'صيانة', icon: Wrench, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  capex: { labelEn: 'CAPEX', labelAr: 'رأس المال', icon: TrendingUp, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  service: { labelEn: 'Service', labelAr: 'خدمات', icon: Briefcase, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
};

export function ProjectTypeBadge({ type }: ProjectTypeBadgeProps) {
  const { language } = useLanguage();
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${config.color}`}>
      <Icon className="h-3 w-3" />
      {language === 'ar' ? config.labelAr : config.labelEn}
    </Badge>
  );
}
