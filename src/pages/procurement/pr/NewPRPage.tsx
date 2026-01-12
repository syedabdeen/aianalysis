import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreatePurchaseRequest, useAddPRItem } from '@/hooks/usePurchaseRequest';
import { useProjects } from '@/hooks/useProjects';
import { useVendors } from '@/hooks/useVendors';
import { useRFQs, useRFQItems, useRFQVendors } from '@/hooks/useRFQ';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ItemsTable, ItemRow } from '@/components/procurement/ItemsTable';
import { Save, Loader2, ShoppingCart, AlertTriangle, FileText, Link2, Upload } from 'lucide-react';
import { ProcurementType } from '@/types/procurement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PRFormValues {
  title_en: string;
  title_ar: string;
  description: string;
  procurement_type: ProcurementType;
  project_id?: string;
  cost_center_id?: string;
  vendor_id?: string;
  required_date?: string;
  delivery_address?: string;
  justification?: string;
  currency: string;
  is_exception?: boolean;
  exception_reason?: string;
}

export default function NewPRPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const { data: vendors } = useVendors();
  const createPR = useCreatePurchaseRequest();
  const addItem = useAddPRItem();

  const [items, setItems] = useState<ItemRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [isException, setIsException] = useState(false);
  const [exceptionAttachment, setExceptionAttachment] = useState<File | null>(null);
  const [rfqAdopted, setRfqAdopted] = useState(false);

  // Fetch approved RFQs with selected vendor
  const { data: allRfqs } = useRFQs();
  const approvedRfqs = allRfqs?.filter(rfq => 
    rfq.status === 'approved' && rfq.selected_vendor_id
  ) || [];

  // Fetch RFQ items and vendors when RFQ is selected
  const { data: rfqItems } = useRFQItems(selectedRfqId || '');
  const { data: rfqVendors } = useRFQVendors(selectedRfqId || '');

  const approvedVendors = vendors?.filter(v => v.status === 'approved') || [];

  const { register, handleSubmit, setValue, watch, reset } = useForm<PRFormValues>({
    defaultValues: {
      procurement_type: 'material',
      currency: 'AED',
      is_exception: false,
    },
  });

  // Fetch cost centers
  useEffect(() => {
    async function fetchCostCenters() {
      const { data } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('is_active', true);
      setCostCenters(data || []);
    }
    fetchCostCenters();
  }, []);

  // Load RFQ details when selected
  useEffect(() => {
    if (selectedRfqId && allRfqs) {
      const rfq = allRfqs.find(r => r.id === selectedRfqId);
      if (rfq) {
        setValue('title_en', rfq.title_en);
        setValue('title_ar', rfq.title_ar);
        setValue('description', rfq.description || '');
        setValue('procurement_type', rfq.procurement_type);
        setValue('project_id', rfq.project_id || undefined);
        setValue('cost_center_id', rfq.cost_center_id || undefined);
        
        // Get selected vendor from RFQ
        if (rfq.selected_vendor_id) {
          setValue('vendor_id', rfq.selected_vendor_id);
        }
        
        setRfqAdopted(true);
        setIsException(false);
      }
    }
  }, [selectedRfqId, allRfqs, setValue]);

  // Load RFQ items when available
  useEffect(() => {
    if (rfqItems && rfqItems.length > 0 && selectedRfqId && rfqVendors) {
      // Get selected vendor's prices
      const selectedVendor = rfqVendors.find(v => v.is_selected);
      
      const formattedItems: ItemRow[] = rfqItems.map((item, index) => ({
        id: `rfq-item-${index}`,
        item_number: item.item_number,
        description_en: item.description_en,
        description_ar: item.description_ar,
        quantity: item.quantity,
        unit: item.unit,
        specifications: item.specifications || '',
        unit_price: selectedVendor?.quotation_amount ? (selectedVendor.quotation_amount / rfqItems.length) : 0,
        total_price: selectedVendor?.quotation_amount ? (selectedVendor.quotation_amount / rfqItems.length) * item.quantity : 0,
        rfq_item_id: item.id,
      }));
      setItems(formattedItems);
    }
  }, [rfqItems, selectedRfqId, rfqVendors]);

  // Handle exception toggle
  const handleExceptionToggle = (checked: boolean) => {
    setIsException(checked);
    if (checked) {
      setSelectedRfqId(null);
      setRfqAdopted(false);
      setItems([]);
      reset({
        procurement_type: 'material',
        currency: 'AED',
        is_exception: true,
      });
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const tax = subtotal * 0.05; // 5% VAT
    return { subtotal, tax, total: subtotal + tax };
  };

  const totals = calculateTotals();

  const onSubmit = async (data: PRFormValues) => {
    if (items.length === 0) {
      toast.error(language === 'ar' ? 'يرجى إضافة عنصر واحد على الأقل' : 'Please add at least one item');
      return;
    }

    if (isException && !data.exception_reason) {
      toast.error(language === 'ar' ? 'يرجى إدخال سبب الاستثناء' : 'Please enter exception reason');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload exception attachment if provided
      let attachmentPath = null;
      if (isException && exceptionAttachment) {
        const fileName = `exception_${Date.now()}_${exceptionAttachment.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(`pr-exceptions/${fileName}`, exceptionAttachment);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          attachmentPath = uploadData.path;
        }
      }

      const pr = await createPR.mutateAsync({
        title_en: data.title_en,
        title_ar: data.title_ar || data.title_en,
        description: data.description,
        procurement_type: data.procurement_type,
        project_id: data.project_id || null,
        cost_center_id: data.cost_center_id || null,
        vendor_id: data.vendor_id || null,
        required_date: data.required_date || null,
        delivery_address: data.delivery_address,
        justification: data.justification,
        currency: data.currency,
        subtotal: totals.subtotal,
        tax_amount: totals.tax,
        total_amount: totals.total,
        rfq_id_linked: selectedRfqId || null,
        is_exception: isException,
        exception_reason: isException ? data.exception_reason : null,
        exception_attachment: attachmentPath,
      });

      for (const item of items) {
        await addItem.mutateAsync({
          prId: pr.id,
          data: {
            description_en: item.description_en,
            description_ar: item.description_ar,
            quantity: item.quantity,
            unit: item.unit,
            specifications: item.specifications,
            unit_price: item.unit_price,
            total_price: item.total_price,
            rfq_item_id: item.rfq_item_id,
          },
        });
      }

      toast.success(language === 'ar' ? 'تم إنشاء طلب الشراء بنجاح' : 'Purchase Request created successfully');
      navigate('/procurement');
    } catch (error) {
      console.error('Error creating PR:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="New Purchase Request"
          titleAr="طلب شراء جديد"
          description="Create a purchase request for approval"
          descriptionAr="إنشاء طلب شراء للموافقة"
          icon={ShoppingCart}
        />

        {/* PR Creation Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              {language === 'ar' ? 'وضع إنشاء طلب الشراء' : 'PR Creation Mode'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'اختر طلب عرض أسعار معتمد أو أنشئ طلب شراء استثنائي'
                : 'Select an approved RFQ or create an exception PR'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Exception Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">
                    {language === 'ar' ? 'طلب شراء خارج الدورة المعتادة' : 'PR Outside Standard Cycle'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'إنشاء طلب شراء بدون طلب معلومات أو عرض أسعار مرتبط'
                      : 'Create PR without linked RFI or RFQ'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isException}
                onCheckedChange={handleExceptionToggle}
              />
            </div>

            {/* RFQ Selection - Only show if not exception */}
            {!isException && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {language === 'ar' ? 'طلب عرض أسعار معتمد' : 'Approved RFQ'}
                </Label>
                <Select
                  value={selectedRfqId || '_none'}
                  onValueChange={(v) => setSelectedRfqId(v === '_none' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر طلب عرض أسعار' : 'Select approved RFQ'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">
                      {language === 'ar' ? 'اختر طلب عرض أسعار' : 'Select an RFQ'}
                    </SelectItem>
                    {approvedRfqs.length === 0 ? (
                      <SelectItem value="_empty" disabled>
                        {language === 'ar' ? 'لا توجد طلبات عروض أسعار معتمدة' : 'No approved RFQs available'}
                      </SelectItem>
                    ) : (
                      approvedRfqs.map((rfq) => (
                        <SelectItem key={rfq.id} value={rfq.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{rfq.code}</Badge>
                            <span>{language === 'ar' ? rfq.title_ar : rfq.title_en}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {approvedRfqs.length === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{language === 'ar' ? 'لا توجد طلبات معتمدة' : 'No Approved RFQs'}</AlertTitle>
                    <AlertDescription>
                      {language === 'ar' 
                        ? 'لا توجد طلبات عروض أسعار معتمدة مع مورد محدد. يمكنك إنشاء طلب شراء استثنائي بدلاً من ذلك.'
                        : 'No approved RFQs with selected vendor available. You can create an exception PR instead.'}
                    </AlertDescription>
                  </Alert>
                )}

                {rfqAdopted && selectedRfqId && (
                  <Alert className="bg-primary/10 border-primary">
                    <FileText className="h-4 w-4" />
                    <AlertTitle>{language === 'ar' ? 'تم تحميل بيانات طلب عرض الأسعار' : 'RFQ Data Loaded'}</AlertTitle>
                    <AlertDescription>
                      {language === 'ar' 
                        ? 'تم تحميل تفاصيل طلب عرض الأسعار والعناصر تلقائياً'
                        : 'RFQ details and items have been automatically loaded'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Exception Fields */}
            {isException && (
              <Alert variant="destructive" className="border-warning bg-warning/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{language === 'ar' ? 'طلب شراء استثنائي' : 'Exception PR'}</AlertTitle>
                <AlertDescription>
                  {language === 'ar' 
                    ? 'سيتم تسجيل هذا الطلب كاستثناء في سجلات التدقيق ويتطلب موافقات إضافية'
                    : 'This PR will be flagged as an exception in audit logs and requires additional approvals'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Exception Reason - Required for exception PRs */}
          {isException && (
            <Card className="border-warning">
              <CardHeader>
                <CardTitle className="text-warning flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {language === 'ar' ? 'تفاصيل الاستثناء' : 'Exception Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-destructive">
                    {language === 'ar' ? 'سبب الاستثناء *' : 'Exception Reason *'}
                  </Label>
                  <Textarea
                    {...register('exception_reason')}
                    placeholder={language === 'ar' 
                      ? 'اشرح سبب تجاوز دورة الشراء المعتادة...'
                      : 'Explain why the standard procurement cycle is being bypassed...'}
                    rows={3}
                    required={isException}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {language === 'ar' ? 'مرفق داعم' : 'Supporting Attachment'}
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => setExceptionAttachment(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    {exceptionAttachment && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        {exceptionAttachment.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? 'PDF, DOC, DOCX, JPG, PNG مقبولة'
                      : 'PDF, DOC, DOCX, JPG, PNG accepted'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'معلومات أساسية' : 'Basic Information'}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                <Input 
                  {...register('title_en', { required: true })} 
                  placeholder="PR Title" 
                  readOnly={rfqAdopted}
                  className={rfqAdopted ? 'bg-muted' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</Label>
                <Input 
                  {...register('title_ar')} 
                  placeholder="عنوان طلب الشراء" 
                  dir="rtl" 
                  readOnly={rfqAdopted}
                  className={rfqAdopted ? 'bg-muted' : ''}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                <Textarea 
                  {...register('description')} 
                  placeholder="Detailed description..." 
                  rows={3} 
                  readOnly={rfqAdopted}
                  className={rfqAdopted ? 'bg-muted' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                <Select
                  value={watch('procurement_type')}
                  onValueChange={(v) => setValue('procurement_type', v as ProcurementType)}
                  disabled={rfqAdopted}
                >
                  <SelectTrigger className={rfqAdopted ? 'bg-muted' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">{language === 'ar' ? 'مواد' : 'Material'}</SelectItem>
                    <SelectItem value="service">{language === 'ar' ? 'خدمة' : 'Service'}</SelectItem>
                    <SelectItem value="subcontract">{language === 'ar' ? 'مقاولة من الباطن' : 'Subcontract'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                <Select
                  value={watch('currency')}
                  onValueChange={(v) => setValue('currency', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المشروع' : 'Project'}</Label>
                <Select
                  value={watch('project_id') || '_none'}
                  onValueChange={(v) => setValue('project_id', v === '_none' ? undefined : v)}
                  disabled={rfqAdopted}
                >
                  <SelectTrigger className={rfqAdopted ? 'bg-muted' : ''}>
                    <SelectValue placeholder={language === 'ar' ? 'اختر مشروع' : 'Select project'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{language === 'ar' ? 'بدون مشروع' : 'No project'}</SelectItem>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} - {language === 'ar' ? p.name_ar : p.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'مركز التكلفة' : 'Cost Center'}</Label>
                <Select
                  value={watch('cost_center_id') || '_none'}
                  onValueChange={(v) => setValue('cost_center_id', v === '_none' ? undefined : v)}
                  disabled={rfqAdopted}
                >
                  <SelectTrigger className={rfqAdopted ? 'bg-muted' : ''}>
                    <SelectValue placeholder={language === 'ar' ? 'اختر مركز تكلفة' : 'Select cost center'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} - {language === 'ar' ? cc.name_ar : cc.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المورد' : 'Vendor'}</Label>
                <Select
                  value={watch('vendor_id') || '_none'}
                  onValueChange={(v) => setValue('vendor_id', v === '_none' ? undefined : v)}
                  disabled={rfqAdopted}
                >
                  <SelectTrigger className={rfqAdopted ? 'bg-muted' : ''}>
                    <SelectValue placeholder={language === 'ar' ? 'اختر مورد' : 'Select vendor'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                    {approvedVendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.code} - {language === 'ar' ? v.company_name_ar : v.company_name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'تاريخ الطلب' : 'Required Date'}</Label>
                <Input type="date" {...register('required_date')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{language === 'ar' ? 'عنوان التسليم' : 'Delivery Address'}</Label>
                <Textarea {...register('delivery_address')} placeholder="Delivery address..." rows={2} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{language === 'ar' ? 'المبرر' : 'Justification'}</Label>
                <Textarea {...register('justification')} placeholder="Business justification..." rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'العناصر' : 'Items'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ItemsTable 
                items={items} 
                onChange={setItems} 
                showPricing 
                readOnly={rfqAdopted}
                lockQuantityPrice={rfqAdopted}
                enableMaterialSearch={!rfqAdopted && watch('procurement_type') === 'material'}
              />
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}:</span>
                    <span>{watch('currency')} {totals.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{language === 'ar' ? 'ضريبة القيمة المضافة (5%)' : 'VAT (5%)'}:</span>
                    <span>{watch('currency')} {totals.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>{language === 'ar' ? 'الإجمالي' : 'Total'}:</span>
                    <span>{watch('currency')} {totals.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/procurement')}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
