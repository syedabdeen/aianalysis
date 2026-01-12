import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectTypeBadge } from './ProjectTypeBadge';
import { BudgetProgressBar } from './BudgetProgressBar';
import { Calendar, User, Eye, Edit, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import type { Project } from '@/types/project';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { language } = useLanguage();
  
  const formatDate = (date?: string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMM yyyy', { locale: language === 'ar' ? ar : undefined });
  };

  const initialBudget = project.original_budget;
  const currentBudget = project.revised_budget > 0 ? project.revised_budget : project.original_budget;
  const variationValue = currentBudget - initialBudget;

  return (
    <Card className="group transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{project.code}</span>
              <ProjectStatusBadge status={project.status} />
            </div>
            <h3 className="font-semibold leading-tight">
              {language === 'ar' ? project.name_ar : project.name_en}
            </h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/projects/${project.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {language === 'ar' ? 'عرض' : 'View'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/projects/${project.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <ProjectTypeBadge type={project.project_type} />
          {project.client_name && (
            <span className="text-xs text-muted-foreground truncate">
              {project.client_name}
            </span>
          )}
        </div>

        {/* Budget Info */}
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">
            {language === 'ar' ? 'القيمة الأولية' : 'Initial'}: {initialBudget.toLocaleString()} {project.currency}
          </span>
          {variationValue !== 0 && (
            <span className={variationValue > 0 ? 'text-green-600' : 'text-red-600'}>
              {variationValue > 0 ? '+' : ''}{variationValue.toLocaleString()} {project.currency}
            </span>
          )}
        </div>

        <BudgetProgressBar
          consumed={project.budget_consumed}
          committed={project.budget_committed}
          total={currentBudget}
          currency={project.currency}
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(project.start_date)} - {formatDate(project.end_date)}</span>
          </div>
          {project.manager && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{project.manager.full_name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">{language === 'ar' ? 'التقدم' : 'Progress'}: </span>
            <span className="font-medium">{project.progress_percentage}%</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/projects/${project.id}`}>
              {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
