import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreatePurchaseOrder, useAddPOItem, useUpdatePurchaseOrder } from '@/hooks/usePurchaseOrder';
import { usePurchaseRequests, usePRItems } from '@/hooks/usePurchaseRequest';
import { useVendors, useVendor } from '@/hooks/useVendors';
import { useInitiateWorkflow } from '@/hooks/useApprovalWorkflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ItemsTable, ItemRow } from '@/components/procurement/ItemsTable';
import { VendorDetailsCard } from '@/components/procurement/VendorDetailsCard';
import { DeliveryLocationSelector } from '@/components/procurement/DeliveryLocationSelector';
import { STANDARD_PAYMENT_TERMS, INCOTERMS } from '@/lib/procurementConstants';
import { Save, Loader2, AlertTriangle, ClipboardList, Send, FileCheck, Package } from 'lucide-react';
import { toast } from 'sonner';

interface POFormValues {
  title_en: string;
  title_ar: string;
  description: string;
  pr_id: string;
  vendor_id: string;
  delivery_date?: string;
  delivery_address?: string;
  payment_terms?: string;
  special_payment_terms?: string;
  delivery_terms?: string;
  terms_conditions?: string;
  currency: string;
  delivery_location_type?: string;
  delivery_contact_person?: string;
  delivery_contact_phone?: string;
}

export default function NewPOPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: purchaseRequests } = usePurchaseRequests();
  const { data: vendors } = useVendors();
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const addItem = useAddPOItem();
  const initiateWorkflow = useInitiateWorkflow();

  const [items, setItems] = useState<ItemRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prTotalAmount, setPrTotalAmount] = useState(0);
  const [varianceWarning, setVarianceWarning] = useState<string | null>(null);
  const [showSpecialTerms, setShowSpecialTerms] = useState(false);
  const [deliveryLocationType, setDeliveryLocationType] = useState('');
  const [deliveryProjectId, setDeliveryProjectId] = useState('');
  const [deliveryContactPerson, setDeliveryContactPerson] = useState('');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');
  const [prAdopted, setPrAdopted] = useState(false);

  // Filter approved PRs that don't have a PO yet
  const approvedPRs = purchaseRequests?.filter(pr => pr.status === 'approved') || [];
  const approvedVendors = vendors?.filter(v => v.status === 'approved') || [];

  const { register, handleSubmit, setValue, watch } = useForm<POFormValues>({
    defaultValues: {
      currency: 'AED',
    },
  });

  const selectedPrId = watch('pr_id');
  const selectedVendorId = watch('vendor_id');
  const selectedPaymentTerms = watch('payment_terms');

  // Fetch selected vendor details
  const { data: selectedVendor } = useVendor(selectedVendorId);
  
  // Fetch PR items when PR is selected
  const { data: prItems } = usePRItems(selectedPrId || '');

  // Load PR details and items when PR is selected
  useEffect(() => {
    if (selectedPrId) {
      const pr = approvedPRs.find(p => p.id === selectedPrId);
      if (pr) {
        setValue('title_en', pr.title_en);
        setValue('title_ar', pr.title_ar);
        setValue('description', pr.description || '');
        setValue('currency', pr.currency);
        setValue('vendor_id', pr.vendor_id || '');
        setPrTotalAmount(pr.total_amount || 0);
        setPrAdopted(true);
      }
    } else {
      setPrAdopted(false);
    }
  }, [selectedPrId, approvedPRs, setValue]);

  // Load PR items into the form
  useEffect(() => {
    if (prItems && prItems.length > 0 && selectedPrId) {
      const formattedItems: ItemRow[] = prItems.map((item) => ({
        id: item.id,
        item_number: item.item_number,
        description_en: item.description_en,
        description_ar: item.description_ar,
        quantity: item.quantity,
        unit: item.unit,
        specifications: item.specifications || '',
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));
      setItems(formattedItems);
    }
  }, [prItems, selectedPrId]);

  useEffect(() => {
    setShowSpecialTerms(selectedPaymentTerms === 'special');
  }, [selectedPaymentTerms]);

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const tax = subtotal * 0.05;
    return { subtotal, tax, total: subtotal + tax };
  };

  const totals = calculateTotals();

  useEffect(() => {
    if (prTotalAmount > 0) {
      const variance = ((totals.total - prTotalAmount) / prTotalAmount) * 100;
      if (variance > 5) {
        setVarianceWarning(
          language === 'ar'
            ? `تحذير: قيمة أمر الشراء تتجاوز قيمة طلب الشراء بنسبة ${variance.toFixed(1)}%. الحد الأقصى المسموح 5%.`
            : `Warning: PO amount exceeds PR amount by ${variance.toFixed(1)}%. Maximum allowed is 5%.`
        );
      } else {
        setVarianceWarning(null);
      }
    }
  }, [totals.total, prTotalAmount, language]);

  const buildDeliveryAddress = (data: POFormValues) => {
    let address = data.delivery_address || '';
    if (deliveryContactPerson || deliveryContactPhone) {
      address += `\n${language === 'ar' ? 'جهة الاتصال' : 'Contact'}: ${deliveryContactPerson || ''} ${deliveryContactPhone ? `(${deliveryContactPhone})` : ''}`;
    }
    return address;
  };

  const buildPaymentTerms = (data: POFormValues) => {
    if (data.payment_terms === 'special' && data.special_payment_terms) {
      return `Special: ${data.special_payment_terms}`;
    }
    const term = STANDARD_PAYMENT_TERMS.find(t => t.value === data.payment_terms);
    return term ? (language === 'ar' ? term.label_ar : term.label_en) : data.payment_terms;
  };

  const buildDeliveryTerms = (data: POFormValues) => {
    const term = INCOTERMS.find(t => t.value === data.delivery_terms);
    return term ? (language === 'ar' ? term.label_ar : term.label_en) : data.delivery_terms;
  };

  const onSubmit = async (data: POFormValues, submitForApproval: boolean = false) => {
    if (items.length === 0) {
      toast.error(language === 'ar' ? 'يرجى إضافة عنصر واحد على الأقل' : 'Please add at least one item');
      return;
    }

    if (varianceWarning) {
      toast.error(language === 'ar' ? 'لا يمكن تجاوز 5% من قيمة طلب الشراء' : 'Cannot exceed 5% of PR value');
      return;
    }

    setIsSubmitting(true);

    try {
      const pr = approvedPRs.find(p => p.id === data.pr_id);
      
      const po = await createPO.mutateAsync({
        title_en: data.title_en,
        title_ar: data.title_ar || data.title_en,
        description: data.description,
        procurement_type: pr?.procurement_type || 'material',
        pr_id: data.pr_id,
        vendor_id: data.vendor_id,
        project_id: deliveryProjectId || pr?.project_id || null,
        cost_center_id: pr?.cost_center_id || null,
        department_id: pr?.department_id || null,
        delivery_date: data.delivery_date || null,
        delivery_address: buildDeliveryAddress(data),
        payment_terms: buildPaymentTerms(data),
        delivery_terms: buildDeliveryTerms(data),
        terms_conditions: data.terms_conditions,
        currency: data.currency,
        subtotal: totals.subtotal,
        tax_amount: totals.tax,
        total_amount: totals.total,
        pr_total_amount: prTotalAmount,
      });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await addItem.mutateAsync({
          poId: po.id,
          data: {
            item_number: i + 1,
            description_en: item.description_en,
            description_ar: item.description_ar,
            quantity: item.quantity,
            unit: item.unit,
            specifications: item.specifications,
            unit_price: item.unit_price,
            total_price: item.total_price,
          },
        });
      }

      // If submitting for approval, initiate workflow
      if (submitForApproval) {
        const result = await initiateWorkflow.mutateAsync({
          referenceId: po.id,
          referenceCode: po.code,
          category: 'purchase_order',
          amount: totals.total,
          currency: data.currency,
          departmentId: pr?.department_id,
        });

        if (result.autoApproved) {
          // Update PO status to approved
          await updatePO.mutateAsync({
            id: po.id,
            data: { status: 'approved' }
          });
          toast.success(language === 'ar' ? 'تم إنشاء واعتماد أمر الشراء' : 'PO created and auto-approved');
        } else {
          // Update PO status to submitted
          await updatePO.mutateAsync({
            id: po.id,
            data: { status: 'submitted', workflow_id: result.workflowId }
          });
          toast.success(language === 'ar' ? 'تم إرسال أمر الشراء للاعتماد' : 'PO submitted for approval');
        }
      } else {
        toast.success(language === 'ar' ? 'تم إنشاء أمر الشراء بنجاح' : 'Purchase Order created successfully');
      }

      navigate('/procurement');
    } catch (error) {
      console.error('Error creating PO:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="New Purchase Order"
          titleAr="أمر شراء جديد"
          description="Create a PO from an approved Purchase Request"
          descriptionAr="إنشاء أمر شراء من طلب شراء معتمد"
          icon={ClipboardList}
        />

        <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                {language === 'ar' ? 'طلبات الشراء المعتمدة' : 'Approved Purchase Requests'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'اختر طلب شراء معتمد لإنشاء أمر الشراء'
                  : 'Select an approved PR to create Purchase Order'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {approvedPRs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{language === 'ar' ? 'لا توجد طلبات شراء معتمدة' : 'No approved PRs available'}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'اختر طلب الشراء' : 'Select Purchase Request'}</Label>
                    <Select
                      value={watch('pr_id') || ''}
                      onValueChange={(v) => setValue('pr_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر طلب شراء معتمد' : 'Select approved PR'} />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedPRs.map((pr) => (
                          <SelectItem key={pr.id} value={pr.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">{pr.code}</Badge>
                              <span className="truncate max-w-[200px]">
                                {language === 'ar' ? pr.title_ar : pr.title_en}
                              </span>
                              <span className="text-muted-foreground">
                                ({pr.currency} {pr.total_amount?.toLocaleString()})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {prAdopted && prTotalAmount > 0 && (
                    <Alert>
                      <FileCheck className="h-4 w-4" />
                      <AlertDescription>
                        {language === 'ar' 
                          ? `تم تحميل بيانات طلب الشراء. القيمة: ${watch('currency')} ${prTotalAmount.toLocaleString()}`
                          : `PR data loaded. Value: ${watch('currency')} ${prTotalAmount.toLocaleString()}`}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'معلومات أمر الشراء' : 'PO Information'}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                    <Input {...register('title_en', { required: true })} placeholder="PO Title" />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</Label>
                    <Input {...register('title_ar')} placeholder="عنوان أمر الشراء" dir="rtl" />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'المورد' : 'Vendor'}</Label>
                    <Select
                      value={watch('vendor_id') || ''}
                      onValueChange={(v) => setValue('vendor_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر مورد' : 'Select vendor'} />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedVendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.code} - {language === 'ar' ? v.company_name_ar : v.company_name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'تاريخ التسليم' : 'Delivery Date'}</Label>
                    <Input type="date" {...register('delivery_date')} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vendor Details Card */}
            {selectedVendor && (
              <div>
                <VendorDetailsCard vendor={selectedVendor} />
              </div>
            )}
          </div>

          {/* Delivery Location */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'موقع التسليم' : 'Delivery Location'}</CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryLocationSelector
                locationType={deliveryLocationType}
                onLocationTypeChange={setDeliveryLocationType}
                projectId={deliveryProjectId}
                onProjectIdChange={setDeliveryProjectId}
                deliveryAddress={watch('delivery_address') || ''}
                onDeliveryAddressChange={(v) => setValue('delivery_address', v)}
                contactPerson={deliveryContactPerson}
                onContactPersonChange={setDeliveryContactPerson}
                contactPhone={deliveryContactPhone}
                onContactPhoneChange={setDeliveryContactPhone}
              />
            </CardContent>
          </Card>

          {/* Payment & Delivery Terms */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'شروط الدفع والتسليم' : 'Payment & Delivery Terms'}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</Label>
                <Select
                  value={watch('payment_terms') || ''}
                  onValueChange={(v) => setValue('payment_terms', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر شروط الدفع' : 'Select payment terms'} />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_PAYMENT_TERMS.map((term) => (
                      <SelectItem key={term.value} value={term.value}>
                        {language === 'ar' ? term.label_ar : term.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'شروط التسليم (INCOTERMS)' : 'Delivery Terms (INCOTERMS)'}</Label>
                <Select
                  value={watch('delivery_terms') || ''}
                  onValueChange={(v) => setValue('delivery_terms', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر شروط التسليم' : 'Select INCOTERMS'} />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOTERMS.map((term) => (
                      <SelectItem key={term.value} value={term.value}>
                        {language === 'ar' ? term.label_ar : term.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showSpecialTerms && (
                <div className="space-y-2 md:col-span-2">
                  <Label>{language === 'ar' ? 'شروط الدفع الخاصة' : 'Special Payment Terms'}</Label>
                  <Textarea
                    {...register('special_payment_terms')}
                    placeholder={language === 'ar' ? 'أدخل شروط الدفع الخاصة...' : 'Enter special payment terms...'}
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>{language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</Label>
                <Textarea
                  {...register('terms_conditions')}
                  placeholder={language === 'ar' ? 'أدخل جميع الشروط والأحكام...' : 'Enter all terms and conditions...'}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'العناصر' : 'Items'}</CardTitle>
              {prAdopted && (
                <CardDescription>
                  {language === 'ar' 
                    ? 'الكميات والأسعار مقفلة من طلب الشراء المعتمد'
                    : 'Quantities and prices are locked from the approved PR'}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <ItemsTable 
                items={items} 
                onChange={setItems} 
                showPricing 
                enableMaterialSearch={!prAdopted}
                lockQuantityPrice={prAdopted}
                readOnly={prAdopted}
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

          {varianceWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{varianceWarning}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/procurement')}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="secondary" disabled={isSubmitting || !!varianceWarning}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {language === 'ar' ? 'حفظ كمسودة' : 'Save as Draft'}
            </Button>
            <Button 
              type="button" 
              disabled={isSubmitting || !!varianceWarning}
              onClick={handleSubmit((data) => onSubmit(data, true))}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {language === 'ar' ? 'إرسال للاعتماد' : 'Submit for Approval'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
