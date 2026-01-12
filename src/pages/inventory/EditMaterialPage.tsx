import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInventoryItem, useUpdateMaterial, useInventoryCategories } from '@/hooks/useInventory';
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
  is_active: z.boolean().default(true),
  lead_time_days: z.coerce.number().optional(),
  specifications: z.string().optional(),
});

export default function EditMaterialPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { data: item, isLoading } = useInventoryItem(id);
  const { data: categories } = useInventoryCategories();
  const updateMaterial = useUpdateMaterial();

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
      is_active: true,
      lead_time_days: 0,
      specifications: '',
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name_en: item.name_en,
        name_ar: item.name_ar,
        description: item.description || '',
        category_id: item.category_id || '',
        unit: item.unit,
        unit_price: item.unit_price,
        currency: item.currency,
        min_stock_level: item.min_stock_level,
        max_stock_level: item.max_stock_level || undefined,
        reorder_point: item.reorder_point,
        warehouse_location: item.warehouse_location || '',
        is_stockable: item.is_stockable,
        is_active: item.is_active,
        lead_time_days: item.lead_time_days || 0,
        specifications: item.specifications || '',
      });
    }
  }, [item, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!id) return;
    await updateMaterial.mutateAsync({
      id,
      data: {
        ...values,
        name_ar: values.name_ar || values.name_en, // Auto-fill Arabic from English
        category_id: values.category_id || undefined,
      },
    });
    navigate(`/inventory/${id}`);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-[600px]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!item) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'المادة غير موجودة' : 'Material not found'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={`Edit: ${item.name_en}`}
          titleAr={`تعديل: ${item.name_ar}`}
          description={`Material Code: ${item.code}`}
          descriptionAr={`كود المادة: ${item.code}`}
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
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>{language === 'ar' ? 'نشط' : 'Active'}</FormLabel>
                          <FormDescription>
                            {language === 'ar' ? 'المادة متاحة للاستخدام' : 'Material is available for use'}
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
                    name="is_stockable"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>{language === 'ar' ? 'قابل للتخزين' : 'Stockable Item'}</FormLabel>
                          <FormDescription>
                            {language === 'ar' ? 'تتبع مستويات المخزون' : 'Track stock levels'}
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
                  <Button type="button" variant="outline" onClick={() => navigate(`/inventory/${id}`)}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button type="submit" disabled={updateMaterial.isPending}>
                    {updateMaterial.isPending
                      ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                      : (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
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
