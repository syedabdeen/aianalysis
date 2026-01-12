import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateMaterial, useInventoryCategories } from '@/hooks/useInventory';
import { UNIT_OPTIONS } from '@/types/inventory';

const formSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  unit_price: z.coerce.number().min(0, 'Unit price must be positive'),
  currency: z.string().default('AED'),
  min_stock_level: z.coerce.number().min(0, 'Min stock must be positive'),
  max_stock_level: z.coerce.number().optional(),
  reorder_point: z.coerce.number().min(0, 'Reorder point must be positive'),
  warehouse_location: z.string().optional(),
  is_stockable: z.boolean().default(true),
  lead_time_days: z.coerce.number().optional(),
  specifications: z.string().optional(),
});

export default function NewMaterialPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { data: categories } = useInventoryCategories();
  const createMaterial = useCreateMaterial();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name_en: '',
      name_ar: '',
      description: '',
      category_id: '',
      unit: 'EA',
      unit_price: 0,
      currency: 'AED',
      min_stock_level: 0,
      max_stock_level: undefined,
      reorder_point: 0,
      warehouse_location: '',
      is_stockable: true,
      lead_time_days: 0,
      specifications: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createMaterial.mutateAsync({
      name_en: values.name_en,
      name_ar: values.name_ar || values.name_en, // Auto-fill Arabic from English
      description: values.description,
      category_id: values.category_id || undefined,
      unit: values.unit,
      unit_price: values.unit_price,
      currency: values.currency,
      min_stock_level: values.min_stock_level,
      max_stock_level: values.max_stock_level,
      reorder_point: values.reorder_point,
      warehouse_location: values.warehouse_location,
      is_stockable: values.is_stockable,
      lead_time_days: values.lead_time_days,
      specifications: values.specifications,
    });
    navigate('/inventory');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="New Material"
          titleAr="مادة جديدة"
          description="Add a new material to inventory"
          descriptionAr="إضافة مادة جديدة للمخزون"
        />

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} *</FormLabel>
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
                        <FormLabel>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *</FormLabel>
                        <FormControl>
                          <Input {...field} dir="rtl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'الفئة' : 'Category'}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={language === 'ar' ? 'اختر الفئة' : 'Select category'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {language === 'ar' ? cat.name_ar : cat.name_en}
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
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'الوحدة' : 'Unit'} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UNIT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {language === 'ar' ? opt.label_ar : opt.label_en} ({opt.value})
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
                    name="unit_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warehouse_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'موقع المستودع' : 'Warehouse Location'}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">
                    {language === 'ar' ? 'إعدادات المخزون' : 'Stock Settings'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="min_stock_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'الحد الأدنى' : 'Min Stock Level'}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>
                            {language === 'ar' ? 'تنبيه عند انخفاض المخزون' : 'Alert when stock falls below'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_stock_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'الحد الأقصى' : 'Max Stock Level'}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reorder_point"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'نقطة إعادة الطلب' : 'Reorder Point'}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="lead_time_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'وقت التسليم (أيام)' : 'Lead Time (Days)'}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_stockable"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>{language === 'ar' ? 'قابل للتخزين' : 'Stockable Item'}</FormLabel>
                          <FormDescription>
                            {language === 'ar' ? 'تتبع مستويات المخزون' : 'Track stock levels for this item'}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
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
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === 'ar' ? 'المواصفات الفنية' : 'Technical Specifications'}</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => navigate('/inventory')}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button type="submit" disabled={createMaterial.isPending}>
                    {createMaterial.isPending
                      ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                      : (language === 'ar' ? 'إنشاء المادة' : 'Create Material')}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
