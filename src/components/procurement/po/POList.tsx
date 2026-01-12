import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrder';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Loader2, Eye, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { ProcurementType, ProcurementStatus } from '@/types/procurement';

export const POList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: purchaseOrders, isLoading } = usePurchaseOrders();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!purchaseOrders || purchaseOrders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">
            {language === 'ar' ? 'لا توجد أوامر شراء' : 'No Purchase Orders found'}
          </p>
          <Button onClick={() => navigate('/procurement/po/new')}>
            {language === 'ar' ? 'إنشاء أمر شراء' : 'Create PO'}
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
              <TableHead>{language === 'ar' ? 'المورد' : 'Vendor'}</TableHead>
              <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
              <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
              <TableHead>{language === 'ar' ? 'تاريخ التسليم' : 'Delivery Date'}</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.map((po) => (
              <TableRow key={po.id} className="cursor-pointer" onClick={() => navigate(`/procurement/po/${po.id}`)}>
                <TableCell className="font-mono font-medium">{po.code}</TableCell>
                <TableCell>
                  {language === 'ar' ? po.title_ar : po.title_en}
                </TableCell>
                <TableCell>
                  {(po as any).vendor 
                    ? (language === 'ar' 
                        ? (po as any).vendor.company_name_ar 
                        : (po as any).vendor.company_name_en)
                    : '-'}
                </TableCell>
                <TableCell>
                  <ProcurementTypeBadge type={po.procurement_type as ProcurementType} />
                </TableCell>
                <TableCell>
                  <ProcurementStatusBadge status={po.status as ProcurementStatus} />
                </TableCell>
                <TableCell className="font-medium">
                  {po.currency} {po.total_amount?.toLocaleString()}
                </TableCell>
                <TableCell>
                  {po.delivery_date 
                    ? format(new Date(po.delivery_date), 'MMM dd, yyyy') 
                    : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title={language === 'ar' ? 'تصدير PDF' : 'Export PDF'}>
                      <FileDown className="h-4 w-4" />
                    </Button>
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
