import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search } from 'lucide-react';
import type { ProjectStatus } from '@/types/project';

interface ProjectFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: ProjectStatus | 'all';
  onStatusChange: (value: ProjectStatus | 'all') => void;
  departmentId: string;
  onDepartmentChange: (value: string) => void;
}

export function ProjectFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  departmentId,
  onDepartmentChange
}: ProjectFiltersProps) {
  const { language, t } = useLanguage();

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name_en');
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={language === 'ar' ? 'البحث عن مشاريع...' : 'Search projects...'}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <Select value={status} onValueChange={(v) => onStatusChange(v as ProjectStatus | 'all')}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
          <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
          <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
          <SelectItem value="on_hold">{language === 'ar' ? 'معلق' : 'On Hold'}</SelectItem>
          <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
          <SelectItem value="cancelled">{language === 'ar' ? 'ملغي' : 'Cancelled'}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={departmentId} onValueChange={onDepartmentChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder={language === 'ar' ? 'القسم' : 'Department'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{language === 'ar' ? 'جميع الأقسام' : 'All Departments'}</SelectItem>
          {departments?.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {language === 'ar' ? dept.name_ar : dept.name_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
