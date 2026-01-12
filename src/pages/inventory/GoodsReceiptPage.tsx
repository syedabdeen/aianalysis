import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { GoodsReceiptForm } from '@/components/inventory/GoodsReceiptForm';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function GoodsReceiptPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const preselectedPoId = searchParams.get('po');
  const [selectedPoId, setSelectedPoId] = useState(preselectedPoId || '');

  const { data: pendingPOs } = useQuery({
    queryKey: ['pending-pos-for-receipt'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          code,
          title_en,
          title_ar,
          vendor:vendors(company_name_en, company_name_ar)
        `)
        .in('status', ['approved', 'submitted'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const selectedPO = pendingPOs?.find(po => po.id === selectedPoId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Record Goods Receipt"
          titleAr="تسجيل استلام البضائع"
          description="Record received goods against a Purchase Order"
          descriptionAr="تسجيل البضائع المستلمة مقابل أمر الشراء"
        />

        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'اختيار أمر الشراء' : 'Select Purchase Order'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="max-w-md">
              <Label className="mb-2 block">
                {language === 'ar' ? 'أمر الشراء' : 'Purchase Order'} *
              </Label>
              <Select value={selectedPoId} onValueChange={setSelectedPoId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر أمر الشراء' : 'Select PO'} />
                </SelectTrigger>
                <SelectContent>
                  {pendingPOs?.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.code} - {language === 'ar' ? po.title_ar : po.title_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPO && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'رقم أمر الشراء' : 'PO Number'}</p>
                    <p className="font-mono font-medium">{selectedPO.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المورد' : 'Vendor'}</p>
                    <p className="font-medium">
                      {language === 'ar' 
                        ? selectedPO.vendor?.company_name_ar 
                        : selectedPO.vendor?.company_name_en}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'العنوان' : 'Title'}</p>
                    <p>{language === 'ar' ? selectedPO.title_ar : selectedPO.title_en}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedPoId && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'تفاصيل الاستلام' : 'Receipt Details'}</CardTitle>
            </CardHeader>
            <CardContent>
              <GoodsReceiptForm 
                poId={selectedPoId} 
                onSuccess={() => navigate('/inventory?tab=receipts')} 
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
