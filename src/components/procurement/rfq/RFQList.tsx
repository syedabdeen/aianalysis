import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRFQs } from '@/hooks/useRFQ';
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
import { Loader2, Eye, ArrowRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ProcurementType, ProcurementStatus } from '@/types/procurement';

export const RFQList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: rfqs, isLoading } = useRFQs();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rfqs || rfqs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">
            {language === 'ar' ? 'لا توجد طلبات عروض أسعار' : 'No RFQs found'}
          </p>
          <Button onClick={() => navigate('/procurement/rfq/new')}>
            {language === 'ar' ? 'إنشاء طلب عرض أسعار' : 'Create RFQ'}
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
              <TableHead>{language === 'ar' ? 'الموعد النهائي' : 'Deadline'}</TableHead>
              <TableHead>{language === 'ar' ? 'عروض الأسعار' : 'Quotations'}</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rfqs.map((rfq) => {
              const vendors = (rfq as any).rfq_vendors || [];
              const receivedCount = vendors.filter((v: any) => v.quotation_received).length;
              
              return (
                <TableRow key={rfq.id} className="cursor-pointer" onClick={() => navigate(`/procurement/rfq/${rfq.id}`)}>
                  <TableCell className="font-mono font-medium">{rfq.code}</TableCell>
                  <TableCell>
                    {language === 'ar' ? rfq.title_ar : rfq.title_en}
                  </TableCell>
                  <TableCell>
                    <ProcurementTypeBadge type={rfq.procurement_type as ProcurementType} />
                  </TableCell>
                  <TableCell>
                    <ProcurementStatusBadge status={rfq.status as ProcurementStatus} />
                  </TableCell>
                  <TableCell>
                    {rfq.submission_deadline 
                      ? format(new Date(rfq.submission_deadline), 'MMM dd, yyyy') 
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <span className={receivedCount > 0 ? 'text-green-600' : ''}>
                      {receivedCount}/{vendors.length}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {receivedCount >= 2 && (
                        <Button variant="ghost" size="icon" title={language === 'ar' ? 'مقارنة AI' : 'AI Compare'}>
                          <Sparkles className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {rfq.status === 'completed' && (
                        <Button variant="ghost" size="icon" title={language === 'ar' ? 'تحويل إلى PR' : 'Convert to PR'}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
