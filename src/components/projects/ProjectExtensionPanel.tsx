import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUpdateProject } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Project } from '@/types/project';

interface ProjectExtensionPanelProps {
  project: Project;
}

export function ProjectExtensionPanel({ project }: ProjectExtensionPanelProps) {
  const { language } = useLanguage();
  const updateProject = useUpdateProject();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    new_start_date: project.start_date || '',
    new_end_date: project.end_date || '',
    extension_reason: '',
  });

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMM yyyy', { locale: language === 'ar' ? ar : undefined });
  };

  const calculateExtension = () => {
    if (!project.end_date || !formData.new_end_date) return 0;
    return differenceInDays(new Date(formData.new_end_date), new Date(project.end_date));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await updateProject.mutateAsync({
      id: project.id,
      data: {
        // Store original dates if not already stored
        initial_start_date: project.initial_start_date || project.start_date,
        initial_end_date: project.initial_end_date || project.end_date,
        // Set new dates
        start_date: formData.new_start_date || undefined,
        end_date: formData.new_end_date || undefined,
        extension_reason: formData.extension_reason || undefined,
        extended_at: new Date().toISOString(),
      } as any,
    });
    
    setIsOpen(false);
  };

  const extensionDays = calculateExtension();
  const initialStartDate = (project as any).initial_start_date || project.start_date;
  const initialEndDate = (project as any).initial_end_date || project.end_date;
  const hasExtension = (project as any).extended_at || 
    (initialEndDate && project.end_date && initialEndDate !== project.end_date);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {language === 'ar' ? 'الجدول الزمني للمشروع' : 'Project Timeline'}
        </CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'تمديد' : 'Extend'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'تمديد مدة المشروع' : 'Extend Project Duration'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تاريخ البداية الجديد' : 'New Start Date'}</Label>
                  <Input
                    type="date"
                    value={formData.new_start_date}
                    onChange={(e) => setFormData({ ...formData, new_start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تاريخ الانتهاء الجديد' : 'New End Date'}</Label>
                  <Input
                    type="date"
                    value={formData.new_end_date}
                    onChange={(e) => setFormData({ ...formData, new_end_date: e.target.value })}
                  />
                </div>
              </div>
              
              {extensionDays !== 0 && (
                <div className={`p-3 rounded-lg ${extensionDays > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                  <p className="text-sm font-medium">
                    {extensionDays > 0 
                      ? (language === 'ar' ? `تمديد ${extensionDays} يوم` : `Extension: ${extensionDays} days`)
                      : (language === 'ar' ? `تقليص ${Math.abs(extensionDays)} يوم` : `Reduced by: ${Math.abs(extensionDays)} days`)
                    }
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'سبب التمديد' : 'Reason for Extension'} *</Label>
                <Textarea
                  value={formData.extension_reason}
                  onChange={(e) => setFormData({ ...formData, extension_reason: e.target.value })}
                  placeholder={language === 'ar' ? 'اذكر سبب تمديد المشروع' : 'Provide reason for the extension'}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={updateProject.isPending}>
                  {language === 'ar' ? 'تأكيد التمديد' : 'Confirm Extension'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Initial Timeline */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            {language === 'ar' ? 'الجدول الزمني الأصلي' : 'Initial Timeline'}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span>{formatDate(initialStartDate)}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(initialEndDate)}</span>
          </div>
        </div>

        {/* Revised Timeline (if extended) */}
        {hasExtension && (
          <>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                {language === 'ar' ? 'الجدول الزمني المعدل' : 'Revised Timeline'}
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <span>{formatDate(project.start_date)}</span>
                <ArrowRight className="h-4 w-4" />
                <span>{formatDate(project.end_date)}</span>
              </div>
            </div>

            {/* Extension Summary */}
            {initialEndDate && project.end_date && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {language === 'ar' 
                    ? `إجمالي التمديد: ${differenceInDays(new Date(project.end_date), new Date(initialEndDate))} يوم`
                    : `Total Extension: ${differenceInDays(new Date(project.end_date), new Date(initialEndDate))} days`
                  }
                </p>
              </div>
            )}
          </>
        )}

        {/* Extension Reason */}
        {(project as any).extension_reason && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">{language === 'ar' ? 'السبب' : 'Reason'}:</p>
            <p>{(project as any).extension_reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
