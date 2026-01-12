import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectFormData, Project } from '@/types/project';

const formSchema = z.object({
  name_en: z.string().min(1, 'Name (English) is required'),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  project_type: z.enum(['construction', 'maintenance', 'capex', 'service']),
  client_name: z.string().optional(),
  client_reference: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  original_budget: z.coerce.number().min(0, 'Budget must be positive'),
  currency: z.string().default('AED'),
  cost_center_id: z.string().optional(),
  department_id: z.string().optional(),
  manager_id: z.string().optional(),
});

interface ProjectFormProps {
  project?: Project;
  onSubmit: (data: ProjectFormData) => void;
  isLoading?: boolean;
}

export function ProjectForm({ project, onSubmit, isLoading }: ProjectFormProps) {
  const { language } = useLanguage();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name_en: project?.name_en || '',
      name_ar: project?.name_ar || '',
      description: project?.description || '',
      project_type: project?.project_type || 'construction',
      client_name: project?.client_name || '',
      client_reference: project?.client_reference || '',
      start_date: project?.start_date || '',
      end_date: project?.end_date || '',
      original_budget: project?.original_budget || 0,
      currency: project?.currency || 'AED',
      cost_center_id: project?.cost_center_id || '',
      department_id: project?.department_id || '',
      manager_id: project?.manager_id || '',
    }
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: costCenters } = useQuery({
    queryKey: ['cost-centers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cost_centers').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: users } = useQuery({
    queryKey: ['users-managers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email');
      if (error) throw error;
      return data;
    }
  });

  const handleSubmit = (data: ProjectFormData) => {
    // Clean up empty strings to undefined and auto-fill Arabic from English
    const cleanData = {
      ...data,
      name_ar: data.name_ar || data.name_en, // Auto-fill Arabic from English
      cost_center_id: data.cost_center_id || undefined,
      department_id: data.department_id || undefined,
      manager_id: data.manager_id || undefined,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
    };
    onSubmit(cleanData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'اسم المشروع (إنجليزي)' : 'Project Name (English)'}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'اسم المشروع (عربي)' : 'Project Name (Arabic)'}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="rtl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="project_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'نوع المشروع' : 'Project Type'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="construction">{language === 'ar' ? 'إنشاءات' : 'Construction'}</SelectItem>
                      <SelectItem value="maintenance">{language === 'ar' ? 'صيانة' : 'Maintenance'}</SelectItem>
                      <SelectItem value="capex">{language === 'ar' ? 'رأس المال' : 'CAPEX'}</SelectItem>
                      <SelectItem value="service">{language === 'ar' ? 'خدمات' : 'Service'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'القسم' : 'Department'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر القسم' : 'Select department'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {language === 'ar' ? dept.name_ar : dept.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{language === 'ar' ? 'الوصف' : 'Description'}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'معلومات العميل' : 'Client Information'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'اسم العميل' : 'Client Name'}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="client_reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'مرجع العميل' : 'Client Reference'}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Budget & Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'الميزانية والجدول الزمني' : 'Budget & Timeline'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="original_budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'الميزانية' : 'Budget'}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.01} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'العملة' : 'Currency'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cost_center_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'مركز التكلفة' : 'Cost Center'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر مركز التكلفة' : 'Select cost center'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {costCenters?.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {language === 'ar' ? cc.name_ar : cc.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="manager_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'مدير المشروع' : 'Project Manager'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر المدير' : 'Select manager'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'تاريخ البدء' : 'Start Date'}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading 
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
              : (project ? (language === 'ar' ? 'تحديث المشروع' : 'Update Project') : (language === 'ar' ? 'إنشاء المشروع' : 'Create Project'))
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
