import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Wallet, Eye, FileText, Clock, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { usePettyCashClaims } from '@/hooks/usePettyCash';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  draft: { label: 'Draft', labelAr: 'مسودة', variant: 'secondary' as const, icon: FileText },
  pending_gm_approval: { label: 'Pending GM Approval', labelAr: 'في انتظار موافقة المدير العام', variant: 'outline' as const, icon: Clock },
  approved_pending_payment: { label: 'Approved - Pending Payment', labelAr: 'معتمد - في انتظار الدفع', variant: 'default' as const, icon: CheckCircle },
  paid: { label: 'Paid', labelAr: 'مدفوع', variant: 'default' as const, icon: CreditCard },
  rejected: { label: 'Rejected', labelAr: 'مرفوض', variant: 'destructive' as const, icon: XCircle },
};

export default function PettyCashPage() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { data: claims, isLoading } = usePettyCashClaims();

  const getStatusBadge = (status: keyof typeof statusConfig) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {language === 'ar' ? config.labelAr : config.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Petty Cash Claims"
          titleAr="مطالبات صندوق المصروفات النثرية"
          description="Manage petty cash replenishment requests"
          descriptionAr="إدارة طلبات تجديد صندوق المصروفات النثرية"
          icon={Wallet}
          actions={
            <Button onClick={() => navigate('/procurement/petty-cash/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              {language === 'ar' ? 'مطالبة جديدة' : 'New Claim'}
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {language === 'ar' ? 'قائمة المطالبات' : 'Claims List'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : claims && claims.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رقم المطالبة' : 'Claim No.'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المشروع / الموقع' : 'Project / Site'}</TableHead>
                    <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono font-medium">{claim.claim_code}</TableCell>
                      <TableCell>
                        {claim.projects 
                          ? (language === 'ar' ? claim.projects.name_ar : claim.projects.name_en)
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell>{format(new Date(claim.claim_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(claim.total_spent, claim.currency)}
                      </TableCell>
                      <TableCell>{getStatusBadge(claim.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/procurement/petty-cash/${claim.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(claim.status === 'approved_pending_payment' || claim.status === 'paid') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/procurement/petty-cash/${claim.id}`)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {language === 'ar' ? 'لا توجد مطالبات' : 'No Claims Yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {language === 'ar' 
                    ? 'ابدأ بإنشاء مطالبة صندوق المصروفات النثرية الأولى'
                    : 'Get started by creating your first petty cash claim'
                  }
                </p>
                <Button onClick={() => navigate('/procurement/petty-cash/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'مطالبة جديدة' : 'New Claim'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
