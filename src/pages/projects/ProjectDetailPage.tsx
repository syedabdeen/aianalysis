import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { ProjectTypeBadge } from '@/components/projects/ProjectTypeBadge';
import { BudgetSummaryCard } from '@/components/projects/BudgetSummaryCard';
import { MilestoneList } from '@/components/projects/MilestoneList';
import { VariationList } from '@/components/projects/VariationList';
import { ProjectAlertsWidget } from '@/components/projects/ProjectAlertsWidget';
import { ProjectTeamSection } from '@/components/projects/ProjectTeamSection';
import { Edit, Calendar, User, Building2, FolderKanban, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { ProjectStatus } from '@/types/project';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { data: project, isLoading } = useProject(id!);
  const updateProject = useUpdateProject();

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMM yyyy', { locale: language === 'ar' ? ar : undefined });
  };

  const handleStatusChange = async (status: ProjectStatus) => {
    await updateProject.mutateAsync({ id: id!, data: { status } });
  };

  const handleProgressChange = async (value: number[]) => {
    await updateProject.mutateAsync({ id: id!, data: { progress_percentage: value[0] } });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-40 lg:col-span-2" />
            <Skeleton className="h-40" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'المشروع غير موجود' : 'Project not found'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={language === 'ar' ? project.name_ar : project.name_en}
          titleAr={project.name_ar}
          description={`${project.code}${project.client_name ? ` • ${language === 'ar' ? 'العميل' : 'Client'}: ${project.client_name}` : ''}`}
          icon={FolderKanban}
          actions={
            <div className="flex items-center gap-2">
              <Select value={project.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
                  <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                  <SelectItem value="on_hold">{language === 'ar' ? 'معلق' : 'On Hold'}</SelectItem>
                  <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
                  <SelectItem value="cancelled">{language === 'ar' ? 'ملغي' : 'Cancelled'}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" asChild>
                <Link to={`/projects/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Link>
              </Button>
            </div>
          }
        />

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          <ProjectTypeBadge type={project.project_type} />
        </div>

      {/* Quick Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الجدول الزمني' : 'Timeline'}</p>
                <p className="text-sm font-medium">{formatDate(project.start_date)} - {formatDate(project.end_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <User className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'المدير' : 'Manager'}</p>
                <p className="text-sm font-medium">{project.manager?.full_name || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Building2 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'القسم' : 'Department'}</p>
                <p className="text-sm font-medium">
                  {project.department ? (language === 'ar' ? project.department.name_ar : project.department.name_en) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'التقدم' : 'Progress'}</p>
                <p className="text-sm font-medium">{project.progress_percentage}%</p>
              </div>
              <Slider
                value={[project.progress_percentage]}
                max={100}
                step={5}
                onValueCommit={handleProgressChange}
                className="cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="budget" className="space-y-4">
        <TabsList>
          <TabsTrigger value="budget">{language === 'ar' ? 'الميزانية' : 'Budget'}</TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            {language === 'ar' ? 'الفريق' : 'Team'}
          </TabsTrigger>
          <TabsTrigger value="milestones">{language === 'ar' ? 'المراحل' : 'Milestones'}</TabsTrigger>
          <TabsTrigger value="variations">{language === 'ar' ? 'التغييرات' : 'Variations'}</TabsTrigger>
          <TabsTrigger value="alerts">{language === 'ar' ? 'التنبيهات' : 'Alerts'}</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-4">
          <BudgetSummaryCard project={project} />
        </TabsContent>

        <TabsContent value="team">
          <ProjectTeamSection projectId={id!} />
        </TabsContent>

        <TabsContent value="milestones">
          <MilestoneList projectId={id!} />
        </TabsContent>

        <TabsContent value="variations">
          <VariationList projectId={id!} />
        </TabsContent>

        <TabsContent value="alerts">
          <ProjectAlertsWidget projectId={id!} />
        </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
