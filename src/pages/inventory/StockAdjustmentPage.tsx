import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInventoryItems, useInventoryItem, useAdjustStock } from '@/hooks/useInventory';
import { useProjects } from '@/hooks/useProjects';
import { StockLevelIndicator } from '@/components/inventory/StockLevelIndicator';

const formSchema = z.object({
  inventory_item_id: z.string().min(1, 'Material is required'),
  adjustment_type: z.enum(['add', 'subtract', 'set']),
  quantity: z.coerce.number().min(0, 'Quantity must be positive'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
  project_id: z.string().optional(),
});

const ADJUSTMENT_REASONS = [
  { value: 'inventory_count', label_en: 'Inventory Count', label_ar: 'جرد المخزون' },
  { value: 'damage', label_en: 'Damage / Loss', label_ar: 'تلف / فقدان' },
  { value: 'return', label_en: 'Return to Supplier', label_ar: 'إرجاع للمورد' },
  { value: 'correction', label_en: 'Data Correction', label_ar: 'تصحيح بيانات' },
  { value: 'initial_stock', label_en: 'Initial Stock', label_ar: 'مخزون افتتاحي' },
  { value: 'other', label_en: 'Other', label_ar: 'أخرى' },
];

export default function StockAdjustmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const preselectedItemId = location.state?.itemId;

  const { data: items } = useInventoryItems({ is_active: true });
  const { data: projects } = useProjects();
  const adjustStock = useAdjustStock();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inventory_item_id: preselectedItemId || '',
      adjustment_type: 'add',
      quantity: 0,
      reason: '',
      notes: '',
      project_id: '',
    },
  });

  const selectedItemId = form.watch('inventory_item_id');
  const adjustmentType = form.watch('adjustment_type');
  const quantity = form.watch('quantity');

  const { data: selectedItem } = useInventoryItem(selectedItemId);

  const calculateNewBalance = () => {
    if (!selectedItem) return null;
    if (adjustmentType === 'add') return selectedItem.current_stock + quantity;
    if (adjustmentType === 'subtract') return selectedItem.current_stock - quantity;
    return quantity;
  };

  const newBalance = calculateNewBalance();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await adjustStock.mutateAsync({
      inventory_item_id: values.inventory_item_id,
      adjustment_type: values.adjustment_type,
      quantity: values.quantity,
      reason: values.reason,
      notes: values.notes,
      project_id: values.project_id || undefined,
    });
    navigate('/inventory');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Stock Adjustment"
          titleAr="تعديل المخزون"
          description="Adjust stock levels for inventory items"
          descriptionAr="تعديل مستويات المخزون للمواد"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="inventory_item_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'المادة' : 'Material'} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={language === 'ar' ? 'اختر المادة' : 'Select material'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {items?.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.code} - {language === 'ar' ? item.name_ar : item.name_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="adjustment_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'نوع التعديل' : 'Adjustment Type'} *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="add">
                                {language === 'ar' ? 'إضافة (+)' : 'Add (+)'}
                              </SelectItem>
                              <SelectItem value="subtract">
                                {language === 'ar' ? 'خصم (-)' : 'Subtract (-)'}
                              </SelectItem>
                              <SelectItem value="set">
                                {language === 'ar' ? 'تعيين قيمة' : 'Set Value'}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {adjustmentType === 'add' && (language === 'ar' ? 'إضافة للمخزون الحالي' : 'Add to current stock')}
                            {adjustmentType === 'subtract' && (language === 'ar' ? 'خصم من المخزون الحالي' : 'Subtract from current stock')}
                            {adjustmentType === 'set' && (language === 'ar' ? 'تعيين الرصيد الجديد' : 'Set new balance directly')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'الكمية' : 'Quantity'} *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'السبب' : 'Reason'} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={language === 'ar' ? 'اختر السبب' : 'Select reason'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ADJUSTMENT_REASONS.map((reason) => (
                              <SelectItem key={reason.value} value={reason.value}>
                                {language === 'ar' ? reason.label_ar : reason.label_en}
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
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'المشروع (اختياري)' : 'Project (Optional)'}</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select project'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">
                              {language === 'ar' ? 'بدون مشروع' : 'No project'}
                            </SelectItem>
                            {projects?.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.code} - {language === 'ar' ? project.name_ar : project.name_en}
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
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'ملاحظات' : 'Notes'}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormDescription>
                          {language === 'ar' 
                            ? 'أضف أي تفاصيل إضافية للتوثيق'
                            : 'Add any additional details for audit trail'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => navigate('/inventory')}>
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button type="submit" disabled={adjustStock.isPending}>
                      {adjustStock.isPending
                        ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                        : (language === 'ar' ? 'تطبيق التعديل' : 'Apply Adjustment')}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'معاينة التعديل' : 'Adjustment Preview'}</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedItem ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المادة' : 'Material'}</p>
                    <p className="font-medium">{language === 'ar' ? selectedItem.name_ar : selectedItem.name_en}</p>
                    <p className="text-sm font-mono text-muted-foreground">{selectedItem.code}</p>
                  </div>

                  <StockLevelIndicator
                    currentStock={selectedItem.current_stock}
                    minLevel={selectedItem.min_stock_level}
                    maxLevel={selectedItem.max_stock_level}
                    unit={selectedItem.unit}
                  />

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</span>
                      <span className="font-medium">{selectedItem.current_stock} {selectedItem.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'التعديل' : 'Adjustment'}</span>
                      <span className={adjustmentType === 'subtract' ? 'text-red-500' : 'text-green-500'}>
                        {adjustmentType === 'set' ? '=' : (adjustmentType === 'subtract' ? '-' : '+')} {quantity}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>{language === 'ar' ? 'الرصيد الجديد' : 'New Balance'}</span>
                      <span className={newBalance !== null && newBalance < 0 ? 'text-red-500' : ''}>
                        {newBalance !== null ? `${newBalance} ${selectedItem.unit}` : '-'}
                      </span>
                    </div>
                  </div>

                  {newBalance !== null && newBalance < 0 && (
                    <p className="text-sm text-destructive">
                      {language === 'ar' 
                        ? 'تحذير: الرصيد الجديد سيكون سالباً'
                        : 'Warning: New balance will be negative'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {language === 'ar' ? 'اختر مادة للمعاينة' : 'Select a material to preview'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
