import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRFI, useRFIItems, useRFIVendors } from '@/hooks/useRFI';
import { useCreateRFQFromRFI } from '@/hooks/useRFQ';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProcurementStatusBadge } from '@/components/procurement/ProcurementStatusBadge';
import { ProcurementTypeBadge } from '@/components/procurement/ProcurementTypeBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, FileQuestion, ArrowRight, Building2, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ProcurementType, ProcurementStatus } from '@/types/procurement';
import { toast } from 'sonner';

export default function RFIDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: rfi, isLoading } = useRFI(id || '');
  const { data: items } = useRFIItems(id || '');
  const { data: vendors } = useRFIVendors(id || '');
  const createRFQMutation = useCreateRFQFromRFI();

  const handleCreateRFQ = async () => {
    if (!id) return;
    try {
      const rfq = await createRFQMutation.mutateAsync(id);
      toast.success(language === 'ar' ? 'تم إنشاء طلب عرض الأسعار بنجاح' : 'RFQ created successfully');
      navigate(`/procurement/rfq/${rfq.id}`);
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل إنشاء طلب عرض الأسعار' : 'Failed to create RFQ');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!rfi) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{language === 'ar' ? 'لم يتم العثور على طلب المعلومات' : 'RFI not found'}</p>
        </div>
      </DashboardLayout>
    );
  }

  const respondedVendors = vendors?.filter(v => v.response_received) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={rfi.code}
          titleAr={rfi.code}
          description={language === 'ar' ? rfi.title_ar : rfi.title_en}
          descriptionAr={rfi.title_ar}
          icon={FileQuestion}
          showBackButton={true}
          showHomeButton={true}
          actions={
            <Button 
              onClick={handleCreateRFQ} 
              disabled={createRFQMutation.isPending}
              className="gap-2"
            >
              {createRFQMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {language === 'ar' ? 'إنشاء طلب عرض أسعار' : 'Create RFQ'}
            </Button>
          }
        />

        <div className="flex items-center gap-3">
          <ProcurementStatusBadge status={rfi.status as ProcurementStatus} />
          <ProcurementTypeBadge type={rfi.procurement_type as ProcurementType} />
          {rfi.priority && (
            <Badge variant="outline" className="capitalize">
              {rfi.priority}
            </Badge>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'معلومات عامة' : 'General Information'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}:</span>
                  <p className="font-medium">
                    {rfi.due_date 
                      ? format(new Date(rfi.due_date), 'PPP') 
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}:</span>
                  <p className="font-medium">
                    {format(new Date(rfi.created_at), 'PPP')}
                  </p>
                </div>
                {rfi.project && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{language === 'ar' ? 'المشروع' : 'Project'}:</span>
                    <p className="font-medium">
                      {rfi.project.code} - {language === 'ar' ? rfi.project.name_ar : rfi.project.name_en}
                    </p>
                  </div>
                )}
              </div>
              {rfi.description && (
                <div>
                  <span className="text-muted-foreground text-sm">{language === 'ar' ? 'الوصف' : 'Description'}:</span>
                  <p className="mt-1">{rfi.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'ملخص الردود' : 'Response Summary'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {language === 'ar' ? 'الموردون المدعوون' : 'Invited Vendors'}:
                  </span>
                  <Badge variant="secondary">{vendors?.length || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {language === 'ar' ? 'الردود المستلمة' : 'Responses Received'}:
                  </span>
                  <Badge className="bg-green-500/10 text-green-600">{respondedVendors.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    {language === 'ar' ? 'في الانتظار' : 'Pending'}:
                  </span>
                  <Badge variant="outline">{(vendors?.length || 0) - respondedVendors.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'العناصر' : 'Items'} ({items?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                  <TableHead className="w-24">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                  <TableHead className="w-24">{language === 'ar' ? 'الوحدة' : 'Unit'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {language === 'ar' ? 'لا توجد عناصر' : 'No items found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_number}</TableCell>
                      <TableCell>
                        <div>
                          <p>{language === 'ar' ? item.description_ar : item.description_en}</p>
                          {item.specifications && (
                            <p className="text-xs text-muted-foreground mt-1">{item.specifications}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'الموردون' : 'Vendors'} ({vendors?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'المورد' : 'Vendor'}</TableHead>
                  <TableHead>{language === 'ar' ? 'تاريخ الدعوة' : 'Invited At'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{language === 'ar' ? 'ملاحظات' : 'Notes'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {language === 'ar' ? 'لا يوجد موردون' : 'No vendors found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  vendors?.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell>
                        <div className="font-medium">
                          {language === 'ar' 
                            ? vendor.vendor?.company_name_ar 
                            : vendor.vendor?.company_name_en}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {vendor.vendor?.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(vendor.invited_at), 'PPP')}
                      </TableCell>
                      <TableCell>
                        {vendor.response_received ? (
                          <Badge className="bg-green-500/10 text-green-600">
                            {language === 'ar' ? 'تم الرد' : 'Responded'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {language === 'ar' ? 'في الانتظار' : 'Pending'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vendor.response_notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
