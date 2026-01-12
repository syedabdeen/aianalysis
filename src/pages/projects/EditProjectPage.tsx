import { useNavigate, useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit } from 'lucide-react';

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id!);
  const updateProject = useUpdateProject();

  const handleSubmit = async (data: any) => {
    await updateProject.mutateAsync({ id: id!, data });
    navigate(`/projects/${id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {language === 'ar' ? 'المشروع غير موجود' : 'Project not found'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/projects/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Edit className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'ar' ? 'تعديل المشروع' : 'Edit Project'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {project.code} - {language === 'ar' ? project.name_ar : project.name_en}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <ProjectForm project={project} onSubmit={handleSubmit} isLoading={updateProject.isPending} />
    </div>
  );
}
