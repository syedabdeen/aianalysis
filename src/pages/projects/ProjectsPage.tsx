import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProjects } from '@/hooks/useProjects';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModuleKPIDashboard, KPIItem } from '@/components/layout/ModuleKPIDashboard';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { Plus, FolderKanban, LayoutGrid, List, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { ProjectTypeBadge } from '@/components/projects/ProjectTypeBadge';
import { BudgetProgressBar } from '@/components/projects/BudgetProgressBar';
import type { ProjectStatus } from '@/types/project';

export default function ProjectsPage() {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const { data: projects, isLoading } = useProjects({
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    department_id: departmentId !== 'all' ? departmentId : undefined,
  });

  const kpiItems: KPIItem[] = [
    {
      title: 'Total Projects',
      titleAr: 'إجمالي المشاريع',
      value: projects?.length.toString() || '0',
      subtitle: 'All projects',
      subtitleAr: 'جميع المشاريع',
      icon: FolderKanban,
      color: 'primary',
    },
    {
      title: 'Active Projects',
      titleAr: 'المشاريع النشطة',
      value: projects?.filter(p => p.status === 'active').length.toString() || '0',
      subtitle: 'In progress',
      subtitleAr: 'قيد التنفيذ',
      icon: TrendingUp,
      trend: 'up',
      trendValue: '+3 this month',
      trendValueAr: '+3 هذا الشهر',
      color: 'success',
    },
    {
      title: 'On Hold',
      titleAr: 'في الانتظار',
      value: projects?.filter(p => p.status === 'on_hold').length.toString() || '0',
      subtitle: 'Pending action',
      subtitleAr: 'في انتظار إجراء',
      icon: Clock,
      color: 'warning',
    },
    {
      title: 'At Risk',
      titleAr: 'في خطر',
      value: projects?.filter(p => (p.budget_consumed / (p.revised_budget || p.original_budget)) > 0.9).length.toString() || '0',
      subtitle: 'Budget > 90%',
      subtitleAr: 'الميزانية > 90%',
      icon: AlertTriangle,
      color: 'danger',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Projects"
          titleAr="المشاريع"
          description="Manage projects and budgets"
          descriptionAr="إدارة المشاريع والميزانيات"
          icon={FolderKanban}
          actions={
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-border/50 rounded-lg p-1 bg-card/50">
                <Button
                  variant={view === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button asChild>
                <Link to="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {language === 'ar' ? 'مشروع جديد' : 'New Project'}
                </Link>
              </Button>
            </div>
          }
        />

        {/* KPI Dashboard */}
        <ModuleKPIDashboard items={kpiItems} />

        {/* Filters */}
        <ProjectFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          departmentId={departmentId}
          onDepartmentChange={setDepartmentId}
        />

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : projects?.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">
              {language === 'ar' ? 'لا توجد مشاريع' : 'No projects found'}
            </h3>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' ? 'ابدأ بإنشاء مشروع جديد' : 'Start by creating a new project'}
            </p>
            <Button className="mt-4" asChild>
              <Link to="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                {language === 'ar' ? 'إنشاء مشروع' : 'Create Project'}
              </Link>
            </Button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="border border-border/50 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-card/50">
                  <TableHead>{language === 'ar' ? 'الكود' : 'Code'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الميزانية' : 'Budget'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التقدم' : 'Progress'}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects?.map((project) => {
                  const budget = project.revised_budget > 0 ? project.revised_budget : project.original_budget;
                  return (
                    <TableRow key={project.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-sm">{project.code}</TableCell>
                      <TableCell className="font-medium">
                        {language === 'ar' ? project.name_ar : project.name_en}
                      </TableCell>
                      <TableCell>
                        <ProjectTypeBadge type={project.project_type} />
                      </TableCell>
                      <TableCell>
                        <ProjectStatusBadge status={project.status} />
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        <BudgetProgressBar
                          consumed={project.budget_consumed}
                          committed={project.budget_committed}
                          total={budget}
                          currency={project.currency}
                          showLabels={false}
                        />
                      </TableCell>
                      <TableCell>{project.progress_percentage}%</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/projects/${project.id}`}>
                            {language === 'ar' ? 'عرض' : 'View'}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
