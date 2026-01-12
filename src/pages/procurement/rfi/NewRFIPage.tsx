import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateRFI, useAddRFIItem } from '@/hooks/useRFI';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ItemsTable, ItemRow } from '@/components/procurement/ItemsTable';
import { Save, Loader2, FileQuestion, Upload, FileText, Trash2 } from 'lucide-react';
import { ProcurementType, Priority } from '@/types/procurement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RFIFormValues {
  title_en: string;
  title_ar: string;
  description: string;
  procurement_type: ProcurementType;
  project_id?: string;
  cost_center_id?: string;
  due_date?: string;
  priority: string;
  assigned_buyer_id?: string;
  service_description?: string;
}

export default function NewRFIPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const createRFI = useCreateRFI();
  const addItem = useAddRFIItem();

  const [items, setItems] = useState<ItemRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceDocuments, setServiceDocuments] = useState<File[]>([]);
  const [uploadedDocPaths, setUploadedDocPaths] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RFIFormValues>({
    defaultValues: {
      priority: 'medium',
      procurement_type: 'material',
    },
  });

  const procurementType = watch('procurement_type');
  const isMaterial = procurementType === 'material';

  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);

  React.useEffect(() => {
    async function fetchData() {
      // Fetch cost centers
      const { data: ccData } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('is_active', true);
      setCostCenters(ccData || []);

      // Fetch buyers (users with buyer or manager role)
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['buyer', 'manager', 'admin']);
      
      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        setBuyers(profilesData || []);
      }
    }
    fetchData();
  }, []);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setServiceDocuments(prev => [...prev, ...files]);
  };

  const removeDocument = (index: number) => {
    setServiceDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async (): Promise<string[]> => {
    const paths: string[] = [];
    for (const file of serviceDocuments) {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('rfi-documents')
        .upload(fileName, file);
      
      if (error) {
        console.error('Error uploading document:', error);
        continue;
      }
      paths.push(data.path);
    }
    return paths;
  };

  const onSubmit = async (data: RFIFormValues) => {
    // For material type, require at least one item
    if (isMaterial && items.length === 0) {
      toast.error(language === 'ar' ? 'يرجى إضافة عنصر واحد على الأقل' : 'Please add at least one item');
      return;
    }

    // For service/subcontract, require service description
    if (!isMaterial && !data.service_description?.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال وصف الخدمة' : 'Please enter service description');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload service documents if any
      let docPaths: string[] = [];
      if (!isMaterial && serviceDocuments.length > 0) {
        docPaths = await uploadDocuments();
      }

      // Create RFI
      const rfi = await createRFI.mutateAsync({
        title_en: data.title_en,
        title_ar: data.title_ar || data.title_en,
        description: data.description,
        procurement_type: data.procurement_type,
        project_id: data.project_id || undefined,
        cost_center_id: data.cost_center_id || undefined,
        due_date: data.due_date || undefined,
        priority: data.priority as Priority,
        assigned_buyer_id: data.assigned_buyer_id || undefined,
        service_description: data.service_description || undefined,
        service_documents: docPaths.length > 0 ? docPaths : undefined,
      });

      // Add items (only for material type)
      if (isMaterial) {
        for (const item of items) {
          await addItem.mutateAsync({
            rfiId: rfi.id,
            data: {
              description_en: item.description_en,
              description_ar: item.description_ar,
              quantity: item.quantity,
              unit: item.unit,
              specifications: item.specifications,
            },
          });
        }
      }

      toast.success(language === 'ar' ? 'تم إنشاء طلب المعلومات بنجاح' : 'RFI created successfully');
      navigate('/procurement');
    } catch (error) {
      console.error('Error creating RFI:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="New RFI"
          titleAr="طلب معلومات جديد"
          description="Request information from vendors"
          descriptionAr="إنشاء طلب معلومات من الموردين"
          icon={FileQuestion}
        />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'معلومات أساسية' : 'Basic Information'}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                <Input {...register('title_en', { required: true })} placeholder="RFI Title" />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}</Label>
                <Input {...register('title_ar')} placeholder="عنوان طلب المعلومات" dir="rtl" />
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
                <Label>{language === 'ar' ? 'الأولوية' : 'Priority'}</Label>
                <Select
                  value={watch('priority')}
                  onValueChange={(v) => setValue('priority', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</SelectItem>
                    <SelectItem value="medium">{language === 'ar' ? 'متوسطة' : 'Medium'}</SelectItem>
                    <SelectItem value="high">{language === 'ar' ? 'عالية' : 'High'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المشروع' : 'Project'}</Label>
                <Select
                  value={watch('project_id') || '_none'}
                  onValueChange={(v) => setValue('project_id', v === '_none' ? undefined : v)}
                >
                  <SelectTrigger>
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
                >
                  <SelectTrigger>
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
                <Label>{language === 'ar' ? 'تعيين إلى مشتري' : 'Assign to Buyer'}</Label>
                <Select
                  value={watch('assigned_buyer_id') || '_none'}
                  onValueChange={(v) => setValue('assigned_buyer_id', v === '_none' ? undefined : v)}
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
                <Label>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                <Input type="date" {...register('due_date')} />
              </div>
            </CardContent>
          </Card>

          {/* Items Section - Only for Material type */}
          {isMaterial && (
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'العناصر' : 'Items'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ItemsTable items={items} onChange={setItems} enableMaterialSearch={isMaterial} />
              </CardContent>
            </Card>
          )}

          {/* Service Description Section - For Service/Subcontract type */}
          {!isMaterial && (
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'تفاصيل الخدمة' : 'Service Details'}</CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'أدخل وصف الخدمة أو العقد من الباطن والمستندات ذات الصلة'
                    : 'Enter the service or subcontract description and relevant documents'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'وصف الخدمة' : 'Service Description'}</Label>
                  <Textarea 
                    {...register('service_description')} 
                    placeholder={language === 'ar' ? 'أدخل وصفاً تفصيلياً للخدمة المطلوبة...' : 'Enter detailed description of the required service...'}
                    rows={6}
                    className="min-h-[150px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'المستندات' : 'Documents'}</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="service-docs"
                      multiple
                      onChange={handleDocumentUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                    <label htmlFor="service-docs" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'انقر لرفع المستندات' : 'Click to upload documents'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, Word, Excel, Images
                      </p>
                    </label>
                  </div>
                  
                  {serviceDocuments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {serviceDocuments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
          </Card>
          )}

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