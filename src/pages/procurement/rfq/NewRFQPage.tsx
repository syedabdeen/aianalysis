import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateRFQ, useAddRFQItem, useAddRFQVendor, useCreateRFQFromRFI } from '@/hooks/useRFQ';
import { useRFI, useRFIItems } from '@/hooks/useRFI';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ItemsTable, ItemRow } from '@/components/procurement/ItemsTable';
import { VendorSelector } from '@/components/procurement/VendorSelector';
import { QuickAddVendorDialog } from '@/components/procurement/QuickAddVendorDialog';
import { AdoptRFIDialog } from '@/components/procurement/AdoptRFIDialog';
import { BuyerReassignDialog } from '@/components/procurement/BuyerReassignDialog';
import { Save, Loader2, FileText, FileInput, UserPlus, Info } from 'lucide-react';
import { ProcurementType } from '@/types/procurement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface RFQFormValues {
  title_en: string;
  title_ar: string;
  description: string;
  procurement_type: ProcurementType;
  project_id?: string;
  cost_center_id?: string;
  submission_deadline?: string;
  valid_until?: string;
  terms_conditions?: string;
  assigned_buyer_id?: string;
}

export default function NewRFQPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  const rfiIdFromUrl = searchParams.get('rfi_id');
  
  const { data: projects } = useProjects();
  const createRFQ = useCreateRFQ();
  const createRFQFromRFI = useCreateRFQFromRFI();
  const addItem = useAddRFQItem();
  const addVendor = useAddRFQVendor();

  const [items, setItems] = useState<ItemRow[]>([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Dialog states
  const [showAdoptDialog, setShowAdoptDialog] = useState(false);
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [adoptedRfiId, setAdoptedRfiId] = useState<string | null>(rfiIdFromUrl);
  
  // Get adopted RFI details
  const { data: adoptedRfi } = useRFI(adoptedRfiId || '');
  const { data: adoptedRfiItems } = useRFIItems(adoptedRfiId || '');

  const { register, handleSubmit, setValue, watch, reset, getValues } = useForm<RFQFormValues>({
    defaultValues: {
      procurement_type: 'material',
      project_id: 'none',
      cost_center_id: 'none',
      assigned_buyer_id: '_none',
    },
  });

  const prefilledRfiIdRef = useRef<string | null>(null);
  const prefilledRfiItemsKeyRef = useRef<string>('');

  const procurementType = watch('procurement_type');
  const projectId = watch('project_id');

  // Fetch cost centers, buyers, and categories
  useEffect(() => {
    async function fetchData() {
      const [ccRes, catRes, rolesRes] = await Promise.all([
        supabase.from('cost_centers').select('*').eq('is_active', true),
        supabase.from('inventory_categories').select('*').eq('is_active', true),
        supabase.from('user_roles').select('user_id, role').in('role', ['buyer', 'manager', 'admin']),
      ]);
      
      setCostCenters(ccRes.data || []);
      setCategories(catRes.data || []);
      
      if (rolesRes.data && rolesRes.data.length > 0) {
        const userIds = rolesRes.data.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        setBuyers(profilesData || []);
      }
    }
    fetchData();
  }, []);

  // Populate form when RFI is adopted (run once per RFI id to avoid render loops)
  useEffect(() => {
    if (!adoptedRfiId) {
      prefilledRfiIdRef.current = null;
      return;
    }

    if (!adoptedRfi) return;
    if (prefilledRfiIdRef.current === adoptedRfi.id) return;

    prefilledRfiIdRef.current = adoptedRfi.id;

    const current = getValues();
    reset({
      ...current,
      title_en: adoptedRfi.title_en,
      title_ar: adoptedRfi.title_ar ?? '',
      description: adoptedRfi.description ?? '',
      procurement_type: adoptedRfi.procurement_type,
      project_id: adoptedRfi.project_id ?? 'none',
      cost_center_id: adoptedRfi.cost_center_id ?? 'none',
    });
  }, [adoptedRfiId, adoptedRfi?.id, getValues, reset]);

  // Populate items when RFI items are loaded
  useEffect(() => {
    const key = (adoptedRfiItems ?? []).map((i) => i.id).join('|');

    if (!key) {
      prefilledRfiItemsKeyRef.current = '';
      return;
    }

    if (prefilledRfiItemsKeyRef.current === key) return;
    prefilledRfiItemsKeyRef.current = key;

    const formattedItems: ItemRow[] = (adoptedRfiItems ?? []).map((item, index) => ({
      id: item.id,
      item_number: item.item_number || index + 1,
      description_en: item.description_en,
      description_ar: item.description_ar,
      quantity: item.quantity,
      unit: item.unit,
      specifications: item.specifications || '',
    }));

    if (formattedItems.length > 0) setItems(formattedItems);
  }, [adoptedRfiItems]);

  // Get category IDs for vendor filtering based on project or items
  const getCategoryIdsForFilter = (): string[] => {
    // If we have items with specific categories, use those
    // For now, we'll return empty to show all vendors, but this can be enhanced
    return [];
  };

  const handleAdoptRFI = async (rfiId: string) => {
    setAdoptedRfiId(rfiId);
    setShowAdoptDialog(false);
  };

  const handleQuickCreateFromRFI = async (rfiId: string) => {
    try {
      const rfq = await createRFQFromRFI.mutateAsync(rfiId);
      toast.success(language === 'ar' ? 'تم إنشاء طلب عرض الأسعار بنجاح' : 'RFQ created from RFI successfully');
      navigate(`/procurement/rfq/${rfq.id}`);
    } catch (error) {
      console.error('Error creating RFQ from RFI:', error);
    }
  };

  const handleVendorCreated = (vendorId: string) => {
    setSelectedVendorIds(prev => [...prev, vendorId]);
    queryClient.invalidateQueries({ queryKey: ['vendors'] });
  };

  const onSubmit = async (data: RFQFormValues) => {
    if (items.length === 0) {
      toast.error(language === 'ar' ? 'يرجى إضافة عنصر واحد على الأقل' : 'Please add at least one item');
      return;
    }

    setIsSubmitting(true);

    try {
      const rfq = await createRFQ.mutateAsync({
        title_en: data.title_en,
        title_ar: data.title_ar || data.title_en,
        description: data.description,
        procurement_type: data.procurement_type,
        rfi_id: adoptedRfiId || undefined,
        project_id: data.project_id && data.project_id !== 'none' ? data.project_id : undefined,
        cost_center_id: data.cost_center_id && data.cost_center_id !== 'none' ? data.cost_center_id : undefined,
        submission_deadline: data.submission_deadline || undefined,
        valid_until: data.valid_until || undefined,
        terms_conditions: data.terms_conditions,
      });

      // Update RFQ with buyer assignment if specified
      if (data.assigned_buyer_id && data.assigned_buyer_id !== '_none') {
        await supabase
          .from('rfqs')
          .update({ assigned_buyer_id: data.assigned_buyer_id })
          .eq('id', rfq.id);
      }

      // Mark as standalone if no RFI
      if (!adoptedRfiId) {
        await supabase
          .from('rfqs')
          .update({ is_standalone: true })
          .eq('id', rfq.id);
      }

      for (const item of items) {
        await addItem.mutateAsync({
          rfqId: rfq.id,
          data: {
            description_en: item.description_en,
            description_ar: item.description_ar,
            quantity: item.quantity,
            unit: item.unit,
            specifications: item.specifications,
          },
        });
      }

      for (const vendorId of selectedVendorIds) {
        await addVendor.mutateAsync({ rfqId: rfq.id, vendorId });
      }

      // Update RFI status if adopted
      if (adoptedRfiId) {
        await supabase
          .from('rfis')
          .update({ status: 'completed' })
          .eq('id', adoptedRfiId);
      }

      toast.success(language === 'ar' ? 'تم إنشاء طلب عرض الأسعار بنجاح' : 'RFQ created successfully');
      navigate('/procurement');
    } catch (error) {
      console.error('Error creating RFQ:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStandalone = !adoptedRfiId;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="New RFQ"
          titleAr="طلب عرض أسعار جديد"
          description="Request quotations from vendors"
          descriptionAr="طلب عروض أسعار من الموردين"
          icon={FileText}
        />

        {/* Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'نوع طلب عرض الأسعار' : 'RFQ Type'}</CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'اختر إنشاء طلب عرض أسعار من طلب معلومات موجود أو إنشاء طلب جديد مستقل'
                : 'Choose to create RFQ from existing RFI or create a standalone RFQ'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button
              type="button"
              variant={adoptedRfiId ? "default" : "outline"}
              onClick={() => setShowAdoptDialog(true)}
            >
              <FileInput className="h-4 w-4 mr-2" />
              {adoptedRfiId 
                ? (language === 'ar' ? `تم التحويل من ${adoptedRfi?.code}` : `Adopted from ${adoptedRfi?.code}`)
                : (language === 'ar' ? 'تحويل من طلب معلومات' : 'Adopt from RFI')
              }
            </Button>
            {adoptedRfiId && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAdoptedRfiId(null);
                  reset();
                  setItems([]);
                }}
              >
                {language === 'ar' ? 'إلغاء التحويل' : 'Clear RFI'}
              </Button>
            )}
          </CardContent>
        </Card>

        {isStandalone && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {language === 'ar' 
                ? 'أنت تقوم بإنشاء طلب عرض أسعار مستقل بدون طلب معلومات'
                : 'You are creating a standalone RFQ without an RFI'}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'معلومات أساسية' : 'Basic Information'}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                <Input {...register('title_en', { required: true })} placeholder="RFQ Title" />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</Label>
                <Input {...register('title_ar')} placeholder="عنوان طلب عرض الأسعار" dir="rtl" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                <Textarea {...register('description')} placeholder="Detailed description..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                <Select
                  value={watch('procurement_type')}
                  onValueChange={(v) => setValue('procurement_type', v as ProcurementType)}
                >
                  <SelectTrigger>
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
                <Label>{language === 'ar' ? 'المشروع' : 'Project'}</Label>
                <Select
                  value={watch('project_id') ?? 'none'}
                  onValueChange={(v) => setValue('project_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر مشروع' : 'Select project'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{language === 'ar' ? 'بدون مشروع' : 'No project'}</SelectItem>
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
                  value={watch('cost_center_id') ?? 'none'}
                  onValueChange={(v) => setValue('cost_center_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر مركز تكلفة' : 'Select cost center'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} - {language === 'ar' ? cc.name_ar : cc.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'تعيين إلى مشتري' : 'Assign to Buyer'}</Label>
                <Select
                  value={watch('assigned_buyer_id') ?? '_none'}
                  onValueChange={(v) => setValue('assigned_buyer_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر مشتري' : 'Select buyer'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{language === 'ar' ? 'بدون تعيين' : 'Unassigned'}</SelectItem>
                    {buyers.map((buyer) => (
                      <SelectItem key={buyer.id} value={buyer.id}>
                        {buyer.full_name || buyer.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الموعد النهائي للتقديم' : 'Submission Deadline'}</Label>
                <Input type="datetime-local" {...register('submission_deadline')} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'صالح حتى' : 'Valid Until'}</Label>
                <Input type="date" {...register('valid_until')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</Label>
                <Textarea {...register('terms_conditions')} placeholder="Terms and conditions..." rows={3} />
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
                enableMaterialSearch={procurementType === 'material'} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'الموردون' : 'Vendors'}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'اختر الموردين لإرسال طلب عرض الأسعار إليهم'
                  : 'Select vendors to send the RFQ to'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VendorSelector
                selectedVendorIds={selectedVendorIds}
                onChange={setSelectedVendorIds}
                categoryIds={getCategoryIdsForFilter()}
                onAddNewVendor={() => setShowAddVendorDialog(true)}
              />
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

      {/* Dialogs */}
      <AdoptRFIDialog
        open={showAdoptDialog}
        onOpenChange={setShowAdoptDialog}
        onAdoptRFI={handleAdoptRFI}
      />

      <QuickAddVendorDialog
        open={showAddVendorDialog}
        onOpenChange={setShowAddVendorDialog}
        onVendorCreated={handleVendorCreated}
      />
    </DashboardLayout>
  );
}
