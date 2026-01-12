import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProjectMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Check, Calendar, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { ProjectMilestone, MilestoneFormData, MilestoneStatus } from '@/types/project';

interface MilestoneListProps {
  projectId: string;
}

const statusColors: Record<MilestoneStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  delayed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusLabels: Record<MilestoneStatus, { en: string; ar: string }> = {
  pending: { en: 'Pending', ar: 'معلق' },
  in_progress: { en: 'In Progress', ar: 'قيد التنفيذ' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  delayed: { en: 'Delayed', ar: 'متأخر' },
};

export function MilestoneList({ projectId }: MilestoneListProps) {
  const { language } = useLanguage();
  const { data: milestones, isLoading } = useProjectMilestones(projectId);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();
  
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<MilestoneFormData>({
    name_en: '',
    name_ar: '',
    description: '',
    due_date: '',
    weight_percentage: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMilestone.mutateAsync({ projectId, data: formData });
    setIsOpen(false);
    setFormData({ name_en: '', name_ar: '', description: '', due_date: '', weight_percentage: 0 });
  };

  const handleComplete = async (milestone: ProjectMilestone) => {
    await updateMilestone.mutateAsync({
      id: milestone.id,
      data: {
        status: 'completed',
        completed_date: new Date().toISOString().split('T')[0],
      }
    });
  };

  const handleDelete = async (milestone: ProjectMilestone) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) {
      await deleteMilestone.mutateAsync({ id: milestone.id, projectId });
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: language === 'ar' ? ar : undefined });
  };

  if (isLoading) {
    return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{language === 'ar' ? 'المراحل' : 'Milestones'}</CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {language === 'ar' ? 'إضافة مرحلة' : 'Add Milestone'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'إضافة مرحلة جديدة' : 'Add New Milestone'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                  <Input
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                  <Input
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    required
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الوزن (%)' : 'Weight (%)'}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.weight_percentage}
                    onChange={(e) => setFormData({ ...formData, weight_percentage: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={createMilestone.isPending}>
                  {language === 'ar' ? 'إضافة' : 'Add'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {milestones?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {language === 'ar' ? 'لا توجد مراحل' : 'No milestones yet'}
          </p>
        ) : (
          <div className="space-y-3">
            {milestones?.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    milestone.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-muted'
                  }`}>
                    {milestone.status === 'completed' ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{milestone.weight_percentage}%</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {language === 'ar' ? milestone.name_ar : milestone.name_en}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(milestone.due_date)}</span>
                      <Badge variant="outline" className={statusColors[milestone.status]}>
                        {language === 'ar' ? statusLabels[milestone.status].ar : statusLabels[milestone.status].en}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {milestone.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleComplete(milestone)}
                      disabled={updateMilestone.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(milestone)}
                    disabled={deleteMilestone.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
