import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVendorCategories, useCreateVendor } from '@/hooks/useVendors';
import { VendorFormData, VendorType } from '@/types/vendor';
import { useDocumentExtraction } from '@/hooks/useDocumentExtraction';
import { DocumentExtractionResult, ALLOWED_FILE_TYPES, DOCUMENT_CLASSIFICATIONS } from '@/types/document';
import { Building2, FileText, Users, CreditCard, ArrowLeft, ArrowRight, Loader2, Plus, Trash2, Upload, Brain, CheckCircle, XCircle, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/ui/phone-input';

const basicInfoSchema = z.object({
  company_name_en: z.string().min(2, 'Company name is required'),
  company_name_ar: z.string().optional(),
  vendor_type: z.enum(['material', 'service', 'subcontractor']),
  category_ids: z.array(z.string()).optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
});

const businessDetailsSchema = z.object({
  trade_license_no: z.string().optional(),
  trade_license_expiry: z.string().optional(),
  tax_registration_no: z.string().optional(),
  address_en: z.string().optional(),
  address_ar: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('UAE'),
});

const steps = [
  { id: 1, icon: Upload, labelEn: 'Documents', labelAr: 'المستندات' },
  { id: 2, icon: Building2, labelEn: 'Basic Info', labelAr: 'المعلومات الأساسية' },
  { id: 3, icon: FileText, labelEn: 'Business Details', labelAr: 'تفاصيل العمل' },
  { id: 4, icon: Users, labelEn: 'Contacts', labelAr: 'جهات الاتصال' },
  { id: 5, icon: CreditCard, labelEn: 'Bank Details', labelAr: 'التفاصيل المصرفية' },
];

interface VendorFormProps {
  initialData?: Partial<VendorFormData>;
  onSubmit?: (data: VendorFormData) => void;
  isEditing?: boolean;
}

export function VendorForm({ initialData, onSubmit, isEditing = false }: VendorFormProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { data: categories = [] } = useVendorCategories();
  const createVendor = useCreateVendor();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<VendorFormData>>({
    vendor_type: 'material',
    country: 'UAE',
    contacts: [],
    bank_details: [],
    ...initialData,
  });

  // Step 1 Form
  const basicForm = useForm({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      company_name_en: formData.company_name_en || '',
      company_name_ar: formData.company_name_ar || '',
      vendor_type: formData.vendor_type || 'material',
      category_ids: formData.category_ids || [],
      email: formData.email || '',
      phone: formData.phone || '',
      website: formData.website || '',
    },
  });

  // Step 2 Form
  const businessForm = useForm({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      trade_license_no: formData.trade_license_no || '',
      trade_license_expiry: formData.trade_license_expiry || '',
      tax_registration_no: formData.tax_registration_no || '',
      address_en: formData.address_en || '',
      address_ar: formData.address_ar || '',
      city: formData.city || '',
      country: formData.country || 'UAE',
    },
  });

  // Step 3 - Contacts
  const [contacts, setContacts] = useState(formData.contacts || []);

  // Step 4 - Bank Details  
  const [bankDetails, setBankDetails] = useState(formData.bank_details || []);

  const [notes, setNotes] = useState(formData.notes || '');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useState<HTMLInputElement | null>(null);

  // Apply extracted data to form fields
  const applyExtractedData = useCallback((extractedData: DocumentExtractionResult) => {
    if (!extractedData?.extractedFields) {
      console.log('No extracted fields found');
      return;
    }

    const fields = extractedData.extractedFields;
    let appliedCount = 0;
    
    console.log('Applying extracted fields to form:', fields);
    
    for (const field of fields) {
      const key = field.key?.toLowerCase()?.replace(/[\s-]/g, '_') || '';
      const value = field.value;
      
      if (!value) continue;
      
      console.log(`Processing field: ${key} = ${value}`);

      // === BASIC INFO FIELDS ===
      // Company names - exact keys or pattern match
      if (key === 'company_name_en' || (key.includes('company') && key.includes('name') && key.includes('en'))) {
        console.log('Setting company_name_en:', value);
        basicForm.setValue('company_name_en', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      }
      if (key === 'company_name_ar' || (key.includes('company') && key.includes('name') && key.includes('ar'))) {
        console.log('Setting company_name_ar:', value);
        basicForm.setValue('company_name_ar', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      }
      // Fallback for company name without language suffix
      if ((key === 'company_name' || key === 'company' || key === 'name') && !key.includes('account')) {
        basicForm.setValue('company_name_en', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      }
      if (key === 'email' || key.includes('email')) {
        basicForm.setValue('email', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      }
      if (key === 'phone' || key === 'telephone' || key.includes('phone') || key.includes('mobile')) {
        basicForm.setValue('phone', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      }
      if (key === 'website' || key === 'web' || key.includes('website')) {
        basicForm.setValue('website', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      }

      // === BUSINESS DETAILS FIELDS ===
      // Trade license number - exact keys or pattern match
      if (key === 'trade_license_no' || key === 'license_no' || key === 'license_number' || 
          key === 'trade_license_number' || key.includes('license_no') || key.includes('license_number')) {
        console.log('Setting trade_license_no:', value);
        businessForm.setValue('trade_license_no', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      }
      // Trade license expiry - exact keys or pattern match  
      if (key === 'trade_license_expiry' || key === 'license_expiry' || key === 'expiry_date' || 
          key === 'expiry' || key === 'valid_until' || key === 'validity' || 
          key.includes('expiry') || key.includes('valid_until')) {
        console.log('Setting trade_license_expiry:', value);
        businessForm.setValue('trade_license_expiry', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      }
      // Tax registration number (TRN)
      if (key === 'tax_registration_no' || key === 'trn' || key === 'tax_number' || 
          key === 'vat_number' || key === 'tax_registration_number' ||
          key.includes('trn') || key.includes('tax_registration') || key.includes('vat')) {
        console.log('Setting tax_registration_no:', value);
        businessForm.setValue('tax_registration_no', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      }
      // Address fields - for general "address", set to BOTH English and Arabic fields
      if (key === 'address_en') {
        console.log('Setting address_en:', value);
        businessForm.setValue('address_en', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      } else if (key === 'address_ar') {
        console.log('Setting address_ar:', value);
        businessForm.setValue('address_ar', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      } else if (key === 'address' || (key.includes('address') && !key.includes('ar') && !key.includes('en'))) {
        // Generic address - set to both fields
        console.log('Setting address (both):', value);
        businessForm.setValue('address_en', String(value), { shouldDirty: true, shouldTouch: true });
        businessForm.setValue('address_ar', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount += 2;
      }
      // City
      if (key === 'city' || key.includes('city')) {
        console.log('Setting city:', value);
        businessForm.setValue('city', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      }
      // Country
      if (key === 'country' || key.includes('country')) {
        console.log('Setting country:', value);
        businessForm.setValue('country', String(value), { shouldDirty: true, shouldTouch: true });
        appliedCount++;
      }

      // === CONTACTS FIELDS ===
      // Contact name
      if (key === 'contact_name' || key === 'contact_person' || key === 'authorized_signatory' ||
          key.includes('contact_name') || key.includes('signatory')) {
        // Add as a contact if not already present
        const existingContact = contacts.find(c => c.name === String(value));
        if (!existingContact) {
          setContacts(prev => [...prev, { 
            name: String(value), 
            designation: '', 
            email: '', 
            phone: '', 
            is_primary: prev.length === 0 
          }]);
          appliedCount++;
        }
      }
      // Contact designation/title
      if (key === 'designation' || key === 'title' || key === 'position' || key.includes('designation')) {
        if (contacts.length > 0) {
          setContacts(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1].designation = String(value);
            }
            return updated;
          });
          appliedCount++;
        }
      }
    }

    // Handle bank details classification
    if (extractedData.classification === 'bank_details') {
      const newBankDetail: any = { 
        bank_name: '', 
        account_name: '', 
        account_number: '',
        iban: '',
        swift_code: '',
        currency: 'AED', 
        is_primary: bankDetails.length === 0 
      };
      
      for (const field of fields) {
        const key = field.key?.toLowerCase() || '';
        const value = field.value;
        if (!value) continue;

        if (key.includes('bank') && key.includes('name')) {
          newBankDetail.bank_name = String(value);
        }
        if (key.includes('account') && key.includes('name')) {
          newBankDetail.account_name = String(value);
        }
        if (key.includes('account') && key.includes('number')) {
          newBankDetail.account_number = String(value);
        }
        if (key.includes('iban')) {
          newBankDetail.iban = String(value);
        }
        if (key.includes('swift')) {
          newBankDetail.swift_code = String(value);
        }
      }

      if (newBankDetail.bank_name && newBankDetail.account_number) {
        setBankDetails(prev => [...prev, newBankDetail]);
        appliedCount++;
      }
    }

    if (appliedCount > 0) {
      toast.success(isRTL ? `تم تطبيق ${appliedCount} حقول` : `Applied ${appliedCount} fields from document`);
    }
  }, [basicForm, businessForm, bankDetails.length, contacts, isRTL]);

  // Document extraction hook with callback
  const {
    extractionStates,
    addAndExtract,
    removeFile,
    clearCompleted,
    isExtracting,
  } = useDocumentExtraction(applyExtractedData);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addAndExtract(files);
    }
  }, [addAndExtract]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addAndExtract(files);
    }
    e.target.value = '';
  }, [addAndExtract]);

  const handleNext = async () => {
    if (currentStep === 1) {
      // Documents step - just proceed
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await basicForm.trigger();
      if (valid) {
        setFormData({ ...formData, ...basicForm.getValues() });
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      const valid = await businessForm.trigger();
      if (valid) {
        setFormData({ ...formData, ...businessForm.getValues() });
        setCurrentStep(4);
      }
    } else if (currentStep === 4) {
      setFormData({ ...formData, contacts });
      setCurrentStep(5);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const basicValues = basicForm.getValues();
    const businessValues = businessForm.getValues();
    
    const finalData: VendorFormData = {
      ...formData,
      ...basicValues,
      ...businessValues,
      // Auto-fill Arabic fields from English if not provided
      company_name_ar: basicValues.company_name_ar || basicValues.company_name_en,
      address_ar: businessValues.address_ar || businessValues.address_en,
      contacts,
      bank_details: bankDetails,
      notes,
    } as VendorFormData;

    if (onSubmit) {
      onSubmit(finalData);
    } else {
      await createVendor.mutateAsync(finalData);
      navigate('/vendors');
    }
  };

  const addContact = () => {
    setContacts([...contacts, { name: '', designation: '', email: '', phone: '', is_primary: contacts.length === 0 }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: string, value: any) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const addBankDetail = () => {
    setBankDetails([...bankDetails, { bank_name: '', account_name: '', account_number: '', iban: '', swift_code: '', currency: 'AED', is_primary: bankDetails.length === 0 }]);
  };

  const removeBankDetail = (index: number) => {
    setBankDetails(bankDetails.filter((_, i) => i !== index));
  };

  const updateBankDetail = (index: number, field: string, value: any) => {
    const updated = [...bankDetails];
    updated[index] = { ...updated[index], [field]: value };
    setBankDetails(updated);
  };

  const typeOptions: { value: VendorType; labelEn: string; labelAr: string }[] = [
    { value: 'material', labelEn: 'Material Supplier', labelAr: 'مورد مواد' },
    { value: 'service', labelEn: 'Service Provider', labelAr: 'مزود خدمات' },
    { value: 'subcontractor', labelEn: 'Subcontractor', labelAr: 'مقاول باطن' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors',
                  isActive ? 'bg-primary text-primary-foreground border-primary' :
                  isCompleted ? 'bg-primary/20 text-primary border-primary' :
                  'bg-muted text-muted-foreground border-border'
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn(
                  'mt-2 text-sm font-medium text-center',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {isRTL ? step.labelAr : step.labelEn}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-4',
                  isCompleted ? 'bg-primary' : 'bg-border'
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Documents (AI-powered extraction) */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {isRTL ? 'المستندات' : 'Documents'}
            </CardTitle>
            <CardDescription>
              {isRTL 
                ? 'قم برفع المستندات مثل الرخصة التجارية، شهادة ضريبة القيمة المضافة، تفاصيل البنك. سيقوم الذكاء الاصطناعي باستخراج البيانات تلقائياً وملء النموذج.'
                : 'Upload documents like Trade License, VAT Certificate, Bank Details. AI will auto-extract data and fill the form.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  {isRTL ? 'استخراج البيانات بالذكاء الاصطناعي' : 'AI-Powered Data Extraction'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? 'عند رفع المستندات، سيقوم النظام تلقائياً بـ: 1) تصنيف نوع المستند 2) استخراج البيانات الرئيسية 3) ملء حقول المورد المناسبة'
                  : 'When you upload documents, the system will automatically: 1) Classify document type 2) Extract key data 3) Fill appropriate vendor fields'}
              </p>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                multiple
                accept={Object.keys(ALLOWED_FILE_TYPES).join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium">
                {isRTL ? 'اسحب وأفلت الملفات هنا' : 'Drag & drop files here'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL ? 'أو انقر لاختيار الملفات (PDF, Word, صور)' : 'or click to select files (PDF, Word, Images)'}
              </p>
            </div>

            {/* Extraction States */}
            {extractionStates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {isRTL ? 'المستندات المرفوعة' : 'Uploaded Documents'}
                  </span>
                  {extractionStates.some(s => s.status === 'completed') && (
                    <Button variant="ghost" size="sm" onClick={clearCompleted}>
                      {isRTL ? 'مسح المكتملة' : 'Clear completed'}
                    </Button>
                  )}
                </div>
                {extractionStates.map((state) => (
                  <div key={state.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                    <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{state.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {state.status === 'extracting' && (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {isRTL ? 'جاري الاستخراج...' : 'Extracting data...'}
                            </span>
                          </>
                        )}
                        {state.status === 'completed' && (
                          <>
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                            <span className="text-xs text-emerald-600">
                              {isRTL ? 'تم الاستخراج' : 'Extracted'}
                            </span>
                            {state.result?.classification && (
                              <Badge variant="secondary" className="text-xs">
                                {DOCUMENT_CLASSIFICATIONS.find(c => c.value === state.result?.classification)?.labelEn || state.result.classification}
                              </Badge>
                            )}
                            {state.result?.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {state.result.confidence}% confident
                              </Badge>
                            )}
                          </>
                        )}
                        {state.status === 'error' && (
                          <>
                            <XCircle className="h-3 w-3 text-destructive" />
                            <span className="text-xs text-destructive">{state.error}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(state.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {isRTL
                ? 'يمكنك تخطي هذه الخطوة وإدخال البيانات يدوياً، أو رفع المستندات لاحقاً.'
                : 'You can skip this step and enter data manually, or upload documents later.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Basic Info */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? 'المعلومات الأساسية' : 'Basic Information'}</CardTitle>
            <CardDescription>{isRTL ? 'أدخل معلومات الشركة الأساسية' : 'Enter basic company information'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...basicForm}>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={basicForm.control}
                    name="company_name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'اسم الشركة (إنجليزي)' : 'Company Name (English)'}</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Company LLC" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={basicForm.control}
                    name="company_name_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)'}</FormLabel>
                        <FormControl>
                          <Input placeholder="شركة أ ب ج ذ.م.م" dir="rtl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={basicForm.control}
                    name="vendor_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'نوع المورد' : 'Vendor Type'}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {typeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {isRTL ? opt.labelAr : opt.labelEn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={basicForm.control}
                    name="category_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'الفئات' : 'Categories'}</FormLabel>
                        <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                          {categories.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              {isRTL ? 'لا توجد فئات' : 'No categories available'}
                            </p>
                          ) : (
                            categories.map((cat) => {
                              const isSelected = field.value?.includes(cat.id);
                              return (
                                <label
                                  key={cat.id}
                                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const newValue = e.target.checked
                                        ? [...(field.value || []), cat.id]
                                        : (field.value || []).filter((id: string) => id !== cat.id);
                                      field.onChange(newValue);
                                    }}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  <span className="text-sm">
                                    {isRTL ? cat.name_ar : cat.name_en}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                        {field.value && field.value.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {field.value.map((catId: string) => {
                              const cat = categories.find(c => c.id === catId);
                              return cat ? (
                                <Badge key={catId} variant="secondary" className="text-xs">
                                  {isRTL ? cat.name_ar : cat.name_en}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={basicForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? 'البريد الإلكتروني' : 'Email'}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={basicForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'الهاتف' : 'Phone'}</FormLabel>
                        <FormControl>
                          <Input placeholder="+971 4 XXX XXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={basicForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'الموقع الإلكتروني' : 'Website'}</FormLabel>
                        <FormControl>
                          <Input placeholder="https://company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Business Details */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? 'تفاصيل العمل' : 'Business Details'}</CardTitle>
            <CardDescription>{isRTL ? 'أدخل تفاصيل الترخيص والضرائب' : 'Enter license and tax details'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...businessForm}>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={businessForm.control}
                    name="trade_license_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'رقم الرخصة التجارية' : 'Trade License No.'}</FormLabel>
                        <FormControl>
                          <Input placeholder="TL-123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={businessForm.control}
                    name="trade_license_expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'تاريخ انتهاء الرخصة' : 'License Expiry Date'}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={businessForm.control}
                  name="tax_registration_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? 'رقم التسجيل الضريبي (TRN)' : 'Tax Registration No. (TRN)'}</FormLabel>
                      <FormControl>
                        <Input placeholder="100XXXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={businessForm.control}
                    name="address_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'العنوان (إنجليزي)' : 'Address (English)'}</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Full address..." rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={businessForm.control}
                    name="address_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'العنوان (عربي)' : 'Address (Arabic)'}</FormLabel>
                        <FormControl>
                          <Textarea placeholder="العنوان الكامل..." dir="rtl" rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={businessForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'المدينة' : 'City'}</FormLabel>
                        <FormControl>
                          <Input placeholder="Dubai" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={businessForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'الدولة' : 'Country'}</FormLabel>
                        <FormControl>
                          <Input placeholder="UAE" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Contacts */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? 'جهات الاتصال' : 'Contact Persons'}</CardTitle>
            <CardDescription>{isRTL ? 'أضف جهات الاتصال للمورد' : 'Add contact persons for the vendor'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contacts.map((contact, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {isRTL ? `جهة الاتصال ${index + 1}` : `Contact ${index + 1}`}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => removeContact(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder={isRTL ? 'الاسم' : 'Name'}
                    value={contact.name}
                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                  />
                  <Input
                    placeholder={isRTL ? 'المسمى الوظيفي' : 'Designation'}
                    value={contact.designation}
                    onChange={(e) => updateContact(index, 'designation', e.target.value)}
                  />
                  <Input
                    type="email"
                    placeholder={isRTL ? 'البريد الإلكتروني' : 'Email'}
                    value={contact.email}
                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                  />
                  <PhoneInput
                    placeholder={isRTL ? 'الهاتف' : 'Phone'}
                    value={contact.phone}
                    onChange={(value) => updateContact(index, 'phone', value)}
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={addContact}>
              <Plus className="h-4 w-4 me-2" />
              {isRTL ? 'إضافة جهة اتصال' : 'Add Contact'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Bank Details */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? 'التفاصيل المصرفية' : 'Bank Details'}</CardTitle>
            <CardDescription>{isRTL ? 'أضف معلومات الحساب البنكي' : 'Add bank account information'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bankDetails.map((bank, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {isRTL ? `الحساب ${index + 1}` : `Account ${index + 1}`}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => removeBankDetail(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder={isRTL ? 'اسم البنك' : 'Bank Name'}
                    value={bank.bank_name}
                    onChange={(e) => updateBankDetail(index, 'bank_name', e.target.value)}
                  />
                  <Input
                    placeholder={isRTL ? 'اسم الحساب' : 'Account Name'}
                    value={bank.account_name}
                    onChange={(e) => updateBankDetail(index, 'account_name', e.target.value)}
                  />
                  <Input
                    placeholder={isRTL ? 'رقم الحساب' : 'Account Number'}
                    value={bank.account_number}
                    onChange={(e) => updateBankDetail(index, 'account_number', e.target.value)}
                  />
                  <Input
                    placeholder="IBAN"
                    value={bank.iban}
                    onChange={(e) => updateBankDetail(index, 'iban', e.target.value)}
                  />
                  <Input
                    placeholder="SWIFT Code"
                    value={bank.swift_code}
                    onChange={(e) => updateBankDetail(index, 'swift_code', e.target.value)}
                  />
                  <Input
                    placeholder={isRTL ? 'العملة' : 'Currency'}
                    value={bank.currency}
                    onChange={(e) => updateBankDetail(index, 'currency', e.target.value)}
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={addBankDetail}>
              <Plus className="h-4 w-4 me-2" />
              {isRTL ? 'إضافة حساب بنكي' : 'Add Bank Account'}
            </Button>

            <div className="pt-4">
              <label className="text-sm font-medium">{isRTL ? 'ملاحظات' : 'Notes'}</label>
              <Textarea
                className="mt-2"
                rows={3}
                placeholder={isRTL ? 'ملاحظات إضافية...' : 'Additional notes...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? () => navigate('/vendors') : handleBack}
        >
          {isRTL ? <ArrowRight className="h-4 w-4 me-2" /> : <ArrowLeft className="h-4 w-4 me-2" />}
          {currentStep === 1 ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'السابق' : 'Back')}
        </Button>

        {currentStep < 5 ? (
          <Button onClick={handleNext}>
            {isRTL ? 'التالي' : 'Next'}
            {isRTL ? <ArrowLeft className="h-4 w-4 ms-2" /> : <ArrowRight className="h-4 w-4 ms-2" />}
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createVendor.isPending}>
            {createVendor.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {isRTL ? (isEditing ? 'تحديث' : 'إنشاء المورد') : (isEditing ? 'Update' : 'Create Vendor')}
          </Button>
        )}
      </div>
    </div>
  );
}
