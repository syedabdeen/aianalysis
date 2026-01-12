import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useVendor, useApproveVendor, useVendorAI } from '@/hooks/useVendors';
import { VendorStatusBadge } from '@/components/vendors/VendorStatusBadge';
import { VendorTypeBadge } from '@/components/vendors/VendorTypeBadge';
import { VendorRatingDisplay } from '@/components/vendors/VendorRatingDisplay';
import { VendorRiskScore } from '@/components/vendors/VendorRiskScore';
import { VendorApprovalDialog } from '@/components/vendors/VendorApprovalDialog';
import { VendorDocumentCenter } from '@/components/vendors/documents/VendorDocumentCenter';
import { useApplyDocumentMappings, useApplyBankDetailsFromDocument } from '@/hooks/useApplyDocumentMappings';
import { VendorDocumentWithExtraction } from '@/types/document';
import { 
  Building2, Mail, Phone, Globe, MapPin, FileText, 
  CreditCard, Users, Brain, Edit, Loader2,
  Calendar, Hash, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { hasRole } = useAuth();

  const { data: vendor, isLoading } = useVendor(id!);
  const approveVendor = useApproveVendor();
  const vendorAI = useVendorAI();
  const applyMappings = useApplyDocumentMappings();
  const applyBankDetails = useApplyBankDetailsFromDocument();

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [isCalculatingRisk, setIsCalculatingRisk] = useState(false);

  const isAdmin = hasRole('admin');

  const handleApproval = async (newStatus: any, notes?: string) => {
    await approveVendor.mutateAsync({ id: id!, status: newStatus, notes });
    setApprovalDialogOpen(false);
  };

  const handleCalculateRisk = async () => {
    if (!vendor) return;
    setIsCalculatingRisk(true);
    try {
      const result = await vendorAI.mutateAsync({
        action: 'calculate_risk',
        vendorData: vendor,
      });
      toast.success(isRTL ? 'تم حساب درجة المخاطر' : 'Risk score calculated');
      console.log('AI Risk Result:', result);
    } catch (error) {
      toast.error(isRTL ? 'فشل حساب المخاطر' : 'Failed to calculate risk');
    } finally {
      setIsCalculatingRisk(false);
    }
  };

  const handleApplyMappings = async (document: VendorDocumentWithExtraction) => {
    if (!id) return;
    
    // Apply general vendor field mappings
    if (document.classification !== 'bank_details') {
      await applyMappings.mutateAsync({ vendorId: id, document });
    } else {
      // Apply bank details specifically
      await applyBankDetails.mutateAsync({ vendorId: id, document });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!vendor) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{isRTL ? 'المورد غير موجود' : 'Vendor not found'}</p>
          <Button variant="link" onClick={() => navigate('/vendors')}>
            {isRTL ? 'العودة إلى قائمة الموردين' : 'Back to vendors list'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const companyName = isRTL ? vendor.company_name_ar : vendor.company_name_en;
  const address = isRTL ? vendor.address_ar : vendor.address_en;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={companyName}
          titleAr={vendor.company_name_ar}
          description={vendor.code}
          icon={Building2}
          actions={
            <div className="flex gap-2">
              {isAdmin && vendor.status === 'pending' && (
                <Button onClick={() => setApprovalDialogOpen(true)}>
                  <CheckCircle className="h-4 w-4 me-2" />
                  {isRTL ? 'اتخاذ إجراء' : 'Take Action'}
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link to={`/vendors/${vendor.id}/edit`}>
                  <Edit className="h-4 w-4 me-2" />
                  {isRTL ? 'تعديل' : 'Edit'}
                </Link>
              </Button>
            </div>
          }
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{isRTL ? 'النوع' : 'Type'}</span>
                <VendorTypeBadge type={vendor.vendor_type} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{isRTL ? 'التقييم' : 'Rating'}</span>
                <VendorRatingDisplay rating={vendor.rating_score} size="sm" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{isRTL ? 'المخاطر' : 'Risk'}</span>
                <VendorRiskScore score={vendor.risk_score} size="sm" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{isRTL ? 'تاريخ الإنشاء' : 'Created'}</span>
                <span className="text-sm font-medium">{format(new Date(vendor.created_at), 'MMM dd, yyyy')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info">
              <Building2 className="h-4 w-4 me-2" />
              {isRTL ? 'المعلومات' : 'Info'}
            </TabsTrigger>
            <TabsTrigger value="contacts">
              <Users className="h-4 w-4 me-2" />
              {isRTL ? 'جهات الاتصال' : 'Contacts'}
            </TabsTrigger>
            <TabsTrigger value="bank">
              <CreditCard className="h-4 w-4 me-2" />
              {isRTL ? 'البنك' : 'Bank'}
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 me-2" />
              {isRTL ? 'المستندات' : 'Documents'}
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Brain className="h-4 w-4 me-2" />
              {isRTL ? 'AI' : 'AI Insights'}
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'معلومات الشركة' : 'Company Information'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">{isRTL ? 'البريد الإلكتروني' : 'Email'}</p>
                        <a href={`mailto:${vendor.email}`} className="font-medium hover:text-primary">
                          {vendor.email}
                        </a>
                      </div>
                    </div>
                    {vendor.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">{isRTL ? 'الهاتف' : 'Phone'}</p>
                          <a href={`tel:${vendor.phone}`} className="font-medium hover:text-primary">
                            {vendor.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {vendor.website && (
                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">{isRTL ? 'الموقع الإلكتروني' : 'Website'}</p>
                          <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary">
                            {vendor.website}
                          </a>
                        </div>
                      </div>
                    )}
                    {(address || vendor.city) && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">{isRTL ? 'العنوان' : 'Address'}</p>
                          <p className="font-medium">
                            {[address, vendor.city, vendor.country].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {vendor.trade_license_no && (
                      <div className="flex items-start gap-3">
                        <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">{isRTL ? 'رقم الرخصة التجارية' : 'Trade License No.'}</p>
                          <p className="font-medium">{vendor.trade_license_no}</p>
                        </div>
                      </div>
                    )}
                    {vendor.trade_license_expiry && (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">{isRTL ? 'تاريخ انتهاء الرخصة' : 'License Expiry'}</p>
                          <p className="font-medium">{format(new Date(vendor.trade_license_expiry), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>
                    )}
                    {vendor.tax_registration_no && (
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">{isRTL ? 'رقم التسجيل الضريبي' : 'Tax Registration No.'}</p>
                          <p className="font-medium">{vendor.tax_registration_no}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {vendor.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">{isRTL ? 'ملاحظات' : 'Notes'}</h4>
                      <p className="text-muted-foreground">{vendor.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'جهات الاتصال' : 'Contact Persons'}</CardTitle>
              </CardHeader>
              <CardContent>
                {vendor.contacts && vendor.contacts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vendor.contacts.map((contact) => (
                      <Card key={contact.id} className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{contact.name}</h4>
                            {contact.is_primary && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                {isRTL ? 'رئيسي' : 'Primary'}
                              </span>
                            )}
                          </div>
                          {contact.designation && (
                            <p className="text-sm text-muted-foreground mb-2">{contact.designation}</p>
                          )}
                          <div className="space-y-1 text-sm">
                            {contact.email && (
                              <p><Mail className="h-3 w-3 inline me-2" />{contact.email}</p>
                            )}
                            {contact.phone && (
                              <p><Phone className="h-3 w-3 inline me-2" />{contact.phone}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {isRTL ? 'لا توجد جهات اتصال' : 'No contacts added'}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Tab */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'التفاصيل المصرفية' : 'Bank Details'}</CardTitle>
              </CardHeader>
              <CardContent>
                {vendor.bank_details && vendor.bank_details.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vendor.bank_details.map((bank) => (
                      <Card key={bank.id} className="bg-muted/30">
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{bank.bank_name}</h4>
                            {bank.is_primary && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                {isRTL ? 'رئيسي' : 'Primary'}
                              </span>
                            )}
                          </div>
                          <div className="text-sm space-y-1">
                            <p><span className="text-muted-foreground">{isRTL ? 'اسم الحساب:' : 'Account Name:'}</span> {bank.account_name}</p>
                            <p><span className="text-muted-foreground">{isRTL ? 'رقم الحساب:' : 'Account No:'}</span> {bank.account_number}</p>
                            {bank.iban && <p><span className="text-muted-foreground">IBAN:</span> {bank.iban}</p>}
                            {bank.swift_code && <p><span className="text-muted-foreground">SWIFT:</span> {bank.swift_code}</p>}
                            <p><span className="text-muted-foreground">{isRTL ? 'العملة:' : 'Currency:'}</span> {bank.currency}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {isRTL ? 'لا توجد تفاصيل مصرفية' : 'No bank details added'}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab - Now uses VendorDocumentCenter */}
          <TabsContent value="documents">
            <VendorDocumentCenter 
              vendorId={id!} 
              onApplyMappings={handleApplyMappings}
            />
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  {isRTL ? 'رؤى الذكاء الاصطناعي' : 'AI Insights'}
                </CardTitle>
                <CardDescription>
                  {isRTL ? 'تحليل المخاطر والتوصيات بالذكاء الاصطناعي' : 'AI-powered risk analysis and recommendations'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    onClick={handleCalculateRisk} 
                    disabled={isCalculatingRisk}
                    className="w-full sm:w-auto"
                  >
                    {isCalculatingRisk ? (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <Brain className="h-4 w-4 me-2" />
                    )}
                    {isRTL ? 'حساب درجة المخاطر' : 'Calculate Risk Score'}
                  </Button>

                  {vendor.ai_insights && Object.keys(vendor.ai_insights).length > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <pre className="text-sm overflow-auto">
                        {JSON.stringify(vendor.ai_insights, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Approval Dialog */}
      <VendorApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        vendorId={id!}
        vendorName={companyName}
        currentStatus={vendor.status}
        onConfirm={handleApproval}
        isLoading={approveVendor.isPending}
      />
    </DashboardLayout>
  );
}
