import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRFIs } from '@/hooks/useRFI';
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
import { Loader2, Eye, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ProcurementType, ProcurementStatus } from '@/types/procurement';

export const RFIList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: rfis, isLoading } = useRFIs();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rfis || rfis.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">
            {language === 'ar' ? 'لا توجد طلبات معلومات' : 'No RFIs found'}
          </p>
          <Button onClick={() => navigate('/procurement/rfi/new')}>
            {language === 'ar' ? 'إنشاء طلب معلومات' : 'Create RFI'}
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
              <TableHead>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</TableHead>
              <TableHead>{language === 'ar' ? 'الموردون' : 'Vendors'}</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rfis.map((rfi) => (
              <TableRow key={rfi.id} className="cursor-pointer" onClick={() => navigate(`/procurement/rfi/${rfi.id}`)}>
                <TableCell className="font-mono font-medium">{rfi.code}</TableCell>
                <TableCell>
                  {language === 'ar' ? rfi.title_ar : rfi.title_en}
                </TableCell>
                <TableCell>
                  <ProcurementTypeBadge type={rfi.procurement_type as ProcurementType} />
                </TableCell>
                <TableCell>
                  <ProcurementStatusBadge status={rfi.status as ProcurementStatus} />
                </TableCell>
                <TableCell>
                  {rfi.due_date ? format(new Date(rfi.due_date), 'MMM dd, yyyy') : '-'}
                </TableCell>
                <TableCell>
                  {(rfi as any).rfi_vendors?.length || 0} {language === 'ar' ? 'موردين' : 'vendors'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {rfi.status === 'completed' && (
                      <Button variant="ghost" size="icon" title={language === 'ar' ? 'تحويل إلى RFQ' : 'Convert to RFQ'}>
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
