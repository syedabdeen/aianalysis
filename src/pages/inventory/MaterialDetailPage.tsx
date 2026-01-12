import { useParams, useNavigate } from 'react-router-dom';
import { Package, Edit, MapPin, Calendar, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInventoryItem, useStockMovements } from '@/hooks/useInventory';
import { StockLevelIndicator } from '@/components/inventory/StockLevelIndicator';
import { StockMovementTable } from '@/components/inventory/StockMovementTable';

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  const { data: item, isLoading } = useInventoryItem(id);
  const { data: movements, isLoading: loadingMovements } = useStockMovements(id);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-[400px]" />
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
          <Button variant="link" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'العودة للمخزون' : 'Back to Inventory'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const categoryName = item.category 
    ? (language === 'ar' ? item.category.name_ar : item.category.name_en)
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={item.name_en}
          titleAr={item.name_ar}
          description={`Material Code: ${item.code}`}
          descriptionAr={`كود المادة: ${item.code}`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/inventory/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'تعديل' : 'Edit'}
              </Button>
              <Button onClick={() => navigate('/inventory/adjustment', { state: { itemId: id } })}>
                {language === 'ar' ? 'تعديل المخزون' : 'Adjust Stock'}
              </Button>
            </div>
          }
        />


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {language === 'ar' ? 'معلومات المادة' : 'Material Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الكود' : 'Code'}
                  </p>
                  <p className="font-mono font-medium">{item.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </p>
                  <Badge variant={item.is_active ? 'default' : 'secondary'}>
                    {item.is_active 
                      ? (language === 'ar' ? 'نشط' : 'Active')
                      : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الفئة' : 'Category'}
                  </p>
                  <p className="font-medium">{categoryName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'الوحدة' : 'Unit'}
                  </p>
                  <p className="font-medium">{item.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}
                  </p>
                  <p className="font-medium">{item.unit_price.toLocaleString()} {item.currency}</p>
                </div>
                {item.warehouse_location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'موقع المستودع' : 'Warehouse Location'}
                      </p>
                      <p className="font-medium">{item.warehouse_location}</p>
                    </div>
                  </div>
                )}
                {item.lead_time_days && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'وقت التسليم' : 'Lead Time'}
                      </p>
                      <p className="font-medium">{item.lead_time_days} {language === 'ar' ? 'يوم' : 'days'}</p>
                    </div>
                  </div>
                )}
              </div>

              {item.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'الوصف' : 'Description'}
                  </p>
                  <p>{item.description}</p>
                </div>
              )}

              {item.specifications && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'المواصفات' : 'Specifications'}
                  </p>
                  <p className="whitespace-pre-wrap">{item.specifications}</p>
                </div>
              )}

              <div className="text-sm text-muted-foreground pt-4 border-t">
                <p>{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}: {format(new Date(item.created_at), 'PPP')}</p>
                <p>{language === 'ar' ? 'آخر تحديث' : 'Updated'}: {format(new Date(item.updated_at), 'PPP')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'حالة المخزون' : 'Stock Status'}</CardTitle>
            </CardHeader>
            <CardContent>
              <StockLevelIndicator
                currentStock={item.current_stock}
                minLevel={item.min_stock_level}
                maxLevel={item.max_stock_level}
                unit={item.unit}
                size="lg"
              />

              <div className="mt-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ar' ? 'الرصيد الحالي' : 'Current Stock'}</span>
                  <span className="font-bold text-lg">{item.current_stock} {item.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ar' ? 'الحد الأدنى' : 'Min Level'}</span>
                  <span>{item.min_stock_level} {item.unit}</span>
                </div>
                {item.max_stock_level && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ar' ? 'الحد الأقصى' : 'Max Level'}</span>
                    <span>{item.max_stock_level} {item.unit}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ar' ? 'نقطة إعادة الطلب' : 'Reorder Point'}</span>
                  <span>{item.reorder_point} {item.unit}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-muted-foreground">{language === 'ar' ? 'القيمة الإجمالية' : 'Total Value'}</span>
                  <span className="font-bold">
                    {(item.current_stock * item.unit_price).toLocaleString()} {item.currency}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="movements">
          <TabsList>
            <TabsTrigger value="movements">
              {language === 'ar' ? 'حركات المخزون' : 'Stock Movements'}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="movements">
            {loadingMovements ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <StockMovementTable movements={movements || []} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
