import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAddApprovalRole, useEditApprovalRole } from '@/hooks/useApprovalMatrix';
import { ApprovalRole } from '@/types/approval';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const roleSchema = z.object({
  name_en: z.string().min(2, 'Name is required'),
  name_ar: z.string().optional(),
  code: z.string().min(2, 'Code is required').regex(/^[A-Z_]+$/, 'Code must be uppercase letters and underscores'),
  description: z.string().optional(),
  hierarchy_level: z.coerce.number().min(1).max(10),
  is_active: z.boolean(),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface ApprovalRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: ApprovalRole | null;
}

export const ApprovalRoleDialog: React.FC<ApprovalRoleDialogProps> = ({
  open,
  onOpenChange,
  role,
}) => {
  const { language } = useLanguage();
  const addRole = useAddApprovalRole();
  const editRole = useEditApprovalRole();
  const isEditing = !!role;

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name_en: role?.name_en || '',
      name_ar: role?.name_ar || '',
      code: role?.code || '',
      description: role?.description || '',
      hierarchy_level: role?.hierarchy_level || 1,
      is_active: role?.is_active ?? true,
    },
  });

  React.useEffect(() => {
    if (role) {
      form.reset({
        name_en: role.name_en,
        name_ar: role.name_ar,
        code: role.code,
        description: role.description || '',
        hierarchy_level: role.hierarchy_level,
        is_active: role.is_active,
      });
    } else {
      form.reset({
        name_en: '',
        name_ar: '',
        code: '',
        description: '',
        hierarchy_level: 1,
        is_active: true,
      });
    }
  }, [role, form]);

  const onSubmit = async (data: RoleFormData) => {
    try {
      const processedData = {
        ...data,
        name_ar: data.name_ar || data.name_en, // Auto-fill Arabic from English
      };
      if (isEditing && role) {
        await editRole.mutateAsync({ id: role.id, updates: processedData });
      } else {
        await addRole.mutateAsync({
          name_en: processedData.name_en,
          name_ar: processedData.name_ar,
          code: data.code,
          description: data.description,
          hierarchy_level: data.hierarchy_level,
          is_active: data.is_active,
          permissions: {},
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing 
              ? (language === 'ar' ? 'تعديل الدور' : 'Edit Role')
              : (language === 'ar' ? 'إضافة دور جديد' : 'Add New Role')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (English)</FormLabel>
                    <FormControl>
                      <Input placeholder="Department Head" {...field} />
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
                    <FormLabel>الاسم (عربي)</FormLabel>
                    <FormControl>
                      <Input placeholder="رئيس القسم" dir="rtl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'ar' ? 'الرمز' : 'Code'}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="DEPT_HEAD" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        disabled={isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hierarchy_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'ar' ? 'المستوى' : 'Hierarchy Level'}</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'الوصف' : 'Description'}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={language === 'ar' ? 'وصف الدور...' : 'Role description...'}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <FormLabel className="!mt-0">
                    {language === 'ar' ? 'نشط' : 'Active'}
                  </FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={addRole.isPending || editRole.isPending}>
                {isEditing 
                  ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                  : (language === 'ar' ? 'إضافة الدور' : 'Add Role')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
