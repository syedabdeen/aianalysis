import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useAddApprovalThreshold,
  useUpdateApprovalThreshold,
  ApprovalThreshold,
} from '@/hooks/useUserApprovers';

const formSchema = z.object({
  module: z.string().min(1, 'Module is required'),
  min_amount: z.coerce.number().min(0, 'Minimum amount must be 0 or greater'),
  max_amount: z.coerce.number().nullable(),
  approver_role: z.string().min(1, 'Approver role is required'),
  approver_role_ar: z.string().min(1, 'Arabic approver role is required'),
  sequence_order: z.coerce.number().min(1, 'Sequence must be at least 1'),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface ApprovalThresholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threshold?: ApprovalThreshold | null;
  defaultModule?: string;
}

const approverRoles = [
  { value: 'Line Manager', label_en: 'Line Manager', label_ar: 'المدير المباشر' },
  { value: 'Department Manager', label_en: 'Department Manager', label_ar: 'مدير القسم' },
  { value: 'Finance Manager', label_en: 'Finance Manager', label_ar: 'مدير المالية' },
  { value: 'Procurement Manager', label_en: 'Procurement Manager', label_ar: 'مدير المشتريات' },
  { value: 'Operations Manager', label_en: 'Operations Manager', label_ar: 'مدير العمليات' },
  { value: 'General Manager', label_en: 'General Manager', label_ar: 'المدير العام' },
  { value: 'CEO', label_en: 'CEO', label_ar: 'الرئيس التنفيذي' },
  { value: 'Board of Directors', label_en: 'Board of Directors', label_ar: 'مجلس الإدارة' },
];

export const ApprovalThresholdDialog: React.FC<ApprovalThresholdDialogProps> = ({
  open,
  onOpenChange,
  threshold,
  defaultModule = 'purchase_request',
}) => {
  const { language } = useLanguage();
  const addThreshold = useAddApprovalThreshold();
  const updateThreshold = useUpdateApprovalThreshold();
  const isEditing = !!threshold;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      module: defaultModule,
      min_amount: 0,
      max_amount: null,
      approver_role: '',
      approver_role_ar: '',
      sequence_order: 1,
      is_active: true,
    },
  });

  useEffect(() => {
    if (threshold) {
      form.reset({
        module: threshold.module,
        min_amount: threshold.min_amount,
        max_amount: threshold.max_amount,
        approver_role: threshold.approver_role,
        approver_role_ar: threshold.approver_role_ar,
        sequence_order: threshold.sequence_order,
        is_active: threshold.is_active,
      });
    } else {
      form.reset({
        module: defaultModule,
        min_amount: 0,
        max_amount: null,
        approver_role: '',
        approver_role_ar: '',
        sequence_order: 1,
        is_active: true,
      });
    }
  }, [threshold, defaultModule, form]);

  const handleApproverChange = (value: string) => {
    const role = approverRoles.find((r) => r.value === value);
    if (role) {
      form.setValue('approver_role', role.value);
      form.setValue('approver_role_ar', role.label_ar);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && threshold) {
        await updateThreshold.mutateAsync({
          id: threshold.id,
          updates: values,
        });
      } else {
        await addThreshold.mutateAsync({
          module: values.module,
          min_amount: values.min_amount,
          max_amount: values.max_amount,
          approver_role: values.approver_role,
          approver_role_ar: values.approver_role_ar,
          sequence_order: values.sequence_order,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save threshold:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? language === 'ar'
                ? 'تعديل حد الموافقة'
                : 'Edit Approval Threshold'
              : language === 'ar'
              ? 'إضافة حد موافقة جديد'
              : 'Add New Approval Threshold'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar'
              ? 'قم بتحديد نطاق القيمة والمعتمد المسؤول'
              : 'Define the value range and the responsible approver'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="module"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'الوحدة' : 'Module'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="purchase_request">
                        {language === 'ar' ? 'طلب الشراء' : 'Purchase Request'}
                      </SelectItem>
                      <SelectItem value="purchase_order">
                        {language === 'ar' ? 'أمر الشراء' : 'Purchase Order'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'ar' ? 'الحد الأدنى (AED)' : 'Min Amount (AED)'}</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'ar' ? 'الحد الأقصى (AED)' : 'Max Amount (AED)'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="∞"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="approver_role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'المعتمد' : 'Approver'}</FormLabel>
                  <Select onValueChange={handleApproverChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر المعتمد' : 'Select approver'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {approverRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {language === 'ar' ? role.label_ar : role.label_en}
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
              name="sequence_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'ترتيب الموافقة' : 'Sequence Order'}</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{language === 'ar' ? 'نشط' : 'Active'}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={addThreshold.isPending || updateThreshold.isPending}>
                {isEditing
                  ? language === 'ar'
                    ? 'تحديث'
                    : 'Update'
                  : language === 'ar'
                  ? 'إضافة'
                  : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
