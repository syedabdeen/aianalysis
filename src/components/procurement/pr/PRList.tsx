import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePurchaseRequests } from '@/hooks/usePurchaseRequest';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProcurementStatusBadge } from '../ProcurementStatusBadge';
import { ProcurementTypeBadge } from '../ProcurementTypeBadge';
import { Loader2, Eye, ArrowRight, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { ProcurementType, ProcurementStatus } from '@/types/procurement';

export const PRList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: purchaseRequests, isLoading } = usePurchaseRequests();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!purchaseRequests || purchaseRequests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">
            {language === 'ar' ? 'لا توجد طلبات شراء' : 'No Purchase Requests found'}
          </p>
          <Button onClick={() => navigate('/procurement/pr/new')}>
            {language === 'ar' ? 'إنشاء طلب شراء' : 'Create PR'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === 'ar' ? 'الرمز' : 'Code'}</TableHead>
              <TableHead>{language === 'ar' ? 'العنوان' : 'Title'}</TableHead>
              <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
              <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
              <TableHead>{language === 'ar' ? 'تاريخ الطلب' : 'Required Date'}</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseRequests.map((pr) => (
              <TableRow key={pr.id} className="cursor-pointer" onClick={() => navigate(`/procurement/pr/${pr.id}`)}>
                <TableCell className="font-mono font-medium">
                  <div className="flex items-center gap-2">
                    {pr.code}
                    {pr.is_locked && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {language === 'ar' ? pr.title_ar : pr.title_en}
                </TableCell>
                <TableCell>
                  <ProcurementTypeBadge type={pr.procurement_type as ProcurementType} />
                </TableCell>
                <TableCell>
                  <ProcurementStatusBadge status={pr.status as ProcurementStatus} />
                </TableCell>
                <TableCell className="font-medium">
                  {pr.currency} {pr.total_amount?.toLocaleString()}
                </TableCell>
                <TableCell>
                  {pr.required_date 
                    ? format(new Date(pr.required_date), 'MMM dd, yyyy') 
                    : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {pr.status === 'approved' && (
                      <Button variant="ghost" size="icon" title={language === 'ar' ? 'تحويل إلى PO' : 'Convert to PO'}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
