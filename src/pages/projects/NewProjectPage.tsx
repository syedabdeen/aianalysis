import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateProject } from '@/hooks/useProjects';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FolderPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NewProjectPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const handleSubmit = async (data: any) => {
    const project = await createProject.mutateAsync(data);
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/projects">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FolderPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'ar' ? 'مشروع جديد' : 'New Project'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'إنشاء مشروع جديد' : 'Create a new project'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <ProjectForm onSubmit={handleSubmit} isLoading={createProject.isPending} />
    </div>
  );
}
