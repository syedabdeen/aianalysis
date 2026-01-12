import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAddApprovalRule, useEditApprovalRule } from '@/hooks/useApprovalMatrix';
import { ApprovalRule, APPROVAL_CATEGORIES, ApprovalCategory } from '@/types/approval';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ruleSchema = z.object({
  name_en: z.string().min(2, 'Name is required'),
  name_ar: z.string().optional(),
  category: z.enum(['purchase_request', 'purchase_order', 'contracts', 'capex', 'payments', 'float_cash'] as const),
  min_amount: z.coerce.number().min(0),
  max_amount: z.coerce.number().nullable().optional(),
  currency: z.string().default('AED'),
  auto_approve_below: z.coerce.number().nullable().optional(),
  escalation_hours: z.coerce.number().min(1).max(168).optional(),
  requires_sequential: z.boolean(),
  is_active: z.boolean(),
});

type RuleFormData = z.infer<typeof ruleSchema>;

interface ApprovalRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: ApprovalRule | null;
}

export const ApprovalRuleDialog: React.FC<ApprovalRuleDialogProps> = ({
  open,
  onOpenChange,
  rule,
}) => {
  const { language } = useLanguage();
  const addRule = useAddApprovalRule();
  const editRule = useEditApprovalRule();
  const isEditing = !!rule;

  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name_en: rule?.name_en || '',
      name_ar: rule?.name_ar || '',
      category: rule?.category || 'purchase_request',
      min_amount: rule?.min_amount || 0,
      max_amount: rule?.max_amount || null,
      currency: rule?.currency || 'AED',
      auto_approve_below: rule?.auto_approve_below || null,
      escalation_hours: rule?.escalation_hours || 24,
      requires_sequential: rule?.requires_sequential ?? true,
      is_active: rule?.is_active ?? true,
    },
  });

  React.useEffect(() => {
    if (rule) {
      form.reset({
        name_en: rule.name_en,
        name_ar: rule.name_ar,
        category: rule.category,
        min_amount: rule.min_amount,
        max_amount: rule.max_amount,
        currency: rule.currency,
        auto_approve_below: rule.auto_approve_below,
        escalation_hours: rule.escalation_hours || 24,
        requires_sequential: rule.requires_sequential,
        is_active: rule.is_active,
      });
    } else {
      form.reset({
        name_en: '',
        name_ar: '',
        category: 'purchase_request',
        min_amount: 0,
        max_amount: null,
        currency: 'AED',
        auto_approve_below: null,
        escalation_hours: 24,
        requires_sequential: true,
        is_active: true,
      });
    }
  }, [rule, form]);

  const onSubmit = async (data: RuleFormData) => {
    try {
      const payload = {
        name_en: data.name_en,
        name_ar: data.name_ar || data.name_en, // Auto-fill Arabic from English
        category: data.category,
        min_amount: data.min_amount,
        max_amount: data.max_amount || null,
        currency: data.currency,
        auto_approve_below: data.auto_approve_below || null,
        escalation_hours: data.escalation_hours,
        requires_sequential: data.requires_sequential,
        is_active: data.is_active,
        conditions: {},
        metadata: {},
        department_id: null,
        created_by: null,
      };

      if (isEditing && rule) {
        await editRule.mutateAsync({ id: rule.id, updates: payload });
      } else {
        await addRule.mutateAsync(payload);
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
              ? (language === 'ar' ? 'تعديل القاعدة' : 'Edit Rule')
              : (language === 'ar' ? 'إضافة قاعدة جديدة' : 'Add New Rule')}
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
                      <Input placeholder="Small Purchase" {...field} />
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
                      <Input placeholder="مشتريات صغيرة" dir="rtl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'الفئة' : 'Category'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(APPROVAL_CATEGORIES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {language === 'ar' ? value.label_ar : value.label_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="min_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'ar' ? 'الحد الأدنى' : 'Min Amount'}</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
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
                    <FormLabel>{language === 'ar' ? 'الحد الأقصى' : 'Max Amount'}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        step="0.01" 
                        placeholder="∞"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="auto_approve_below"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'ar' ? 'موافقة تلقائية أقل من' : 'Auto Approve Below'}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        step="0.01"
                        placeholder="Optional"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {language === 'ar' ? 'اتركه فارغاً للتعطيل' : 'Leave empty to disable'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="escalation_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'ar' ? 'ساعات التصعيد' : 'Escalation Hours'}</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={168} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="requires_sequential"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <FormLabel className="!mt-0">
                      {language === 'ar' ? 'موافقة متسلسلة' : 'Sequential Approval'}
                    </FormLabel>
                    <FormDescription className="text-xs">
                      {language === 'ar' 
                        ? 'يجب الموافقة بالترتيب' 
                        : 'Approvals must be in order'}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
              <Button type="submit" disabled={addRule.isPending || editRule.isPending}>
                {isEditing 
                  ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                  : (language === 'ar' ? 'إضافة القاعدة' : 'Add Rule')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
