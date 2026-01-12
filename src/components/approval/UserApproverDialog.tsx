import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAddUserApprover, useUpdateUserApprover, UserApprover, useApprovalThresholds } from '@/hooks/useUserApprovers';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AVAILABLE_MODULES = [
  { value: 'purchase_request', label_en: 'Purchase Request', label_ar: 'طلب شراء' },
  { value: 'purchase_order', label_en: 'Purchase Order', label_ar: 'أمر شراء' },
  { value: 'rfq', label_en: 'RFQ', label_ar: 'طلب عرض أسعار' },
  { value: 'project', label_en: 'Project', label_ar: 'مشروع' },
  { value: 'contracts', label_en: 'Contracts', label_ar: 'العقود' },
  { value: 'payments', label_en: 'Payments', label_ar: 'المدفوعات' },
];

const schema = z.object({
  user_id: z.string().min(1, 'User is required'),
  approver_role: z.string().min(1, 'Role is required'),
  modules: z.array(z.string()).min(1, 'Select at least one module'),
  max_approval_amount: z.coerce.number().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

interface UserApproverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approver?: UserApprover | null;
}

export const UserApproverDialog: React.FC<UserApproverDialogProps> = ({
  open,
  onOpenChange,
  approver,
}) => {
  const { language } = useLanguage();
  const addApprover = useAddUserApprover();
  const updateApprover = useUpdateUserApprover();
  const isEditing = !!approver;

  const { data: users } = useQuery({
    queryKey: ['users-for-approvers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: thresholds } = useApprovalThresholds();
  const uniqueRoles = [...new Set(thresholds?.map(t => t.approver_role) || [])];

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      user_id: approver?.user_id || '',
      approver_role: approver?.approver_role || '',
      modules: approver?.modules || [],
      max_approval_amount: approver?.max_approval_amount || null,
    },
  });

  React.useEffect(() => {
    if (approver) {
      form.reset({
        user_id: approver.user_id,
        approver_role: approver.approver_role,
        modules: approver.modules,
        max_approval_amount: approver.max_approval_amount,
      });
    } else {
      form.reset({
        user_id: '',
        approver_role: '',
        modules: [],
        max_approval_amount: null,
      });
    }
  }, [approver, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && approver) {
        await updateApprover.mutateAsync({
          id: approver.id,
          updates: {
            approver_role: data.approver_role,
            modules: data.modules,
            max_approval_amount: data.max_approval_amount || null,
          },
        });
      } else {
        await addApprover.mutateAsync({
          user_id: data.user_id,
          approver_role: data.approver_role,
          modules: data.modules,
          max_approval_amount: data.max_approval_amount || null,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? (language === 'ar' ? 'تعديل صلاحيات المعتمد' : 'Edit Approver Permissions')
              : (language === 'ar' ? 'إضافة معتمد جديد' : 'Add New Approver')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'المستخدم' : 'User'}</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر المستخدم' : 'Select user'} />
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
              name="approver_role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'دور المعتمد' : 'Approver Role'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر الدور' : 'Select role'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {uniqueRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {language === 'ar' 
                      ? 'الدور يحدد مستوى الموافقة بناءً على القيمة' 
                      : 'Role determines approval level based on value thresholds'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modules"
              render={() => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'الوحدات المسموح الموافقة عليها' : 'Modules Allowed to Approve'}</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_MODULES.map((module) => (
                      <FormField
                        key={module.value}
                        control={form.control}
                        name="modules"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(module.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, module.value]);
                                  } else {
                                    field.onChange(current.filter((v) => v !== module.value));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {language === 'ar' ? module.label_ar : module.label_en}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_approval_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'الحد الأقصى للموافقة' : 'Max Approval Amount'}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      step="0.01"
                      placeholder={language === 'ar' ? 'بدون حد' : 'No limit'}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {language === 'ar' ? 'اتركه فارغاً للسماح بأي قيمة' : 'Leave empty for unlimited'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={addApprover.isPending || updateApprover.isPending}>
                {isEditing
                  ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                  : (language === 'ar' ? 'إضافة المعتمد' : 'Add Approver')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
